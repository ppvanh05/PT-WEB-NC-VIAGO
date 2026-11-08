import { BadRequestException, ValidationPipe } from '@nestjs/common';
export const validation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
});
export function cursor(query: number, header?: string) {
  if (header === undefined) return query;
  if (!/^\d{1,10}$/.test(header) || Number(header) > 2147483647)
    throw new BadRequestException('Mã sự kiện không hợp lệ.');
  return Math.max(query, Number(header));
}
