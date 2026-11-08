import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AdminPromotionsService } from './promotions.service';
import { ContentAdminGuard } from '../content-access.module';
import {
  CreatePromotionDto,
  ListPromotionsDto,
  PromotionActorDto,
  PromotionPaginationDto,
  PromotionStatusDto,
  UpdatePromotionDto,
} from './promotions.dto';

@Controller('admin/promotions')
@UseGuards(ContentAdminGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class AdminPromotionsController {
  constructor(private readonly service: AdminPromotionsService) {}

  @Get()
  findAll(@Query() query: ListPromotionsDto) {
    return this.service.findAll(query);
  }

  @Get('statistics')
  statistics() {
    return this.service.statistics();
  }

  @Get('options')
  options() {
    return this.service.options();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/statistics')
  promotionStatistics(@Param('id') id: string) {
    return this.service.promotionStatistics(id);
  }

  @Get(':id/usages')
  usages(@Param('id') id: string, @Query() query: PromotionPaginationDto) {
    return this.service.usages(id, query);
  }

  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: PromotionStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() dto: PromotionActorDto) {
    return this.service.updateStatus(id, {
      maNhanVien: dto.maNhanVien,
      status: 'locked',
    });
  }
}
