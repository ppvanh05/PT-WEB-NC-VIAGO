import { Module } from '@nestjs/common';
import { CustomerScheduleController } from './schedule.controller';
import { CustomerScheduleService } from './schedule.service';

@Module({
  controllers: [CustomerScheduleController],
  providers: [CustomerScheduleService],
})
export class CustomerScheduleModule {}