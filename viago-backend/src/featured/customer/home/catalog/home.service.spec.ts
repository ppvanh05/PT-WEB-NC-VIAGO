import {
  seatState,
  tripIsOpen,
  normalizedCity,
  type HomeTrip,
  type HomeSeat,
} from './home.service';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { HomeOrderDto } from '../common/home.dto';

describe('Home booking invariants', () => {
  const now = new Date('2026-11-04T10:00:00Z');
  const trip = {
    trangthai: 'DangMoBan',
    thoigiankhoihanh: new Date('2026-11-05T10:00:00Z'),
    thoigiandongbanve: new Date('2026-11-05T09:00:00Z'),
    songaymobantruoc: 30,
    tuyen_xe: { trangthai: 'HoatDong' },
    xe: { trangthai: 'DangHoatDong', masodoghe: 'layout-1' },
  } as HomeTrip;
  function seat(data: Partial<HomeSeat> = {}) {
    return {
      trangthaighe: 'Trong',
      giuchoden: null,
      sessiongiucho: null,
      ghe: { trangthai: 'HoatDong', masodoghe: 'layout-1' },
      _count: { ve_xe: 0 },
      ...data,
    } as HomeSeat;
  }
  it('allows only active trips inside their sales window', () => {
    expect(tripIsOpen(trip, now)).toBe(true);
    expect(tripIsOpen({ ...trip, trangthai: 'DaHuy' }, now)).toBe(false);
    expect(tripIsOpen({ ...trip, thoigiandongbanve: now }, now)).toBe(false);
    expect(tripIsOpen({ ...trip, songaymobantruoc: 0 }, now)).toBe(false);
  });
  it('never offers a seat with a non-cancelled ticket even if its flag says available', () => {
    expect(seatState(seat({ _count: { ve_xe: 1 } }), trip, 'owner', now)).toBe(
      'sold',
    );
  });
  it('distinguishes own holds, others holds, and expired holds', () => {
    const held = seat({
      trangthaighe: 'DangGiu',
      sessiongiucho: 'owner',
      giuchoden: new Date(now.getTime() + 60000),
    });
    expect(seatState(held, trip, 'owner', now)).toBe('selected');
    expect(seatState(held, trip, 'stranger', now)).toBe('held');
    expect(seatState({ ...held, giuchoden: now }, trip, 'owner', now)).toBe(
      'available',
    );
  });
  it('rejects seats belonging to a different layout', () => {
    expect(
      seatState(
        seat(),
        { ...trip, xe: { ...trip.xe, masodoghe: 'other-layout' } },
        undefined,
        now,
      ),
    ).toBe('locked');
  });
  it('normalizes HCM city aliases', () => {
    expect(normalizedCity('TP. Hồ Chí Minh')).toBe(normalizedCity('TP.HCM'));
  });
  it('validates nested order data, consent and duplicate seats', () => {
    const input = {
      key: 'a04dcbd4-8f14-4ef1-9614-be9a357c18cf',
      terms: true,
      passenger: { name: 'Nguyễn Văn A', phone: '0901234567' },
      legs: [{ tripId: 'trip-1', seats: ['seat-1'] }],
    };
    expect(validateSync(plainToInstance(HomeOrderDto, input))).toHaveLength(0);
    expect(
      validateSync(plainToInstance(HomeOrderDto, { ...input, terms: false })),
    ).not.toHaveLength(0);
    expect(
      validateSync(
        plainToInstance(HomeOrderDto, {
          ...input,
          legs: [{ tripId: 'trip-1', seats: ['seat-1', 'seat-1'] }],
        }),
      ),
    ).not.toHaveLength(0);
  });
});
