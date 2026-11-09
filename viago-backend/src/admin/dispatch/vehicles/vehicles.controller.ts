import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminVehiclesService } from './vehicles.service';

@Controller('admin/dispatch/vehicles')
export class AdminVehiclesController {
  constructor(private readonly service: AdminVehiclesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Patch(':id/status') setStatus(@Param('id') id: string, @Body('status') status: any) { return this.service.setStatus(id, status); }
}
