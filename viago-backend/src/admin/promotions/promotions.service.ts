import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminPromotionsService {
  constructor(private readonly prisma: PrismaService) {}
}