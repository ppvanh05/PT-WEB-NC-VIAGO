import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { CustomerNewsService } from './news.service';
import {
  NewsCategoryQueryDto,
  NewsPaginationDto,
  PublicCommentDto,
  PublicNewsQueryDto,
  RelatedNewsQueryDto,
} from './news.dto';
import { NewsInteractionGuard, newsVisitor } from './news-interaction.guard';

@Controller('customer/news')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class CustomerNewsController {
  constructor(private readonly service: CustomerNewsService) {}

  @Get() findAll(@Query() query: PublicNewsQueryDto) {
    return this.service.findAll(query);
  }
  @Get('categories') categories() {
    return this.service.categories();
  }
  @Get('featured') featured(@Query() query: NewsCategoryQueryDto) {
    return this.service.featured(query.category);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Get(':id/related') related(
    @Param('id') id: string,
    @Query() query: RelatedNewsQueryDto,
  ) {
    return this.service.related(id, query.limit);
  }

  @Post(':id/views')
  @HttpCode(200)
  @UseGuards(NewsInteractionGuard)
  view(@Param('id') id: string) {
    return this.service.view(id);
  }

  @Get(':id/comments')
  comments(
    @Param('id') id: string,
    @Query() query: NewsPaginationDto,
    @Req() request: Request,
  ) {
    return this.service.comments(id, query, newsVisitor(request));
  }
  @Post(':id/comments')
  @UseGuards(NewsInteractionGuard)
  createComment(@Param('id') id: string, @Body() dto: PublicCommentDto) {
    return this.service.createComment(id, dto);
  }

  @Get(':id/comments/:commentId/replies')
  replies(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Query() query: NewsPaginationDto,
    @Req() request: Request,
  ) {
    return this.service.comments(id, query, newsVisitor(request), commentId);
  }
  @Post(':id/comments/:commentId/replies')
  @UseGuards(NewsInteractionGuard)
  createReply(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() dto: PublicCommentDto,
  ) {
    return this.service.createComment(id, dto, commentId);
  }

  @Put(':id/comments/:commentId/like')
  @UseGuards(NewsInteractionGuard)
  like(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Req() request: Request,
  ) {
    return this.service.like(id, commentId, newsVisitor(request)!, true);
  }

  @Delete(':id/comments/:commentId/like')
  @UseGuards(NewsInteractionGuard)
  unlike(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Req() request: Request,
  ) {
    return this.service.like(id, commentId, newsVisitor(request)!, false);
  }
}
