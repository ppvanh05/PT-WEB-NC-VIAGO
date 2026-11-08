import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { aboutRequest } from '../about-api';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
interface LegalDocument {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  content: string;
  effectiveDate: string;
  updatedAt: string;
  cancellationVersion: number | null;
  cancellationRules: {
    minHours: number;
    maxHours: number | null;
    cancellationAllowed: boolean;
    refundPercent: number;
    feePercent: number;
  }[];
}
@Component({
  selector: 'app-legal-documents',
  standalone: true,
  imports: [CommonModule, Card, Button],
  templateUrl: './legal-documents.html',
  styleUrl: './legal-documents.css',
})
export class LegalDocuments implements OnInit {
  @Input({ required: true }) kind: 'policies' | 'terms' = 'policies';
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly abort = new AbortController();
  documents: LegalDocument[] = [];
  loading = true;
  error = '';
  constructor() {
    this.destroy.onDestroy(() => this.abort.abort());
  }
  ngOnInit() {
    void this.load();
  }
  get title() {
    return this.kind === 'policies' ? 'CHÍNH SÁCH NHÀ XE' : 'ĐIỀU KHOẢN SỬ DỤNG';
  }
  async load() {
    this.loading = true;
    this.error = '';
    try {
      const docs: LegalDocument[] = [];
      let pages = 1;
      for (let page = 1; page <= pages; page++) {
        const response = await aboutRequest<{
          data: LegalDocument[];
          pagination: { totalPages: number };
        }>('/' + this.kind + '?page=' + page + '&pageSize=100', undefined, this.abort.signal);
        if (
          !Array.isArray(response.data) ||
          !Number.isInteger(response.pagination?.totalPages) ||
          response.pagination.totalPages > 100
        )
          throw new Error('Dữ liệu chính sách không hợp lệ.');
        docs.push(...response.data);
        pages = response.pagination.totalPages;
      }
      if (!this.abort.signal.aborted) this.documents = docs;
    } catch (e) {
      if (!this.abort.signal.aborted) {
        this.documents = [];
        this.error = e instanceof Error ? e.message : 'Chưa tải được nội dung. Vui lòng thử lại.';
      }
    } finally {
      if (!this.abort.signal.aborted) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }
  scrollTo(id: string) {
    document.getElementById('legal-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
