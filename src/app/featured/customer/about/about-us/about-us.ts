import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-us.html',
  styleUrls: ['../../customer-pages.css', './about-us.css', '../../customer-page-theme.css']
})
export class AboutUs {
  constructor(private router: Router) {}

  goToRentalServices() {
    this.router.navigate(['/dich-vu'], {
      queryParams: { tab: 'thue-xe' }
    });
  }

  goToSchedule() {
    this.router.navigate(['/lich-trinh']);
  }

  goToBookingSection() {
    this.router.navigate(['/'], {
      queryParams: { scroll: 'booking-form-card' }
    });
  }
}
