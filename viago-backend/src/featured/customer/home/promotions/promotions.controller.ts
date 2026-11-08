import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HomePromotionsService } from './promotions.service';
import { HomePageDto } from '../common/home.dto';
import { HomeSessionGuard } from '../common/home.guard';
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
export class HomePromotionsController {
  constructor(private readonly promotions: HomePromotionsService) {}
  @Get('promotions') promotionsList(@Query() query: HomePageDto) {
    return this.promotions.list(query);
  }
  @Get('vouchers') wallet(@Req() req: Request) {
    return this.promotions.wallet(req.headers.authorization);
  }
  @Post('promotions/:code/claim') claim(
    @Param('code') code: string,
    @Req() req: Request,
  ) {
    return this.promotions.claim(code, req.headers.authorization);
  }
  @Get('customer') profile(@Req() req: Request) {
    return this.promotions.profile(req.headers.authorization);
  }
}
