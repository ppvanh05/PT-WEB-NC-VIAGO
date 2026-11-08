import { Component, input } from '@angular/core';

@Component({
  selector: 'app-support-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()] || paths[\'chat\']" /></svg>',
  styles:
    ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}',
})
export class SupportIcon {
  name = input('chat');
  readonly paths: Record<string, string> = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 1 1 19 0ZM7 9h10M7 13h7',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    refresh: 'M20 7v5h-5M4 17v-5h5M5.5 7a7.5 7.5 0 0 1 12-2L20 8M4 16l2.5 3a7.5 7.5 0 0 0 12-2',
    check: 'm5 12 4 4L19 6',
    send: 'm22 2-7 20-4-9-9-4 20-7ZM11 13 22 2',
    user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    inbox: 'M4 4h16l2 12v4H2v-4L4 4ZM2 14h6l2 3h4l2-3h6',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
    close: 'm6 6 12 12M6 18 18 6',
    back: 'm15 18-6-6 6-6',
    info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6M12 7v.1',
    sparkles: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4M18 4h4',
    logout: 'M9 21H4V3h5M14 7l5 5-5 5M8 12h13',
    arrow: 'M4 12h16m-5-5 5 5-5 5',
  };
}
