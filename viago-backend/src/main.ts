import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { allowedFrontendOrigin } from './shared/http/frontend-origin';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '20mb' });
  app.useBodyParser('urlencoded', { limit: '20mb', extended: true });
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow: boolean) => void,
    ) => callback(null, allowedFrontendOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  try {
    await app.listen(process.env.PORT ?? 3000);
  } catch (error) {
    await app.close();
    throw error;
  }
}
void bootstrap().catch((error: unknown) => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'EADDRINUSE'
  )
    console.error(
      `Cổng ${process.env.PORT || 3000} đang được sử dụng. Dừng phiên backend cũ bằng Ctrl+C rồi chạy lại; chỉ chạy một phiên backend.`,
    );
  else
    console.error(
      'Không khởi động được backend:',
      error instanceof Error ? error.message : 'Lỗi không xác định',
    );
  process.exitCode = 1;
});
