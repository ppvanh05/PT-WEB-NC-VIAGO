import { BadRequestException } from '@nestjs/common';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const supportedPasswordHash = (value: string) =>
  /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value) ||
  /^[a-f0-9]{64}$/i.test(value);
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const newId = (prefix: string) =>
  `${prefix}_${randomBytes(16).toString('hex')}`;
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${((await derive(password, salt, 64)) as Buffer).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string, allowLocalSeed = false) {
  if (allowLocalSeed && /^HASH_MAU_\d{3}$/.test(stored))
    return timingSafeEqual(
      Buffer.from(digest(password), 'hex'),
      Buffer.from(digest(stored), 'hex'),
    );
  const parts = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(stored);
  if (parts)
    return timingSafeEqual(
      (await derive(password, parts[1], 64)) as Buffer,
      Buffer.from(parts[2], 'hex'),
    );
  if (/^[a-f0-9]{64}$/i.test(stored))
    return timingSafeEqual(
      Buffer.from(digest(password), 'hex'),
      Buffer.from(stored, 'hex'),
    );
  await derive(password, 'viago-invalid-credential', 64);
  return false;
}
export function calendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value < '1900-01-01'
  )
    throw new BadRequestException('Ngày không hợp lệ.');
  return date;
}
