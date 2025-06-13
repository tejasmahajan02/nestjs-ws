import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { WsExceptionFilter } from './filters/ws-exception.filter';
import { WsMessages } from './constants/ws.messages';
import { Observable, from, map } from 'rxjs';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class GenericWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GenericWsGateway.name);
  private connectionCount: Record<string, number> = {};

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const clientId = client.id;

    // Handle auth
    const isVerified = await this.verifyUser(client);
    if (!isVerified || !client.connected) return; // Stop execution if disconnected

    // Handle rate limiting
    const isAllowed = this.handleConnectionsLimit(client);
    if (!isAllowed || !client.connected) return; // Stop execution if disconnected

    // Join a room based on user ID
    const userId = this.getUserId(client);
    if (!userId) {
      client.disconnect(); // Ensure the client is disconnected if no user ID
      return;
    }

    client.join(userId);
    this.logger.log(`Client connected: ${clientId} and joined room: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Emit updates only to a specific user's room
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { message: 'PONG' });
  }

  @SubscribeMessage('events')
  findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
    return from([1, 2, 3]).pipe(
      map((item) => ({ event: 'events', data: item })),
    );
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    return data;
  }

  private getUserId(client: Socket): string | undefined {
    return client?.data?.user?.email as string;
  }

  // Authentication
  private async verifyUser(client: Socket): Promise<boolean | undefined> {
    try {
      const token = this.getToken(client);
      if (!token) throw new WsException(WsMessages.ERROR.MISSING_TOKEN);

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user data to the client object for later use
      client.data.user = payload;
      return true;
    } catch (error) {
      let message: string;
      if (error instanceof WsException) {
        message = error.getError().toString();
      } else if (error instanceof TokenExpiredError) {
        message = WsMessages.ERROR.EXPIRED_TOKEN;
      } else if (error instanceof JsonWebTokenError) {
        message = WsMessages.ERROR.INVALID_TOKEN;
      } else {
        message = WsMessages.ERROR.UNAUTHORIZED;
      }

      client.emit('error', { message });
      client.disconnect();
    }
  }

  private getToken(client: Socket): string | undefined {
    const token =
      (client.handshake.query.token as string) ||
      client.handshake.auth?.token ||
      this.extractTokenFromHeader(client);
    return token;
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const [type, token] =
      client.handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  // Rate limiting
  private handleConnectionsLimit(client: Socket): boolean | undefined {
    const ip = client.handshake.address;
    this.connectionCount[ip] = (this.connectionCount[ip] || 0) + 1;

    if (this.connectionCount[ip] > 5) {
      this.logger.log(`Too many connections from ${ip}`);
      client.emit('error', { message: WsMessages.ERROR.TOO_MANY_CONNECTIONS });
      client.disconnect();
      return;
    }

    client.on('disconnect', () => {
      this.connectionCount[ip] = Math.max(0, this.connectionCount[ip] - 1);
    });

    return true;
  }

  logoutUser(userId: string) {
    const room = userId;

    // Get all sockets in the user's room and disconnect them
    this.server.in(room).socketsLeave(room);
    this.logger.log(`User ${userId} forcibly disconnected from WebSocket`);
  }
}
