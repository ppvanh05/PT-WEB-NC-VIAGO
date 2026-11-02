import { Injectable } from '@angular/core';
import { vietnamDate } from './booking.models';

const COORDINATES: Record<string, [number, number]> = { 'TP.HCM': [10.8231,106.6297], 'Cần Thơ': [10.0452,105.7469], 'Vũng Tàu': [10.346,107.0843], 'Đà Lạt': [11.9404,108.4583], 'Nha Trang': [12.2388,109.1967], 'Buôn Ma Thuột': [12.6667,108.05], 'Rạch Giá': [10.0125,105.0809], 'Phan Thiết': [10.9289,108.1021], 'Đà Nẵng': [16.0544,108.2022] };
export interface DestinationWeather { min: number; max: number; rain: number; code: number; date: string; }

@Injectable({ providedIn: 'root' })
export class DestinationService {
  private cache = new Map<string, {at: number; weather: DestinationWeather}>();
  async weather(city: string, date: string, signal?: AbortSignal): Promise<DestinationWeather> {
    const coords = COORDINATES[city], today = vietnamDate();
    if (!coords || date < today || date > vietnamDate(Date.now() + 15 * 86400000)) throw new Error('Dự báo chưa khả dụng cho ngày đến.');
    const key = `${city}|${date}`, cached = this.cache.get(key); if (cached && Date.now() - cached.at < 600000) return cached.weather;
    const query = new URLSearchParams({ latitude: String(coords[0]), longitude: String(coords[1]), daily: 'temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code', timezone: 'Asia/Ho_Chi_Minh', start_date: date, end_date: date });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal });
    if (!response.ok) throw new Error('Chưa tải được dự báo. Vui lòng thử lại.');
    const data = await response.json(), daily = data.daily;
    const weather = { min: daily?.temperature_2m_min?.[0], max: daily?.temperature_2m_max?.[0], rain: daily?.precipitation_probability_max?.[0], code: daily?.weather_code?.[0], date: daily?.time?.[0] };
    if (![weather.min,weather.max,weather.rain,weather.code].every(Number.isFinite) || weather.date !== date) throw new Error('Chưa có dữ liệu dự báo cho ngày đến.');
    this.cache.set(key, { at: Date.now(), weather }); return weather;
  }
}
