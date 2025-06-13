import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsMessages } from '../constants/ws.messages';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();

    const token = this.getToken(client); // Get token from client
    if (!token) throw new WsException(WsMessages.ERROR.MISSING_TOKEN);

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user data to the client object for later use
      client.data.user = payload;
      return true;
    } catch (error) {
      let message: string;
      if (error instanceof TokenExpiredError) {
        message = WsMessages.ERROR.EXPIRED_TOKEN;
      } else if (error instanceof JsonWebTokenError) {
        message = WsMessages.ERROR.INVALID_TOKEN;
      } else {
        message = WsMessages.ERROR.UNAUTHORIZED;
      }

      throw new WsException(WsMessages.ERROR.EXPIRED_TOKEN);
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
}
