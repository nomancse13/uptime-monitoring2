import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { QueueWebsiteDto } from './queue-website.dto';

@Injectable()
export class QueueWebsiteService {
  constructor(@InjectQueue('monitrix-website') private queue: Queue) {}

  async alert(data: QueueWebsiteDto) {
    await this.queue.add('website-job', data, { delay: 2000 });
  }
}
