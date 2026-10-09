import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide-hotline',
  standalone: true,
  imports: [RouterLink],
  styleUrls: ['../../../customer-pages.css', '../guide-detail.css', './guide-hotline.css', '../../../customer-page-theme.css'],
  templateUrl: './guide-hotline.html'
})
export class GuideHotline {}
