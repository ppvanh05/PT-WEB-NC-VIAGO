import { Module } from '@nestjs/common';
import { PaymentIntegrationService } from './payment.service';

@Module({
  providers: [PaymentIntegrationService],
  exports: [PaymentIntegrationService],
})
export class PaymentIntegrationModule {}