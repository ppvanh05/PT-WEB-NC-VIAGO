import { TestBed } from '@angular/core/testing';
import { AdminProfile, AdminProfileData } from './profile';

describe('Admin profile', () => {
  const original: AdminProfileData = {
    familyName: 'Nguyễn An', givenName: 'Ninh', displayName: 'Quản trị viên',
    email: 'admin@viago.vn', phone: '0901234567', gender: 'Nam',
    birthday: '1985-03-15', address: 'TP. Hồ Chí Minh', notes: '', avatarUrl: '',
  };
  async function setup() {
    await TestBed.configureTestingModule({ imports: [AdminProfile] }).compileComponents();
    const fixture = TestBed.createComponent(AdminProfile);
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    fixture.componentInstance.open(original);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('discards edits on cancel and restores the saved profile on reopen', async () => {
    const fixture = await setup();
    const saved = vi.spyOn(fixture.componentInstance.saved, 'emit');
    fixture.componentInstance.draft.displayName = 'Changed';
    fixture.componentInstance.close();
    expect(original.displayName).toBe('Quản trị viên');
    expect(saved).not.toHaveBeenCalled();
    fixture.componentInstance.open(original);
    expect(fixture.componentInstance.draft.displayName).toBe('Quản trị viên');
  });

  it('blocks invalid email and saves a corrected profile', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const saved = vi.spyOn(component.saved, 'emit');
    component.draft.email = 'admin@viago';
    component.save();
    expect(saved).not.toHaveBeenCalled();
    component.draft.email = 'admin@viago.vn';
    component.draft.displayName = 'Nguyễn An Ninh';
    component.save();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Nguyễn An Ninh' }));
  });

  it('rejects a non-image upload', async () => {
    const fixture = await setup();
    fixture.componentInstance.onFileSelected({ target: {
      files: [new File(['text'], 'file.txt', { type: 'text/plain' })], value: 'file.txt',
    } } as unknown as Event);
    expect(fixture.componentInstance.avatarError).toContain('JPG');
    expect(fixture.componentInstance.draft.avatarUrl).toBe('');
  });
});
