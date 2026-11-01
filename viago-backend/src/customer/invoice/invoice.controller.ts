import { Controller } from '@nestjs/common';
import { CustomerInvoiceService } from './invoice.service';

@Controller('customer/invoice')
export class CustomerInvoiceController {
  constructor(private readonly service: CustomerInvoiceService) {}
}