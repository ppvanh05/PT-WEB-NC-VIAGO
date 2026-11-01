import { Controller } from '@nestjs/common';
import { CustomerNewsService } from './news.service';

@Controller('customer/news')
export class CustomerNewsController {
  constructor(private readonly service: CustomerNewsService) {}
}