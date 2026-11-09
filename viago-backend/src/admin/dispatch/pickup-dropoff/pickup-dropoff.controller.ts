import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminPickupDropoffService } from './pickup-dropoff.service';
import type { PickupDropoffPayload } from './pickup-dropoff.service';

@Controller('admin/dispatch/pickup-dropoff')
export class AdminPickupDropoffController {
  constructor(private readonly service: AdminPickupDropoffService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() body: PickupDropoffPayload) { return this.service.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: PickupDropoffPayload) { return this.service.update(id, body); }
  @Patch(':id/status') setStatus(@Param('id') id: string, @Body('status') status: 'active' | 'locked') { return this.service.setStatus(id, status); }
}
