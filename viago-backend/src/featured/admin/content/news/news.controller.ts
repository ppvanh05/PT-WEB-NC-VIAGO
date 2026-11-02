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
  ValidationPipe,
} from '@nestjs/common';
import { AdminNewsService } from './news.service';
import {
  CreateNewsDto,
  ListNewsCommentsDto,
  ListNewsDto,
  NewsActorDto,
  UpdateNewsCommentStatusDto,
  UpdateNewsDto,
  UpdateNewsStatusDto,
} from './news.dto';

@Controller('admin/news')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class AdminNewsController {
  constructor(private readonly service: AdminNewsService) {}

  @Get()
  findAll(@Query() query: ListNewsDto) {
    return this.service.findAll(query);
  }

  @Get('statistics')
  statistics() {
    return this.service.statistics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateNewsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateNewsStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Get(':id/comments')
  comments(@Param('id') id: string, @Query() query: ListNewsCommentsDto) {
    return this.service.comments(id, query);
  }

  @Patch(':id/comments/:commentId/status')
  updateCommentStatus(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateNewsCommentStatusDto,
  ) {
    return this.service.updateCommentStatus(id, commentId, dto);
  }

  @Delete(':id/comments/:commentId')
  hideComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: NewsActorDto,
  ) {
    return this.service.updateCommentStatus(id, commentId, {
      maNhanVien: dto.maNhanVien,
      trangThai: 'DaAn',
    });
  }
}
