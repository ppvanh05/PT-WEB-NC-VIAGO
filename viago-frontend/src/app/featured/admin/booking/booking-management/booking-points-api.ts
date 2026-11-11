import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookingPointsApi {
  async getAllPoints(): Promise<string[]> {
    let response: Response;
    try {
      response = await fetch(
        'http://localhost:3000/admin/booking-management/getAllPoint',
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('Máy chủ không phản hồi khi tải danh sách tỉnh/thành.');
      }
      throw new Error('Không kết nối được máy chủ để tải danh sách tỉnh/thành.');
    }

    if (!response.ok) {
      throw new Error(
        `Không thể tải danh sách tỉnh/thành (${response.status}).`,
      );
    }

    let points: unknown;
    try {
      points = await response.json();
    } catch {
      throw new Error('Dữ liệu tỉnh/thành trả về không hợp lệ.');
    }
    if (!Array.isArray(points) || !points.every((point) => typeof point === 'string')) {
      throw new Error('Dữ liệu tỉnh/thành trả về không đúng định dạng.');
    }

    return [...new Set(points.map((point) => point.trim()).filter(Boolean))];
  }
}
