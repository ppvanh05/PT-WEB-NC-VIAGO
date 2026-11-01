import { Module } from '@nestjs/common';
import { AdminActivityLogsController } from './activity-logs.controller';
import { AdminActivityLogsService } from './activity-logs.service';

@Module({
  controllers: [AdminActivityLogsController],
  providers: [AdminActivityLogsService],
})
export class AdminActivityLogsModule {}