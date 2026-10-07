import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide-detail',
  standalone: true,
  imports: [RouterLink],
  styleUrls: ['../../customer-pages.css', './guide-detail.css', '../../customer-page-theme.css'],
  templateUrl: './guide-detail.html'
})
export class GuideDetail {}
