import { Component } from '@angular/core';
import { Pagination } from './shared/components/pagination/pagination';
import { Toast, ToastVariant } from './shared/components/toast/toast';

interface DemoToast {
  variant: ToastVariant;
  message: string;
}

@Component({
  imports: [Pagination, Toast],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected currentPage = 1;
  protected readonly demoToasts: DemoToast[] = [
    { variant: 'success', message: 'Thao tác đã được thực hiện thành công.' },
    { variant: 'error', message: 'Không thể hoàn tất thao tác. Vui lòng thử lại.' },
    { variant: 'warning', message: 'Vui lòng kiểm tra lại thông tin trước khi tiếp tục.' },
    { variant: 'info', message: 'Hệ thống vừa cập nhật thông tin mới.' },
  ];

  protected changePage(page: number): void {
    this.currentPage = page;
  }
}
