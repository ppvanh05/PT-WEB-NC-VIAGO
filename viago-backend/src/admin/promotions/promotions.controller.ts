import { Controller } from '@nestjs/common';
import { AdminPromotionsService } from './promotions.service';

@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly service: AdminPromotionsService) {}
}