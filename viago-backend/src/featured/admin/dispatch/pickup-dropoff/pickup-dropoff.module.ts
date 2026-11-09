import { Module } from '@nestjs/common';
import { AdminPickupDropoffController } from './pickup-dropoff.controller';
import { AdminPickupDropoffService } from './pickup-dropoff.service';

@Module({
  controllers: [AdminPickupDropoffController],
  providers: [AdminPickupDropoffService],
})
export class AdminPickupDropoffModule {}