import { Component } from '@angular/core';

/** Project buttons so each screen retains its filters, counts and permissions. */
@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  host: { class: 'admin-tabs', role: 'group' },
  template: '<ng-content />',
})
export class AdminTabs {}
