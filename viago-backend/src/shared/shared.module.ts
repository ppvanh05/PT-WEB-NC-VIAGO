import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SiteContentService } from './site-content.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SiteContentService],
  exports: [SiteContentService],
})
export class SharedModule {}
