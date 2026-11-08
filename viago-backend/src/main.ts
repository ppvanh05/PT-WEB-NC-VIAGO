import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { allowedFrontendOrigin } from './shared/http/frontend-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow: boolean) => void,
    ) => callback(null, allowedFrontendOrigin(origin)),
    credentials: true,
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
