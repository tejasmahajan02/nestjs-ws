import { Global, Module } from '@nestjs/common';
import { GenericWsGateway } from './generic-ws.gateway';

@Global()
@Module({
  providers: [GenericWsGateway],
})
export class GenericWsModule {}
