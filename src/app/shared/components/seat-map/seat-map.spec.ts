import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { SeatMap, referenceSeatFloors } from './seat-map';

describe('Original vehicle seating', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps the three aisle spaces in the 9-seat vehicle and uses the original numbered blocks', () => {
    const fixture = TestBed.createComponent(SeatMap); fixture.componentInstance.vehicleType = 'Limousine 9 chỗ';
    fixture.componentInstance.statuses = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`${i + 1}A`, 'available'])); fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector('.original-seat-grid') as HTMLElement;
    expect([...grid.children].map(cell => cell.textContent?.trim() || '')).toEqual(['A01', '', 'A02', 'A03', '', 'A04', 'A05', '', 'A06', 'A07', 'A08', 'A09']);
    expect(grid.querySelector('svg')).toBeNull();
    const picked: string[] = []; fixture.componentInstance.seatSelected.subscribe(seat => picked.push(seat));
    (grid.querySelector('[data-seat="3A"]') as HTMLButtonElement).click(); expect(picked).toEqual(['3A']);
    fixture.destroy();
  });
  it('allocates cabin seats as 12 downstairs and 10 upstairs, with 2 columns and the original steering icon', () => {
    const floors = referenceSeatFloors('Cabin 22 chỗ'); expect(floors.map(f => f.cells.length)).toEqual([12, 10]);
    expect(floors[0].cells.at(-1)).toBe('12A'); expect(floors[1].cells.at(-1)).toBe('10B');
    const fixture = TestBed.createComponent(SeatMap); fixture.componentInstance.vehicleType = 'Cabin 22 chỗ'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.steering-space svg')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.seat-column-labels')).toHaveLength(2);
    expect([...fixture.nativeElement.querySelectorAll('.original-seat-grid')].every((grid: any) => grid.style.gridTemplateColumns.includes('repeat(2'))).toBe(true); fixture.destroy();
  });
  it('keeps the first-row aisle in both floors of the 34-seat vehicle', () => {
    const floors = referenceSeatFloors('Giường nằm 34 chỗ'); expect(floors.map(f => f.cells.length)).toEqual([18, 18]);
    expect(floors.map(f => f.cells.slice(0, 6))).toEqual([['1A', '', '2A', '3A', '4A', '5A'], ['1B', '', '2B', '3B', '4B', '5B']]);
  });
});
