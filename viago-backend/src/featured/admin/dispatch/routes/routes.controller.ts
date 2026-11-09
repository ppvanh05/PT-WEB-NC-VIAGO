import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminRoutesService } from './routes.service';
import type { RoutePayload } from './routes.service';

@Controller('admin/dispatch/routes')
export class AdminRoutesController {
  constructor(private readonly service: AdminRoutesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() body: RoutePayload) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: RoutePayload) { return this.service.update(id, body); }
  @Patch(':id/status') setStatus(@Param('id') id: string, @Body('status') status: 'active' | 'locked') { return this.service.setStatus(id, status); }
}
