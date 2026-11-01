import { Module } from '@nestjs/common';
import { AdminDriversAssistantsController } from './drivers-assistants.controller';
import { AdminDriversAssistantsService } from './drivers-assistants.service';

@Module({
  controllers: [AdminDriversAssistantsController],
  providers: [AdminDriversAssistantsService],
})
export class AdminDriversAssistantsModule {}