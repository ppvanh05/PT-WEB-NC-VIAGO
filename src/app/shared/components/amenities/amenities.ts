import { Component, Input } from '@angular/core';
import { Badge } from '../badge/badge';

// One palette per amenity category, shared by every customer display.
export function amenityPalette(label: string): readonly [string, string, string] {
  const key = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  if (/wi.?fi/.test(key)) return ['#1e40af', '#dbeafe', '#60a5fa'];
  if (/usb|cong sac/.test(key)) return ['#166534', '#dcfce7', '#4ade80'];
  if (/tivi|tv/.test(key)) return ['#6b21a8', '#f3e8ff', '#c084fc'];
  if (/gps/.test(key)) return ['#9a3412', '#ffedd5', '#fb923c'];
  if (/nuoc|khan/.test(key)) return ['#155e75', '#cffafe', '#22d3ee'];
  if (/dieu hoa|thong gio/.test(key)) return ['#9d174d', '#fce7f3', '#f472b6'];
  if (/chan/.test(key)) return ['#854d0e', '#fef9c3', '#facc15'];
  if (/wc/.test(key)) return ['#334155', '#e2e8f0', '#94a3b8'];
  if (/ghe|massage/.test(key)) return ['#991b1b', '#fee2e2', '#f87171'];
  if (/giuong|cabin/.test(key)) return ['#713f12', '#f5e6d3', '#c49a6c'];
  return ['var(--color-text-secondary)', 'var(--color-background)', 'var(--color-border)'];
}

export function amenityIcon(label: string): string {
  const key = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  if (/wi.?fi/.test(key)) return 'M2 8.82a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01';
  if (/usb|cong sac/.test(key)) return 'M12 19V3m-2 2 2-2 2 2M12 15l-5-4V8m5 5 5-4V7M10 20a2 2 0 1 0 4 0 2 2 0 1 0-4 0M6 7a1 1 0 1 0 2 0 1 1 0 1 0-2 0M16 4h2v3h-2z';
  if (/tivi|tv/.test(key)) return 'M3 5h18v11H3zM12 16v3M8 19h8';
  if (/gps/.test(key)) return 'M12 2v3M12 19v3M2 12h3M19 12h3M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0';
  if (/nuoc|khan/.test(key)) return 'M12 3 6.5 9a7 7 0 1 0 11 0L12 3z';
  if (/dieu hoa|thong gio/.test(key)) return 'M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M9 4l3 3 3-3M9 20l3-3 3 3M3.6 10.6l4.1-1.1-1.1-4.1M17.4 18.6l-1.1-4.1 4.1-1.1M3.6 13.4l4.1 1.1-1.1 4.1M17.4 5.4l-1.1 4.1 4.1 1.1';
  if (/chan/.test(key)) return 'M5 3h14v18H5zM5 7h14M9 7v14';
  if (/wc/.test(key)) return 'M5 3h6v7H5zM5 10h14v3a6 6 0 0 1-6 6h-2v2h6M8 6h.01';
  if (/ghe|massage/.test(key)) return 'M6 3v11h12v5H8a4 4 0 0 1-4-4V8M8 19v3M18 19v3M11 5l2 2-2 2';
  if (/giuong|cabin/.test(key)) return 'M3 18V7M21 18V9M3 14h18M3 9h5v5M8 10h13M3 18v3M21 18v3';
  return 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3z';
}

@Component({
  selector: 'app-amenities', imports: [Badge],
  template: `<div class="amenities-list" [class.amenities-grid]="layout === 'grid'">@for (item of labels; track item) { @let colors = palette(item); <app-badge variant="info" size="lg" rounded="md" customClass="amenity-badge" [style.--amenity-color]="colors[0]" [style.--amenity-background]="colors[1]" [style.--amenity-border]="colors[2]"><svg badge-icon aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path [attr.d]="icon(item)" /></svg>{{ item }}</app-badge> }</div>`,
  styles: [`:host { display: block; min-width: 0; } .amenities-list { display: flex; flex-wrap: wrap; gap: var(--space-2); } .amenities-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: var(--space-3); } .amenities-grid app-badge { min-width: 0; --amenity-width: 100%; --amenity-height: 40px; --amenity-justify: flex-start; } svg { display: block; width: 16px; height: 16px; flex: 0 0 16px; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }`],
})
export class Amenities {
  @Input() layout: 'wrap' | 'grid' = 'wrap';
  @Input() items: string[] | string = [];
  get labels(): string[] { return [...new Set((typeof this.items === 'string' ? this.items.split(',') : this.items).map(item => item.trim()).filter(Boolean))]; }
  readonly icon = amenityIcon;
  readonly palette = amenityPalette;
}
