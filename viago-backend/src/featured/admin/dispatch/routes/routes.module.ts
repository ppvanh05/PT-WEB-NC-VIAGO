import { Module } from '@nestjs/common';
import { AdminRoutesController } from './routes.controller';
import { AdminRoutesService } from './routes.service';

@Module({
  controllers: [AdminRoutesController],
  providers: [AdminRoutesService],
})
export class AdminRoutesModule {}