import { afterEach, describe, expect, it, vi } from 'vitest';
import { DestinationService } from './destination-service';
import { vietnamDate } from './booking.models';

describe('Destination forecast', () => {
  afterEach(() => vi.unstubAllGlobals());
  const city = '\u0110\u00e0 L\u1ea1t';
  it('validates the arrival date and caches a successful forecast', async () => {
    const date = vietnamDate();
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ daily: { time: [date], temperature_2m_min: [18], temperature_2m_max: [25], precipitation_probability_max: [60], weather_code: [61] } }) });
    vi.stubGlobal('fetch', fetcher);
    const service = new DestinationService();
    expect(await service.weather(city, date)).toMatchObject({ date, min: 18, max: 25, rain: 60 });
    await service.weather(city, date);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain(`start_date=${date}`);
  });
  it('rejects another day in the response and allows retrying', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ daily: { time: ['2000-01-01'], temperature_2m_min: [18], temperature_2m_max: [25], precipitation_probability_max: [60], weather_code: [61] } }) });
    vi.stubGlobal('fetch', fetcher);
    const service = new DestinationService();
    await expect(service.weather(city, vietnamDate())).rejects.toThrow();
    await expect(service.weather(city, vietnamDate())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not request forecasts outside the available date range', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(new DestinationService().weather(city, vietnamDate(Date.now() + 30 * 86400000))).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
