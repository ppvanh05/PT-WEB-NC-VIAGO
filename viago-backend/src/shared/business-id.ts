import { Prisma } from '@prisma/client';
export type BusinessPrefix =
  | 'DH'
  | 'VE'
  | 'SD'
  | 'UV'
  | 'LH'
  | 'TD'
  | 'TT'
  | 'CS'
  | 'CSH'
  | 'MCS'
  | 'KM'
  | 'VKH'
  | 'NK'
  | 'BL';
export async function nextBusinessId(
  tx: Prisma.TransactionClient,
  prefix: BusinessPrefix,
) {
  const [row] = await tx.$queryRaw<
    { number: string }[]
  >`SELECT nextval(${'public.viago_id_' + prefix.toLowerCase()}::regclass)::text AS number`;
  return prefix + row.number.padStart(prefix === 'CS' ? 5 : 3, '0');
}
export async function nextBusinessIds(
  tx: Prisma.TransactionClient,
  prefix: BusinessPrefix,
  count: number,
) {
  const rows = await tx.$queryRaw<
    { number: string }[]
  >`SELECT nextval(${'public.viago_id_' + prefix.toLowerCase()}::regclass)::text AS number FROM generate_series(1, ${count})`;
  return rows.map(
    (row) => prefix + row.number.padStart(prefix === 'CS' ? 5 : 3, '0'),
  );
}
