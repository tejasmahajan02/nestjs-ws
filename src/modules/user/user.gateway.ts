import { ConnectedSocket, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsCurrentUser } from 'src/common/decorators/ws-current-user.decorator';
import { GenericWsGateway } from 'src/common/gateway/generic-ws/generic-ws.gateway';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/user',
})
export class UserGateway extends GenericWsGateway {
  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() client: Socket, @WsCurrentUser() currentUser: any, payload: any): string {
    console.log(currentUser);
    return payload ?? 'Hello world!';
  }
}
