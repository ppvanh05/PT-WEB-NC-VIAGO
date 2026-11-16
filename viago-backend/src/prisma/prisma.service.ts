import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const configuredUrl = process.env.DATABASE_URL;
    const datasourceUrl = configuredUrl ? new URL(configuredUrl) : undefined;
    if (datasourceUrl?.port === '6543')
      datasourceUrl.searchParams.set('pgbouncer', 'true');
    super({
      ...(datasourceUrl ? { datasourceUrl: datasourceUrl.toString() } : {}),
      // Remote database connections can take longer than Prisma's 2s default
      // to become available. Keep the transaction execution timeout unchanged.
      transactionOptions: { maxWait: 10000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
