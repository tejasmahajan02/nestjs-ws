import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { WsExceptionFilter } from './common/gateway/generic-ws/filters/ws-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({ credentials: true, origin: '*' });

  app.useGlobalFilters(new WsExceptionFilter());

  // Uncomment these lines to use the Redis adapter:
  // const redisIoAdapter = new RedisIoAdapter(app);
  // await redisIoAdapter.connectToRedis();
  // app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.NODE_PORT || 3000;
  await app.listen(port);

  Logger.log(
    `Application is running on ${await app.getUrl()}`,
    'NestApplication',
  );
}
bootstrap();
