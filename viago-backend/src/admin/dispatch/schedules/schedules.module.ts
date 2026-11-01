import { Module } from '@nestjs/common';
import { AdminSchedulesController } from './schedules.controller';
import { AdminSchedulesService } from './schedules.service';

@Module({
  controllers: [AdminSchedulesController],
  providers: [AdminSchedulesService],
})
export class AdminSchedulesModule {}