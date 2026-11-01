import { Controller } from '@nestjs/common';
import { AdminVehiclesService } from './vehicles.service';

@Controller('admin/dispatch/vehicles')
export class AdminVehiclesController {
  constructor(private readonly service: AdminVehiclesService) {}
}