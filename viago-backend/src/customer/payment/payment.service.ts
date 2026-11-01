import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerPaymentService {
  constructor(private readonly prisma: PrismaService) {}
}