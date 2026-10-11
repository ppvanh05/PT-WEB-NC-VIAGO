import { Component, EventEmitter, Input, Output } from '@angular/core';

export type SeatStatus = 'available' | 'held' | 'sold' | 'selected';
export function displaySeatLabel(seat: string): string { return seat.replace(/^(\d+)([AB])$/, (_, number, floor) => `${floor}${number.padStart(2, '0')}`); }
export function referenceSeatFloors(type: string): { level: string; cells: string[]; columns: number }[] {
  if (type.includes('9 chỗ')) return [{ level: 'A', columns: 3, cells: ['1A', '', '2A', '3A', '', '4A', '5A', '', '6A', '7A', '8A', '9A'] }];
  if (type.includes('22 chỗ')) return [{ level: 'A', columns: 2, cells: Array.from({ length: 12 }, (_, i) => `${i + 1}A`) }, { level: 'B', columns: 2, cells: Array.from({ length: 10 }, (_, i) => `${i + 1}B`) }];
  return ['A', 'B'].map(level => ({ level, columns: 3, cells: [`1${level}`, '', ...Array.from({ length: 16 }, (_, i) => `${i + 2}${level}`)] }));
}

@Component({ selector: 'app-seat-map', templateUrl: './seat-map.html', styleUrl: './seat-map.css' })
export class SeatMap {
  @Input() vehicleType = '';
  @Input() statuses: Record<string, SeatStatus> = {};
  @Input() disabledSeats: string[] = [];
  @Input() busy = false;
  @Output() seatSelected = new EventEmitter<string>();
  readonly label = displaySeatLabel;
  get floors() { return referenceSeatFloors(this.vehicleType); }
  get cabin(): boolean { return this.vehicleType.includes('22 chỗ'); }
  status(seat: string): SeatStatus { return this.statuses[seat] || 'sold'; }
  disabled(seat: string): boolean { return this.busy || this.disabledSeats.includes(seat) || ['held', 'sold'].includes(this.status(seat)); }
}
