import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-us.html',
  styleUrls: ['../../customer-pages.css', './about-us.css', '../../customer-page-theme.css']
})
export class AboutUs implements AfterViewInit, OnDestroy {
  @ViewChild('countersSection') countersSection!: ElementRef;

  passengersDisplay = '0';
  onTimeDisplay = '0';
  tripsDisplay = '0';

  private countersObserver?: IntersectionObserver;
  private countersStarted = false;

  limoImages = [
    { src: '/assets/customer/fleet/limo_9_1.png', alt: 'Nội thất Limousine 1' },
    { src: '/assets/customer/fleet/limo_9_2.png', alt: 'Nội thất Limousine 2' },
    { src: '/assets/customer/fleet/limo_9_3.png', alt: 'Nội thất Limousine 3' },
    { src: '/assets/customer/fleet/limo_9_4.png', alt: 'Nội thất Limousine 4' },
    { src: '/assets/customer/fleet/limo_9_5.png', alt: 'Nội thất Limousine 5' },
    { src: '/assets/customer/fleet/limo_9_6.png', alt: 'Nội thất Limousine 6' },
  ];
  currentSlide = 0;
  private carouselInterval?: ReturnType<typeof setInterval>;

  constructor(private router: Router) {}

  ngAfterViewInit() {
    if (this.countersSection?.nativeElement) {
      this.countersObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.countersStarted) {
              this.countersStarted = true;
              this.animateCounters();
              this.countersObserver?.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );
      this.countersObserver.observe(this.countersSection.nativeElement);
    }
    this.startCarousel();
  }

  ngOnDestroy() {
    this.countersObserver?.disconnect();
    this.stopCarousel();
  }

  private animateCounters() {
    const duration = 2000;
    const steps = 60;
    const intervalMs = duration / steps;

    const targetPassengers = 1.5;
    const targetOnTime = 99.2;
    const targetTrips = 50;

    let step = 0;

    const tick = () => {
      step++;
      const progress = Math.min(step / steps, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentPassengers = targetPassengers * easeOut;
      this.passengersDisplay = currentPassengers.toFixed(1) + 'M+';

      const currentOnTime = targetOnTime * easeOut;
      this.onTimeDisplay = currentOnTime.toFixed(1) + '%';

      const currentTrips = Math.round(targetTrips * easeOut);
      this.tripsDisplay = currentTrips + '+';

      if (step < steps) {
        setTimeout(tick, intervalMs);
      }
    };
    tick();
  }

  prevSlide() {
    this.currentSlide =
      (this.currentSlide - 1 + this.limoImages.length) % this.limoImages.length;
    this.resetCarousel();
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.limoImages.length;
    this.resetCarousel();
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    this.resetCarousel();
  }

  private startCarousel() {
    this.carouselInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.limoImages.length;
    }, 4000);
  }

  private stopCarousel() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  private resetCarousel() {
    this.stopCarousel();
    this.startCarousel();
  }

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
