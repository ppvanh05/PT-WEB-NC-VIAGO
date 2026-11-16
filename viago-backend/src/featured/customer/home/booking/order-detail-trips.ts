import { Prisma } from '@prisma/client';
import type { HomeTrip } from '../catalog/home.service';

// Read the same trip graph in one database round trip, including both legs of
// a return order. Keep the existing trip response and seat availability intact.
export async function readOrderDetailTrips(
  tx: Prisma.TransactionClient,
  tripIds: string[],
): Promise<Map<string, HomeTrip>> {
  if (!tripIds.length) return new Map();
  const rows = await tx.$queryRaw<{ trip: Prisma.JsonObject }[]>(Prisma.sql`
    SELECT to_jsonb(l) || jsonb_build_object(
      'giavecoso', l.giavecoso::text,
      'tuyen_xe', to_jsonb(t) || jsonb_build_object('khoangcach', t.khoangcach::text),
      'xe', to_jsonb(x),
      'ghe_chuyen', COALESCE((
        SELECT jsonb_agg(to_jsonb(gc) || jsonb_build_object(
          'giaghe', gc.giaghe::text, 'ghe', to_jsonb(g),
          '_count', jsonb_build_object('ve_xe', (
            SELECT count(*) FROM ve_xe v
            WHERE v.maghechuyen = gc.maghechuyen AND v.trangthaive <> 'DaHuy'
          ))
        ) ORDER BY g.thutuhienthi, gc.maghechuyen)
        FROM ghe_chuyen gc JOIN ghe g ON g.maghe = gc.maghe
        WHERE gc.malichtrinh = l.malichtrinh
      ), '[]'::jsonb),
      'lich_trinh_diem', COALESCE((
        SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object('diem_don_tra', to_jsonb(d)) ORDER BY p.thutu)
        FROM lich_trinh_diem p JOIN diem_don_tra d ON d.madiem = p.madiem
        WHERE p.malichtrinh = l.malichtrinh
      ), '[]'::jsonb)
    ) AS trip
    FROM lich_trinh l
    JOIN tuyen_xe t ON t.matuyenduong = l.matuyenduong
    JOIN xe x ON x.maxe = l.maxe
    WHERE l.malichtrinh IN (${Prisma.join([...new Set(tripIds)])})
  `);
  return new Map(
    rows.map(({ trip: json }) => {
      const trip = json as unknown as HomeTrip;
      trip.thoigiankhoihanh = new Date(String(trip.thoigiankhoihanh));
      trip.thoigiandendukien = new Date(String(trip.thoigiandendukien));
      trip.thoigiandongbanve = new Date(String(trip.thoigiandongbanve));
      trip.giavecoso = new Prisma.Decimal(String(trip.giavecoso));
      trip.tuyen_xe.khoangcach = new Prisma.Decimal(
        String(trip.tuyen_xe.khoangcach),
      );
      for (const seat of trip.ghe_chuyen) {
        seat.giuchoden = seat.giuchoden
          ? new Date(String(seat.giuchoden))
          : null;
        seat.giaghe = new Prisma.Decimal(String(seat.giaghe));
      }
      for (const point of trip.lich_trinh_diem) {
        point.thoigiandukien = new Date(String(point.thoigiandukien));
      }
      return [trip.malichtrinh, trip];
    }),
  );
}
