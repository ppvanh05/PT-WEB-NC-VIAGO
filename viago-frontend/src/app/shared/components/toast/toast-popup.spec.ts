import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastPopup } from './toast-popup';

describe('ToastPopup', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });
  it('slides out after four seconds and emits closure after the transition', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(ToastPopup);
    fixture.componentRef.setInput('message', 'Lưu thành công.');
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Lưu thành công.');
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notice-popup--leaving')).not.toBeNull();
    expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(220);
    expect(closed).toHaveBeenCalledOnce();
    fixture.destroy();
  });
  it('cleans up pending notifications when the page is destroyed', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(ToastPopup);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
    fixture.destroy();
    vi.advanceTimersByTime(5000);
    expect(closed).not.toHaveBeenCalled();
  });
});
