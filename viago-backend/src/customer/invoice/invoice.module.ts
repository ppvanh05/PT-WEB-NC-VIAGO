import { Module } from '@nestjs/common';
import { CustomerInvoiceController } from './invoice.controller';
import { CustomerInvoiceService } from './invoice.service';

@Module({
  controllers: [CustomerInvoiceController],
  providers: [CustomerInvoiceService],
})
export class CustomerInvoiceModule {}