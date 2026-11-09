import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide-pickup',
  standalone: true,
  imports: [RouterLink],
  styleUrls: ['../../../customer-pages.css', '../guide-detail.css', '../guide-hotline/guide-hotline.css', './guide-pickup.css', '../../../customer-page-theme.css'],
  templateUrl: './guide-pickup.html'
})
export class GuidePickup {}
