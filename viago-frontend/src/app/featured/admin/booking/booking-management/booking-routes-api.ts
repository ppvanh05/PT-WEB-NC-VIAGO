import { Injectable } from '@angular/core';

export interface BookingRoutePoint {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface BookingRouteTrip {
  id: string;
  route: {
    id: string;
    name: string;
    from: string;
    to: string;
    distance: number;
    durationMinutes: number;
    basePrice: number;
    tripsPerDay: number;
    pickupPoints: BookingRoutePoint[];
    dropoffPoints: BookingRoutePoint[];
  };
  vehicle: {
    id: string;
    name: string | null;
    licensePlate: string;
    type: string;
  };
  departureDate: string;
  departureTime: string;
  departureAt: string;
  arrivalAt: string;
  status: string;
  price: number;
  seatCount: number;
  availableSeatCount: number;
  seats: Array<{
    id: string;
    name: string;
    floor: number;
    column: number;
    row: number;
    type: string;
    status: string;
    price: number;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBookingRoutePoint(value: unknown): value is BookingRoutePoint {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['address'] === 'string' &&
    typeof value['city'] === 'string'
  );
}

function isBookingRouteTrip(value: unknown): value is BookingRouteTrip {
  if (!isRecord(value) || !isRecord(value['route']) || !isRecord(value['vehicle'])) {
    return false;
  }
  const route = value['route'];
  const vehicle = value['vehicle'];
  return (
    typeof value['id'] === 'string' &&
    typeof route['id'] === 'string' &&
    typeof route['name'] === 'string' &&
    typeof route['from'] === 'string' &&
    typeof route['to'] === 'string' &&
    typeof route['distance'] === 'number' &&
    typeof route['durationMinutes'] === 'number' &&
    typeof route['basePrice'] === 'number' &&
    typeof route['tripsPerDay'] === 'number' &&
    Array.isArray(route['pickupPoints']) &&
    route['pickupPoints'].every(isBookingRoutePoint) &&
    Array.isArray(route['dropoffPoints']) &&
    route['dropoffPoints'].every(isBookingRoutePoint) &&
    typeof vehicle['id'] === 'string' &&
    (typeof vehicle['name'] === 'string' || vehicle['name'] === null) &&
    typeof vehicle['licensePlate'] === 'string' &&
    typeof vehicle['type'] === 'string' &&
    typeof value['departureDate'] === 'string' &&
    typeof value['departureTime'] === 'string' &&
    typeof value['departureAt'] === 'string' &&
    typeof value['arrivalAt'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['price'] === 'number' &&
    typeof value['seatCount'] === 'number' &&
    typeof value['availableSeatCount'] === 'number' &&
    Array.isArray(value['seats']) &&
    value['seats'].every(
      seat =>
        isRecord(seat) &&
        typeof seat['id'] === 'string' &&
        typeof seat['name'] === 'string' &&
        typeof seat['floor'] === 'number' &&
        typeof seat['column'] === 'number' &&
        typeof seat['row'] === 'number' &&
        typeof seat['type'] === 'string' &&
        typeof seat['status'] === 'string' &&
        typeof seat['price'] === 'number',
    )
  );
}

@Injectable({ providedIn: 'root' })
export class BookingRoutesApi {
  async getAllRoutes(
    from: string,
    to: string,
    vehicleType: string | undefined,
    date: string,
  ): Promise<BookingRouteTrip[]> {
    const query = new URLSearchParams({ from, to, date });
    if (vehicleType) query.set('vehicleType', vehicleType);
    let response: Response;
    try {
      response = await fetch(
        `http://localhost:3000/admin/booking-management/getAllRoutes?${query}`,
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('Máy chủ không phản hồi khi tải danh sách chuyến.');
      }
      throw new Error('Không kết nối được máy chủ để tải danh sách chuyến.');
    }

    if (!response.ok) {
      throw new Error(`Không thể tải danh sách chuyến (${response.status}).`);
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new Error('Dữ liệu chuyến xe trả về không hợp lệ.');
    }
    if (!Array.isArray(result) || !result.every(isBookingRouteTrip)) {
      throw new Error('Dữ liệu chuyến xe trả về không đúng định dạng.');
    }
    return result;
  }
}
