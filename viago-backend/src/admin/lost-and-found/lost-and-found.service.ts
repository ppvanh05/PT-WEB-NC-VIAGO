import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminLostAndFoundService {
  constructor(private readonly prisma: PrismaService) {}
}