import { Component, input } from '@angular/core';
import { Card } from '../card/card';

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  imports: [Card],
  host: { '[attr.title]': 'null' },
  template: `
    <app-card class="header-card" radius="sm" padding="none" shadow="sm" [bordered]="true">
      <header class="admin-page-heading">
        <div class="titles">
          <p class="eyebrow">{{ section() }}</p>
          <h1>{{ title() }}</h1>
        </div>
        <ng-content />
      </header>
    </app-card>
  `,
  styles: `
    :host { display: block; min-width: 0; height: auto; font-family: var(--font-family-base); }
    .admin-page-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); padding: var(--space-6) 30px; }
    .titles { min-width: 0; }
    .eyebrow { margin: 0 0 var(--space-1); color: var(--color-text-secondary); font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); line-height: var(--line-height-caption); text-transform: uppercase; }
    h1 { margin: 0; font-family: var(--font-family-base); font-size: var(--font-size-h2); font-weight: var(--font-weight-semibold); line-height: var(--line-height-h2); color: var(--color-primary-700); overflow-wrap: anywhere; }
    @media (max-width: 767px) { .admin-page-heading { flex-wrap: wrap; align-items: flex-start; padding: var(--space-5); } }
  `,
})
export class AdminPageHeader {
  title = input.required<string>();
  section = input.required<string>();
}
