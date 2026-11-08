import { Injectable } from '@nestjs/common';
import { SiteContentService, GuideContent } from '../../../../shared/site-content.service';

@Injectable()
export class CustomerGuideService {
  constructor(private readonly content: SiteContentService) {}
  async findAll() {
    const [guides, profile] = await Promise.all([this.content.guides(), this.content.profile()]);
    return { data: guides.map(({ id, title, description }) => ({ id, title, description, path: '/customer/huong-dan-mua-ve/' + id })), support: profile.contact };
  }
  async findOne(slug: string) {
    const [guide, profile] = await Promise.all([this.content.page<GuideContent>(slug), this.content.profile()]);
    return { ...guide, id: slug, support: profile.contact, termsPath: '/customer/dieu-khoan' };
  }
}