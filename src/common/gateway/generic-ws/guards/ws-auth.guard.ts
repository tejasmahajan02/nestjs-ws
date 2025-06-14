import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsMessages } from '../constants/ws.messages';
import { getWsAuthErrorMessage } from '../utils/helpers.util';
import { WsAuthService } from '../services/ws-auth.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly wsAuthService: WsAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();

    const token = this.wsAuthService.getToken(client); // Get token from client
    if (!token) throw new WsException(WsMessages.ERROR.MISSING_TOKEN);

    try {
      const payload = await this.wsAuthService.verifyToken(token);
      client.data.user = payload;
      return true;
    } catch (error) {
      const message = getWsAuthErrorMessage(error);
      throw new WsException(message);
    }
  }
}
