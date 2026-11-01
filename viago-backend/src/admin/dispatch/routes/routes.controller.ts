import { Controller } from '@nestjs/common';
import { AdminRoutesService } from './routes.service';

@Controller('admin/dispatch/routes')
export class AdminRoutesController {
  constructor(private readonly service: AdminRoutesService) {}
}