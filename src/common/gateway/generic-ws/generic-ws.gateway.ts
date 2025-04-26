import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { WsExceptionFilter } from './filters/ws-exception.filter';

@UseFilters(WsExceptionFilter)
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

  // Authentication
  private async verifyUser(client: Socket): Promise<boolean | undefined> {
    const token = this.getToken(client);
    if (!token) {
      client.emit('error', { message: 'Authentication token missing' });
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user data to the client object for later use
      client.data.user = payload;
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        client.emit('error', { message: 'Authentication token expired' });
        client.disconnect();
        return;
      }

      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  private getUserId(client: Socket): string | undefined {
    return client?.data?.user?.email as string;
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
      client.emit('error', { message: 'Too many connections.' });
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
