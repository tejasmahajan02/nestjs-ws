import { Global, Module } from '@nestjs/common';
import { GenericWsGateway } from './generic-ws.gateway';
import { WsAuthService } from './services/ws-auth.service';

@Global()
@Module({
  providers: [GenericWsGateway, WsAuthService],
  exports: [GenericWsGateway, WsAuthService],
})
export class GenericWsModule {}
