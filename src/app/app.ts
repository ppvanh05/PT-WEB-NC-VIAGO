import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DetailedReportComponent } from './featured/admin/reports/detailed-report/detailed-report';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DetailedReportComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}