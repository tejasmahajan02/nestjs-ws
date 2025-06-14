import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { WsException } from '@nestjs/websockets';
import { WsMessages } from '../constants/ws.messages';
import { Socket } from 'socket.io';

export function getUserId(client: Socket): string | undefined {
  return client?.data?.user?.email as string;
}

export function getWsAuthErrorMessage(error: unknown): string {
  if (error instanceof WsException) {
    return error.getError().toString();
  } else if (error instanceof TokenExpiredError) {
    return WsMessages.ERROR.EXPIRED_TOKEN;
  } else if (error instanceof JsonWebTokenError) {
    return WsMessages.ERROR.INVALID_TOKEN;
  } else {
    return WsMessages.ERROR.UNAUTHORIZED;
  }
}

export function handleWsErrorAndDisconnect(client: Socket, errorOrMessage: unknown) {
  const message =
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : getWsAuthErrorMessage(errorOrMessage);

  client.emit('error', { message });
  client.disconnect();
}
