import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GenericWsGateway } from './common/gateway/generic-ws/generic-ws.gateway';
import { JwtConfigModule } from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtConfigModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, GenericWsGateway],
})
export class AppModule {}
