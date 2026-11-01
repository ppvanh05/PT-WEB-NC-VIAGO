import { Module } from '@nestjs/common';
import { AdminLostAndFoundController } from './lost-and-found.controller';
import { AdminLostAndFoundService } from './lost-and-found.service';

@Module({
  controllers: [AdminLostAndFoundController],
  providers: [AdminLostAndFoundService],
})
export class AdminLostAndFoundModule {}