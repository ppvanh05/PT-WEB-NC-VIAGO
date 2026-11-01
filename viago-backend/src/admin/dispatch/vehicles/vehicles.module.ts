import { Module } from '@nestjs/common';
import { AdminVehiclesController } from './vehicles.controller';
import { AdminVehiclesService } from './vehicles.service';

@Module({
  controllers: [AdminVehiclesController],
  providers: [AdminVehiclesService],
})
export class AdminVehiclesModule {}