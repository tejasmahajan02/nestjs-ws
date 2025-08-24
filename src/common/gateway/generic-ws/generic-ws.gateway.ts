import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { WsMessages } from './constants/ws.messages';
import { getUserId, handleWsErrorAndDisconnect } from './utils/helpers.util';
import { corsOptions } from 'src/config/cors-options.config';
import { WsAuthService } from './services/ws-auth.service';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: corsOptions,
})
export class GenericWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GenericWsGateway.name);
  private connectionCount: Record<string, number> = {};

  constructor(private readonly wsAuthService: WsAuthService) {}

  async handleConnection(client: Socket) {
    const clientId = client.id;

    // Handle auth
    const isVerified = await this.verifyUser(client);
    if (!isVerified || !client.connected) return; // Stop execution if disconnected

    // Handle rate limiting
    const isAllowed = this.handleConnectionsLimit(client);
    if (!isAllowed || !client.connected) return; // Stop execution if disconnected

    // Join a room based on user ID
    const userId = getUserId(client);
    if (!userId) {
      client.disconnect(); // Ensure the client is disconnected if no user ID
      return;
    }

    client.join(userId);
    this.logger.log(`Client connected: ${clientId} and joined room: ${userId}`);
  }

  // handleDisconnect(client: Socket) {
  //   this.logger.log(`Client disconnected: ${client.id}`);
  // }

  async handleDisconnect(client: Socket) {
    const ip = client.handshake.address;
    this.connectionCount[ip] = Math.max(0, (this.connectionCount[ip] || 1) - 1);
  }

  // Emit updates only to a specific user's room
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { message: 'pong' });
  }

  // Authentication
  private async verifyUser(client: Socket): Promise<boolean | undefined> {
    try {
      const token = this.wsAuthService.getToken(client);
      if (!token) throw new WsException(WsMessages.ERROR.MISSING_TOKEN);

      const payload = await this.wsAuthService.verifyToken(token);
      client.data.user = payload;

      return true;
    } catch (error) {
      handleWsErrorAndDisconnect(client, error);
    }
  }

  // Rate limiting
  // private handleConnectionsLimit(client: Socket): boolean | undefined {
  //   const ip = client.handshake.address;
  //   this.connectionCount[ip] = (this.connectionCount[ip] || 0) + 1;

  //   if (this.connectionCount[ip] > 5) {
  //     this.logger.log(`Too many connections from ${ip}`);
  //     handleWsErrorAndDisconnect(client, WsMessages.ERROR.TOO_MANY_CONNECTIONS);
  //     return;
  //   }

  //   client.on('disconnect', () => {
  //     this.connectionCount[ip] = Math.max(0, this.connectionCount[ip] - 1);
  //   });

  //   return true;
  // }

  // Rate limiting
  private handleConnectionsLimit(client: Socket): boolean {
    const ip = client.handshake.address;
    this.connectionCount[ip] = (this.connectionCount[ip] || 0) + 1;

    if (this.connectionCount[ip] > WS_MAX_CONNECTIONS_PER_USER) {
      this.logger.log(`Too many connections from ${ip}`);
      handleWsErrorAndDisconnect(client, WsMessages.ERROR.TOO_MANY_CONNECTIONS);
      return false;
    }

    return true;
  }

  logoutUser(userId: string) {
    const room = userId;

    // Get all sockets in the user's room and disconnect them
    this.server.in(room).socketsLeave(room);
    this.logger.log(`User ${userId} forcibly disconnected from WebSocket`);
  }
}
