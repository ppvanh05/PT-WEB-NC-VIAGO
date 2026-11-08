import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal';

@Component({
  standalone: true,
  imports: [ModalComponent],
  // Declare the second dialog first to verify opening order, not DOM order.
  template: `
    <button id="opener" (click)="editorOpen = true">Open editor</button>
    <app-modal [open]="confirmOpen" title="Confirm action" (closed)="confirmOpen = false" [fixedLayout]="true" [fitContent]="true">Confirm content</app-modal>
    <app-modal [open]="editorOpen" title="Editor" (closed)="editorOpen = false" [fixedLayout]="true" [fitContent]="true"><button id="confirm-opener" (click)="confirmOpen = true">Confirm action</button></app-modal>
  `,
})
class ModalHost {
  editorOpen = false;
  confirmOpen = false;
}

describe('Shared modal stacking', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('places the most recently opened dialog above the editor regardless of template order', () => {
    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('#confirm-opener') as HTMLButtonElement).click();
    fixture.detectChanges();
    const panel = (label: string) => fixture.nativeElement.querySelector(`[role="dialog"][aria-label="${label}"]`) as HTMLElement;
    const offset = (label: string) => Number(panel(label).parentElement!.style.zIndex.match(/\+\s*(\d+)/)![1]);
    expect(offset('Confirm action')).toBeGreaterThan(offset('Editor'));
    expect(panel('Editor').classList.contains('modal-panel--fixed')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    (panel('Confirm action').querySelector('.modal-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(panel('Confirm action')).toBeNull();
    expect(panel('Editor')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    (panel('Editor').querySelector('.modal-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.activeElement).toBe(opener);
  });

  it('releases the scroll lock when an open dialog is destroyed during navigation', () => {
    const before = document.body.style.overflow;
    const fixture = TestBed.createComponent(ModalHost);
    fixture.componentInstance.editorOpen = true;
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    expect(document.body.style.overflow).toBe(before);
  });

  it('keeps lock confirmation before cancel and respects disabled and loading states', () => {
    const fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('confirmMode', true);
    fixture.componentRef.setInput('lockAction', true);
    fixture.componentRef.setInput('confirmText', 'Khóa tài khoản');
    fixture.componentRef.setInput('disableConfirm', true);
    let confirmations = 0;
    let closes = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmations++);
    fixture.componentInstance.closed.subscribe(() => closes++);
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('.modal-footer') as HTMLElement;
    const lock = footer.querySelector('button')!;
    expect(lock.textContent!.trim()).toBe('Khóa tài khoản');
    lock.click();
    expect(confirmations).toBe(0);
    fixture.componentRef.setInput('disableConfirm', false);
    fixture.detectChanges();
    lock.click();
    expect(confirmations).toBe(1);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    lock.click();
    expect(confirmations).toBe(1);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    (footer.querySelector('.modal-button--secondary') as HTMLButtonElement).click();
    expect(closes).toBe(1);
  });
});
