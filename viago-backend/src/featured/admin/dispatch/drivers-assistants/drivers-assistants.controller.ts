import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminDriversAssistantsService } from './drivers-assistants.service';

@Controller('admin/dispatch/drivers-assistants')
export class AdminDriversAssistantsController {
  constructor(private readonly service: AdminDriversAssistantsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Patch(':id/status') setStatus(@Param('id') id: string, @Body('status') status: any) { return this.service.setStatus(id, status); }
}
