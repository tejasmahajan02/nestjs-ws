import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { Observable, from, map } from 'rxjs';
import { Socket } from 'socket.io';
import { WsCurrentUser } from 'src/common/decorators/ws-current-user.decorator';
import { GenericWsGateway } from 'src/common/gateway/generic-ws/generic-ws.gateway';
import { WsAuthGuard } from 'src/common/gateway/generic-ws/guards/ws-auth.guard';
import { corsOptions } from 'src/config/cors-options.config';

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: corsOptions,
  namespace: '/user',
})
export class UserGateway extends GenericWsGateway {
  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @WsCurrentUser() currentUser: any,
    payload: any,
  ): string {
    console.log(currentUser);
    return payload ?? 'Hello world!';
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
}
