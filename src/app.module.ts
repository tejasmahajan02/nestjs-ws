import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtConfigModule } from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { GenericWsModule } from './common/gateway/generic-ws/generic-ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtConfigModule,
    UserModule,
    GenericWsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
