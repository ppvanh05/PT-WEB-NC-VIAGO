import { Controller } from '@nestjs/common';
import { AdminNewsService } from './news.service';

@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly service: AdminNewsService) {}
}