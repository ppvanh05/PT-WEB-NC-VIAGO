import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['../../customer-pages.css', './contact.css', '../../customer-page-theme.css']
})
export class Contact {
  request = { fullName: '', phone: '', email: '', subject: 'Hỗ trợ đặt vé', message: '' };

  openEmail(): void {
    const body = `${this.request.message}\n\nHọ tên: ${this.request.fullName}\nĐiện thoại: ${this.request.phone}\nEmail: ${this.request.email}`;
    window.location.href = `mailto:congtyviago@gmail.com?subject=${encodeURIComponent(this.request.subject)}&body=${encodeURIComponent(body)}`;
  }
}
