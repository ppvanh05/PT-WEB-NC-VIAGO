import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-customer-footer',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './customer-footer.css',
  templateUrl: './customer-footer.html',
})
export class CustomerFooter {
  readonly year = new Date().getFullYear();
}
