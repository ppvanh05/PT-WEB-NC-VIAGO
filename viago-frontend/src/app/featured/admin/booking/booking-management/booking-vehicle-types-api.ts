import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookingVehicleTypesApi {
  async getAllVehicleTypes(): Promise<string[]> {
    let response: Response;
    try {
      response = await fetch(
        'http://localhost:3000/admin/booking-management/getAllVehicleTypes',
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('Máy chủ không phản hồi khi tải danh sách loại xe.');
      }
      throw new Error('Không kết nối được máy chủ để tải danh sách loại xe.');
    }

    if (!response.ok) {
      throw new Error(`Không thể tải danh sách loại xe (${response.status}).`);
    }

    let vehicleTypes: unknown;
    try {
      vehicleTypes = await response.json();
    } catch {
      throw new Error('Dữ liệu loại xe trả về không hợp lệ.');
    }
    if (
      !Array.isArray(vehicleTypes) ||
      !vehicleTypes.every((vehicleType) => typeof vehicleType === 'string')
    ) {
      throw new Error('Dữ liệu loại xe trả về không đúng định dạng.');
    }

    return [
      ...new Set(vehicleTypes.map((vehicleType) => vehicleType.trim()).filter(Boolean)),
    ];
  }
}
