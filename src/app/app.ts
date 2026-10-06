import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomerNavbar } from './core/layout/customer-navbar/customer-navbar';
import { CustomerFooter } from './core/layout/customer-footer/customer-footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    CustomerNavbar,
    CustomerFooter
  ],
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}