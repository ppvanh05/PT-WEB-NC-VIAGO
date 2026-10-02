import { CommonModule } from '@angular/common';
import { Component, EventEmitter, forwardRef, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { convertSolar2Lunar } from '../../utils/lunar-calendar';

interface CalendarDay { date: string; day: number; lunarLabel: string; currentMonth: boolean; today: boolean; selected: boolean; disabled: boolean; }

@Component({
  selector: 'app-date-picker', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './date-picker.html', styleUrl: './date-picker.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true }],
})
export class DatePickerComponent implements ControlValueAccessor, OnChanges {
  @Input() label = '';
  @Input() placeholder = 'dd/mm/yyyy';
  @Input() format = 'dd/MM/yyyy';
  @Input() disabled = false;
  @Input() minDate = '';
  @Input() maxDate = '';
  @Input() disabledDates: string[] = [];
  @Input() showLunar = true;
  @Input() showClear = true;
  @Output() dateChange = new EventEmitter<string>();
  @Output() monthChange = new EventEmitter<{ month: number; year: number }>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  value = '';
  isOpen = false;
  viewDate = new Date();
  calendarDays: CalendarDay[] = [];
  focusedDate = '';
  readonly weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  readonly months = Array.from({ length: 12 }, (_, month) => ({ value: month, label: `Tháng ${month + 1}` }));
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void { this.value = value || ''; this.focusedDate = this.value; if (this.value) this.viewDate = this.parseDate(this.value) || new Date(); this.generateCalendar(); }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['minDate'] || changes['maxDate'] || changes['disabledDates'] || changes['showLunar']) {
      this.generateCalendar();
    }
  }

  toggle(): void { if (this.disabled) return; this.isOpen ? this.close() : this.open(); }
  open(): void { this.isOpen = true; if (this.value) this.viewDate = this.parseDate(this.value) || this.viewDate; this.generateCalendar(); this.focusedDate = this.value || this.calendarDays.find(day => day.currentMonth && !day.disabled)?.date || ''; this.opened.emit(); }
  close(): void { if (!this.isOpen) return; this.isOpen = false; this.onTouched(); this.closed.emit(); }
  clear(event: MouseEvent): void { event.stopPropagation(); this.selectValue(''); }
  previousMonth(): void { if (this.previousMonthDisabled) return; this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1); this.generateCalendar(); this.monthChange.emit({ month: this.viewDate.getMonth() + 1, year: this.viewDate.getFullYear() }); }
  nextMonth(): void { if (this.nextMonthDisabled) return; this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1); this.generateCalendar(); this.monthChange.emit({ month: this.viewDate.getMonth() + 1, year: this.viewDate.getFullYear() }); }
  changeMonth(month: number): void { const next = new Date(this.viewDate.getFullYear(), Number(month), 1); if (!this.isMonthOutsideRange(next)) { this.viewDate = next; this.generateCalendar(); this.monthChange.emit({ month: next.getMonth() + 1, year: next.getFullYear() }); } }
  changeYear(year: number): void { const next = new Date(Number(year), this.viewDate.getMonth(), 1); if (!this.isMonthOutsideRange(next)) { this.viewDate = next; this.generateCalendar(); this.monthChange.emit({ month: next.getMonth() + 1, year: next.getFullYear() }); } }
  select(day: CalendarDay): void { if (!day.disabled) this.selectValue(day.date); }

  onDayKeyDown(event: KeyboardEvent, day: CalendarDay): void {
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.select(day); return; }
    if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.moveFocus(day.date, event.key === 'Home' ? -((this.dayIndex(day.date)) % 7) : 6 - (this.dayIndex(day.date) % 7));
      return;
    }
    if (movement[event.key]) { event.preventDefault(); this.moveFocus(day.date, movement[event.key]); }
  }

  private selectValue(value: string): void { this.value = value; this.focusedDate = value; this.onChange(value); this.dateChange.emit(value); this.generateCalendar(); if (value) this.close(); }
  private generateCalendar(): void {
    const year = this.viewDate.getFullYear(), month = this.viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
    const start = new Date(year, month, 1 - mondayOffset);
    this.calendarDays = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = this.toIso(date), lunar = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
      return { date: iso, day: date.getDate(), lunarLabel: this.showLunar ? `${lunar.day}/${lunar.month}` : '', currentMonth: date.getMonth() === month, today: iso === this.toIso(new Date()), selected: iso === this.value, disabled: this.isDisabled(iso), };
    });
  }
  private isDisabled(date: string): boolean { return (!!this.minDate && date < this.minDate) || (!!this.maxDate && date > this.maxDate) || this.disabledDates.includes(date); }
  private dayIndex(date: string): number { return this.calendarDays.findIndex(day => day.date === date); }
  private moveFocus(date: string, offset: number): void {
    const currentIndex = this.dayIndex(date);
    if (currentIndex < 0) return;
    const nextIndex = Math.max(0, Math.min(this.calendarDays.length - 1, currentIndex + offset));
    const nextDate = this.calendarDays[nextIndex].date;
    this.focusedDate = nextDate;
    const next = this.parseDate(nextDate);
    if (next && (next.getMonth() !== this.viewDate.getMonth() || next.getFullYear() !== this.viewDate.getFullYear())) {
      this.viewDate = new Date(next.getFullYear(), next.getMonth(), 1);
      this.generateCalendar();
    }
    setTimeout(() => document.querySelector<HTMLElement>(`[data-date-picker-day="${nextDate}"]`)?.focus());
  }
  private toIso(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private parseDate(value: string): Date | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return match ? new Date(+match[1], +match[2] - 1, +match[3]) : null; }
  private monthStart(offset = 0): string { return this.toIso(new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + offset, 1)); }
  private monthEnd(offset = 0): string { return this.toIso(new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + offset + 1, 0)); }
  private isMonthOutsideRange(date: Date): boolean { const start = this.toIso(new Date(date.getFullYear(), date.getMonth(), 1)); const end = this.toIso(new Date(date.getFullYear(), date.getMonth() + 1, 0)); return (!!this.minDate && end < this.minDate) || (!!this.maxDate && start > this.maxDate); }
  get years(): number[] { const minYear = this.minDate ? this.parseDate(this.minDate)?.getFullYear() ?? 1900 : 1900; const maxYear = this.maxDate ? this.parseDate(this.maxDate)?.getFullYear() ?? 2199 : 2199; return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index); }
  isMonthDisabled(month: number): boolean { return this.isMonthOutsideRange(new Date(this.viewDate.getFullYear(), month, 1)); }
  get previousMonthDisabled(): boolean { return !!this.minDate && this.monthEnd(-1) < this.minDate; }
  get nextMonthDisabled(): boolean { return !!this.maxDate && this.monthStart(1) > this.maxDate; }
  get displayValue(): string { const date = this.parseDate(this.value); if (!date) return ''; const dd = String(date.getDate()).padStart(2, '0'); const mm = String(date.getMonth() + 1).padStart(2, '0'); const yyyy = date.getFullYear(); if (this.format === 'MM/dd/yyyy') return `${mm}/${dd}/${yyyy}`; if (this.format === 'yyyy-MM-dd') return `${yyyy}-${mm}-${dd}`; return `${dd}/${mm}/${yyyy}`; }
  get monthLabel(): string { return this.viewDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }); }
  @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent): void { const target = event.target as HTMLElement; if (this.isOpen && !target.closest('app-date-picker')) this.close(); }
  @HostListener('document:keydown.escape') onEscape(): void { if (this.isOpen) this.close(); }
}
