import { Controller } from '@nestjs/common';
import { AdminEmployeesService } from './employees.service';

@Controller('admin/employees')
export class AdminEmployeesController {
  constructor(private readonly service: AdminEmployeesService) {}
}