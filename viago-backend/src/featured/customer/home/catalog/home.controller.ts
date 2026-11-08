import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CustomerHomeService } from './home.service';
import {
  HomeLimitDto,
  HomePageDto,
  HomeRoutesDto,
  HomeTripsDto,
  HomeWeatherDto,
} from '../common/home.dto';
import { HomeSessionGuard, homeSession } from '../common/home.guard';
import type { Request } from 'express';
@Controller('customer/home')
@UseGuards(HomeSessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class CustomerHomeController {
  constructor(private readonly home: CustomerHomeService) {}
  @Get() overview() {
    return this.home.overview();
  }
  @Get('options') options() {
    return this.home.options();
  }
  @Get('cities') cities() {
    return this.home.cities();
  }
  @Get('routes') routes(@Query() query: HomeRoutesDto) {
    return this.home.routes(query);
  }
  @Get('news') news(@Query() query: HomeLimitDto) {
    return this.home.latestNews(query.limit);
  }
  @Get('reviews') reviews(@Query() query: HomePageDto) {
    return this.home.reviews(query);
  }
  @Get('destination/weather') weather(@Query() query: HomeWeatherDto) {
    return this.home.weather(query);
  }
  @Get('trips') search(@Query() query: HomeTripsDto, @Req() req: Request) {
    return this.home.search(query, homeSession(req));
  }
  @Get('trips/:id') trip(@Param('id') id: string, @Req() req: Request) {
    return this.home.trip(id, homeSession(req));
  }
  @Get('trips/:id/seats') seats(@Param('id') id: string, @Req() req: Request) {
    return this.home.trip(id, homeSession(req)).then((trip) => ({
      tripId: trip.id,
      data: trip.seatDetails,
      serverTime: new Date().toISOString(),
    }));
  }
}
