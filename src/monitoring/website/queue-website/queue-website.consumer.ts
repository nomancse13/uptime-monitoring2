import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AppLogger } from 'src/monitoring-auth/logger/app-logger.service';
import { MonitoringWebsiteService } from '../monitoring-website.service';
import { QueueWebsiteDto } from './queue-website.dto';

@Processor('monitrix-website')
export class QueueWebsiteConsumer {
  private readonly _logger = new Logger(QueueWebsiteConsumer.name);
  constructor(
    private websiteService: MonitoringWebsiteService,
    private readonly appLogger: AppLogger,
  ) {}

  @OnQueueActive()
  public onActive(job: Job) {
    this._logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job) {
    this._logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any) {
    this._logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }

  @Process('website-job')
  async readOperationJob(job: Job<QueueWebsiteDto>) {
    if (job.data) {
      await this.websiteService
        .alertingData(job.data.checkSite, job.data.monitoringData)
        .then((res) => {
          this.appLogger.log(res);
        })
        .catch((err) => {
          this.appLogger.log(err);
          return false;
        });
    }
  }
}
