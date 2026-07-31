import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permissive CORS is fine for a local-dev template; tighten per project.
  app.enableCors();
  app.enableShutdownHooks();

  // Bind 0.0.0.0 explicitly so the port is reachable from outside the container.
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
