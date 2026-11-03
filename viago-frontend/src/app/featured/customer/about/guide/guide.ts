import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-guide',
  styleUrls: ['../../customer-pages.css', './guide.css', '../../customer-page-theme.css'],
  templateUrl: './guide.html',
})
export class Guide {
  onlineGuideVisible = false;

  showOnlineGuide(event: Event): void {
    event.preventDefault();
    this.onlineGuideVisible = true;

    setTimeout(() => {
      document.getElementById('dat-ve-online')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }
}
