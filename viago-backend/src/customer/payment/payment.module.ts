import { Module } from '@nestjs/common';
import { CustomerPaymentController } from './payment.controller';
import { CustomerPaymentService } from './payment.service';

@Module({
  controllers: [CustomerPaymentController],
  providers: [CustomerPaymentService],
})
export class CustomerPaymentModule {}