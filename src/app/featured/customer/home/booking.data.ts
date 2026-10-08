import { Trip, TripPoint, VehicleType, VoucherRule, vietnamDate } from './booking.models';

export const ROUTES = [
  { from: 'TP.HCM', to: 'Cần Thơ', price: 180000, minutes: 210, distance: 170, times: ['06:00', '10:30', '15:00', '20:30'], image: 'can_tho.jpg' },
  { from: 'TP.HCM', to: 'Vũng Tàu', price: 160000, minutes: 120, distance: 100, times: ['07:15', '11:00', '16:45', '21:00'], image: 'vung_tau.jpg' },
  { from: 'Đà Lạt', to: 'Buôn Ma Thuột', price: 220000, minutes: 300, distance: 210, times: ['08:00', '14:00', '19:00'], image: 'buon_me_thuot.jpg' },
  { from: 'Đà Lạt', to: 'Nha Trang', price: 170000, minutes: 180, distance: 140, times: ['06:30', '12:15', '17:00'], image: 'nha_trang.jpg' },
  { from: 'Cần Thơ', to: 'Rạch Giá', price: 150000, minutes: 150, distance: 115, times: ['07:00', '13:00', '18:30'], image: 'rach_gia.jpg' },
  { from: 'TP.HCM', to: 'Phan Thiết', price: 200000, minutes: 240, distance: 200, times: ['05:30', '09:30', '14:30', '20:00'], image: 'phan_thiet.jpg' },
  { from: 'TP.HCM', to: 'Đà Lạt', price: 250000, minutes: 420, distance: 310, times: ['07:30', '12:30', '19:30', '22:15'], image: 'da_lat.jpg' },
  { from: 'TP.HCM', to: 'Nha Trang', price: 300000, minutes: 510, distance: 435, times: ['06:45', '13:30', '20:45', '23:00'], image: 'nha_trang.jpg' },
  { from: 'Nha Trang', to: 'Đà Nẵng', price: 350000, minutes: 660, distance: 530, times: ['08:45', '17:30', '21:45'], image: 'da_nang.jpg' },
];
export const CITIES = [...new Set(ROUTES.flatMap(route => [route.from, route.to]))];
const SPOTS: Record<string, [string, string][]> = {
  'TP.HCM': [['Bến xe Miền Đông Mới', '501 Hoàng Hữu Nam, TP. Thủ Đức'], ['Văn phòng Quận 1', 'Đường Nguyễn Cư Trinh, Quận 1'], ['Ngã tư Thủ Đức', 'Xa lộ Hà Nội, TP. Thủ Đức']],
  'Cần Thơ': [['Bến xe Trung tâm Cần Thơ', 'Quốc lộ 1A, Cái Răng'], ['Văn phòng Ninh Kiều', 'Đường 30/4, Ninh Kiều']],
  'Vũng Tàu': [['Bến xe Vũng Tàu', '192 Nam Kỳ Khởi Nghĩa'], ['Bãi Sau', 'Đường Thùy Vân']],
  'Đà Lạt': [['Bến xe Liên tỉnh Đà Lạt', '1 Tô Hiến Thành'], ['Văn phòng Đà Lạt', 'Đường Phan Bội Châu']],
  'Nha Trang': [['Bến xe phía Nam Nha Trang', 'Đường Võ Nguyên Giáp'], ['Văn phòng Nha Trang', 'Đường Lê Hồng Phong']],
  'Buôn Ma Thuột': [['Bến xe phía Nam Buôn Ma Thuột', 'Đường Võ Văn Kiệt'], ['Ngã Sáu', 'Trung tâm Buôn Ma Thuột']],
  'Rạch Giá': [['Bến xe Rạch Giá', 'Đường Nguyễn Trung Trực'], ['Bến tàu Rạch Giá', 'Đường Tôn Đức Thắng']],
  'Phan Thiết': [['Bến xe Phan Thiết', 'Đường Từ Văn Tư'], ['Văn phòng Mũi Né', 'Đường Nguyễn Đình Chiểu']],
  'Đà Nẵng': [['Bến xe Trung tâm Đà Nẵng', '185 Tôn Đức Thắng'], ['Văn phòng Đà Nẵng', 'Đường Điện Biên Phủ']],
};
function points(city: string, start: number, pickup: boolean): TripPoint[] {
  return SPOTS[city].map(([name, address], index) => ({ id: `${city}-${index}`, name, address, kind: index === 0 ? 'station' : 'shuttle', at: new Date(start + index * (pickup ? -15 : 15) * 60000).toISOString() }));
}
export function seatIds(type: VehicleType): string[] {
  if (type === 'Limousine 9 chỗ') return Array.from({ length: 9 }, (_, i) => `${i + 1}A`);
  return ['A', 'B'].flatMap(floor => Array.from({ length: type === 'Cabin 22 chỗ' ? (floor === 'A' ? 12 : 10) : 17 }, (_, i) => `${i + 1}${floor}`));
}
// Frontend catalog adapter. The UI searches explicit dated trips, never fabricates results for an unknown route.
// Replace this adapter with the schedule API when the backend is available.
export function initialCatalog(now = Date.now()): Trip[] {
  const trips: Trip[] = [];
  for (let day = 0; day < 28; day++) {
    const date = vietnamDate(now + day * 86400000);
    ROUTES.forEach((route, ri) => {
      for (const reverse of [false, true]) {
        const from = reverse ? route.to : route.from, to = reverse ? route.from : route.to;
        route.times.forEach((slot, si) => {
          // Different directions and weekdays have their own published departure times.
          const departure = Date.parse(`${date}T${slot}:00+07:00`) + (reverse ? 30 : 0) * 60000;
          if (day % 7 === 3 && si === 0) return;
          const arrival = departure + route.minutes * 60000;
          const type: VehicleType = (['Limousine 9 chỗ', 'Cabin 22 chỗ', 'Giường nằm 34 chỗ'] as const)[(ri + si) % 3];
          trips.push({ id: `TR-${ri}-${reverse ? 'R' : 'O'}-${date}-${si}`, from, to, date, departureAt: new Date(departure).toISOString(), arrivalAt: new Date(arrival).toISOString(), saleClosesAt: new Date(departure - 15 * 60000).toISOString(), status: 'open', type, price: route.price, distance: route.distance, seats: seatIds(type), soldSeats: ['1A', '2A'], pickup: points(from, departure, true), dropoff: points(to, arrival, false), amenities: ['Wi-Fi', 'Điều hòa', 'Nước uống', 'Cổng sạc USB', 'Chăn sạch'] });
        });
      }
    });
  }
  return trips;
}
export const VOUCHERS: VoucherRule[] = [
  { code: 'VIAGO2026', title: 'Giảm 10%, tối đa 50.000đ', percent: 10, amount: 0, maximum: 50000, minimum: 150000, startsAt: '2026-01-01', endsAt: '2026-12-31', active: true, routes: [], limit: 1000, perPhone: 3 },
  { code: 'BANMOI', title: 'Giảm 20.000đ cho đơn đầu tiên', percent: 0, amount: 20000, maximum: 20000, minimum: 150000, startsAt: '2026-01-01', endsAt: '2026-12-31', active: true, routes: [], limit: 500, perPhone: 1 },
];
// Frontend fixture for exercising saved passenger lookup without an API.
export const SAVED_PASSENGER_EXAMPLES = [{ phone: '0987654321', name: 'Nguyễn Văn Minh', email: 'minh.nguyen@example.com' }];
