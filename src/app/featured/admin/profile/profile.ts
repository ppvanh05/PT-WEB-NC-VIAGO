import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

export interface AdminProfileData {
  familyName: string;
  givenName: string;
  displayName: string;
  phone: string;
  email: string;
  gender: string;
  birthday: string;
  address: string;
  notes: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-admin-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class AdminProfile {
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('profileForm') profileForm!: NgForm;
  @Output() readonly saved = new EventEmitter<AdminProfileData>();
  draft: AdminProfileData = {
    familyName: '', givenName: '', displayName: '', phone: '', email: '',
    gender: '', birthday: '', address: '', notes: '', avatarUrl: '',
  };
  avatarError = '';
  readingAvatar = false;
  private selectionVersion = 0;
  readonly today = new Date().toLocaleDateString('sv-SE');

  open(profile: AdminProfileData): void {
    this.selectionVersion++;
    this.draft = { ...profile };
    this.avatarError = '';
    this.readingAvatar = false;
    this.profileForm.resetForm(this.draft);
    this.dialog.nativeElement.showModal();
  }

  close(): void {
    this.selectionVersion++;
    this.dialog.nativeElement.close();
  }

  save(): void {
    for (const key of ['familyName', 'givenName', 'displayName', 'phone', 'email'] as const) {
      this.draft[key] = this.draft[key].trim();
      this.profileForm.controls[key]?.setValue(this.draft[key]);
    }
    if (this.profileForm.invalid || this.readingAvatar || this.avatarError) {
      this.profileForm.control.markAllAsTouched();
      return;
    }
    this.saved.emit({ ...this.draft });
    this.close();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const version = ++this.selectionVersion;
    this.avatarError = '';
    this.readingAvatar = false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.avatarError = 'Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.';
      return;
    }
    this.readingAvatar = true;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (version !== this.selectionVersion) return;
        this.draft.avatarUrl = reader.result as string;
        this.readingAvatar = false;
      };
      img.onerror = () => this.failAvatar(version);
      img.src = reader.result as string;
    };
    reader.onerror = () => this.failAvatar(version);
    reader.readAsDataURL(file);
  }

  private failAvatar(version: number): void {
    if (version !== this.selectionVersion) return;
    this.readingAvatar = false;
    this.avatarError = 'Không đọc được ảnh. Vui lòng chọn ảnh khác.';
  }
}
