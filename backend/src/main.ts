import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application listening on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
