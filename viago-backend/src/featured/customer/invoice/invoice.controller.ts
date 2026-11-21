import { Controller, Get, Query } from '@nestjs/common';
import { CustomerInvoiceService } from './invoice.service';

@Controller('customer/invoice')
export class CustomerInvoiceController {
  constructor(private readonly service: CustomerInvoiceService) {}
  @Get('lookup') lookup(@Query('code') code?: string) { return this.service.lookup(code ?? ''); }
}
