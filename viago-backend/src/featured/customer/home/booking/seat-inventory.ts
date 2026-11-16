import { Prisma } from '@prisma/client';
import { seatState, tripIsOpen } from '../catalog/home.service';
import type { HomeTrip, HomeSeat } from '../catalog/home.service';

export type InventoryRow = {
  tripId: string;
  tripStatus: HomeTrip['trangthai'];
  departureAt: Date;
  saleClosesAt: Date;
  advanceDays: number;
  holdMinutes: number;
  routeStatus: HomeTrip['tuyen_xe']['trangthai'];
  vehicleStatus: HomeTrip['xe']['trangthai'];
  layoutId: string | null;
  seatId: string | null;
  seatTripId: string;
  label: string;
  floor: number;
  row: number;
  column: number;
  type: HomeSeat['ghe']['loaighe'];
  price: Prisma.Decimal;
  seatStatus: HomeSeat['trangthaighe'];
  definitionStatus: HomeSeat['ghe']['trangthai'];
  seatLayoutId: string | null;
  heldBySession: string | null;
  heldUntil: Date | null;
  orderId: string | null;
  orderStatus: string | null;
  orderExpiresAt: Date | null;
  hasTicket: boolean;
};

// One parameterized read instead of loading a complete trip's relation graph.
// The hold path also reads this draft's previous seats to apply only its changes.
export async function readSeatInventory(
  db: Prisma.TransactionClient,
  tripId: string,
  selection?: { seatIds: string[]; session: string },
) {
  const selected = selection
    ? Prisma.sql`AND gc.maghechuyen IN (${Prisma.join(selection.seatIds)})`
    : Prisma.empty;
  const previous = selection
    ? Prisma.sql`OR (gc.sessiongiucho = ${selection.session} AND gc.trangthaighe = 'DangGiu')`
    : Prisma.empty;
  const rows = await db.$queryRaw<InventoryRow[]>(Prisma.sql`
    SELECT l.malichtrinh AS "tripId", l.trangthai::text AS "tripStatus",
      l.thoigiankhoihanh AS "departureAt", l.thoigiandongbanve AS "saleClosesAt",
      l.songaymobantruoc AS "advanceDays", l.thoigiangiuchophut AS "holdMinutes",
      t.trangthai::text AS "routeStatus", x.trangthai::text AS "vehicleStatus", x.masodoghe AS "layoutId",
      gc.maghechuyen AS "seatId", gc.malichtrinh AS "seatTripId", gc.giaghe AS price,
      gc.trangthaighe::text AS "seatStatus", gc.sessiongiucho AS "heldBySession", gc.giuchoden AS "heldUntil",
      gc.madonhanggiu AS "orderId", o.trangthaidonhang::text AS "orderStatus", o.thoigianhethangiucho AS "orderExpiresAt",
      g.soghe AS label, g.tang AS floor, g.hang AS "row", g.day AS "column", g.loaighe::text AS type,
      g.trangthai::text AS "definitionStatus", g.masodoghe AS "seatLayoutId",
      EXISTS (SELECT 1 FROM ve_xe v WHERE v.maghechuyen = gc.maghechuyen AND v.trangthaive <> 'DaHuy') AS "hasTicket"
    FROM lich_trinh l
    JOIN tuyen_xe t ON t.matuyenduong = l.matuyenduong
    JOIN xe x ON x.maxe = l.maxe
    LEFT JOIN ghe_chuyen gc ON ((gc.malichtrinh = l.malichtrinh ${selected}) ${previous})
    LEFT JOIN ghe g ON g.maghe = gc.maghe
    LEFT JOIN don_hang o ON o.madonhang = gc.madonhanggiu
    WHERE l.malichtrinh = ${tripId}
    ORDER BY g.thutuhienthi, gc.maghechuyen
  `);
  if (!rows.length) return null;
  return { trip: rows[0], seats: rows.filter((row) => row.seatId !== null) };
}

export function inventoryIsOpen(trip: InventoryRow, now = new Date()) {
  return tripIsOpen(
    {
      trangthai: trip.tripStatus,
      thoigiankhoihanh: trip.departureAt,
      thoigiandongbanve: trip.saleClosesAt,
      songaymobantruoc: trip.advanceDays,
      tuyen_xe: { trangthai: trip.routeStatus },
      xe: { trangthai: trip.vehicleStatus },
    },
    now,
  );
}
export function expiredAssignment(row: InventoryRow, now: Date) {
  return (
    !!row.orderId &&
    ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'].includes(
      row.orderStatus ?? '',
    ) &&
    !!row.orderExpiresAt &&
    row.orderExpiresAt <= now
  );
}
export function inventorySeatState(
  row: InventoryRow,
  trip: InventoryRow,
  session?: string,
  now = new Date(),
) {
  const releasedOrder =
    expiredAssignment(row, now) ||
    ['DaHuy', 'HetHanThanhToan'].includes(row.orderStatus ?? '');
  return seatState(
    {
      _count: { ve_xe: row.hasTicket ? 1 : 0 },
      trangthaighe: row.seatStatus,
      giuchoden: releasedOrder ? new Date(0) : row.heldUntil,
      sessiongiucho: row.heldBySession,
      ghe: { trangthai: row.definitionStatus, masodoghe: row.seatLayoutId },
    },
    { xe: { masodoghe: trip.layoutId } },
    session,
    now,
  );
}
export function inventoryResponse(
  snapshot: NonNullable<Awaited<ReturnType<typeof readSeatInventory>>>,
  now = new Date(),
) {
  const seatDetails = snapshot.seats.map((row) => ({
    id: row.seatId!,
    label: row.label,
    floor: row.floor,
    row: row.row,
    column: row.column,
    type: row.type,
    allowDouble: row.type === 'CabinDoi',
    price: Number(row.price),
    status: inventorySeatState(row, snapshot.trip, undefined, now),
  }));
  return {
    id: snapshot.trip.tripId,
    status: inventoryIsOpen(snapshot.trip, now) ? 'open' : 'closed',
    departureAt: snapshot.trip.departureAt.toISOString(),
    availableSeats: seatDetails.filter((seat) => seat.status === 'available')
      .length,
    seatDetails,
    serverTime: now.toISOString(),
  };
}
