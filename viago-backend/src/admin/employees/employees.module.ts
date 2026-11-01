import { Module } from '@nestjs/common';
import { AdminEmployeesController } from './employees.controller';
import { AdminEmployeesService } from './employees.service';

@Module({
  controllers: [AdminEmployeesController],
  providers: [AdminEmployeesService],
})
export class AdminEmployeesModule {}