import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CustomerInvoiceController } from './invoice.controller';
import { CustomerInvoiceService } from './invoice.service';
@Module({ imports: [PrismaModule], controllers: [CustomerInvoiceController], providers: [CustomerInvoiceService] })
export class CustomerInvoiceModule {}
