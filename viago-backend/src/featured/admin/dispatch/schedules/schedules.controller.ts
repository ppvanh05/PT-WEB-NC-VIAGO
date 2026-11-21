import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminSchedulesService } from './schedules.service';

@Controller('admin/dispatch/schedules')
export class AdminSchedulesController {
  constructor(private readonly service: AdminSchedulesService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Post('generate-range') generateRange(@Body() body: GenerateRangePayload) { return this.service.generateRange(body); }
  @Post('generate-from-routes') generateFromRoutes(@Body('routeIds') routeIds?: string[]) { return this.service.generateFromRouteConfig(routeIds); }
  @Post('sync-route-points') syncRoutePoints(@Body('routeIds') routeIds?: string[]) { return this.service.syncFutureRoutePoints(routeIds); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Patch(':id/status') setStatus(@Param('id') id: string, @Body('status') status: string) { return this.service.setStatus(id, status); }
}

interface GenerateRangePayload {
  startDate: string;
  endDate: string;
  tripsPerDay?: number;
  departureTimes?: string[];
  routeIds?: string[];
}
