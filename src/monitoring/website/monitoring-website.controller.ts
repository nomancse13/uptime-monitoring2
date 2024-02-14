import { Controller } from '@nestjs/common';
import { Get, Param, Query } from '@nestjs/common/decorators';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { MonitoringWebsiteService } from './monitoring-website.service';

@ApiTags('Monitoring|Website')
@Controller({
  //path name
  path: 'website-monitoring',
  //route version
  version: '1',
})
export class MonitoringWebsiteController {
  constructor(
    private readonly monitoringWebsiteService: MonitoringWebsiteService,
  ) {}

  // get monitoring api
  @ApiParam({
    name: 'uniqueId',
    type: String,
    description: 'for update a website required id',
    required: true,
  })
  @Get(':uniqueId')
  @HealthCheck()
  async saveInflux(@Param('uniqueId') uniqueId: any) {
    const data = await this.monitoringWebsiteService.monitoringSite(uniqueId);

    return { message: 'successful', result: data };
  }

  // get from influx

  @ApiOperation({
    summary: 'get data from influx',
    description: 'this route is responsible for get data from influx',
  })
  @Get('monitoring-data')
  async getData(@Query('url') url: string) {
    const result = await this.monitoringWebsiteService.getQuery(url);

    return { message: 'successful', result: result };

    // return { message: 'successful', result: result };
  }
  // get from influx

  // @Get('monitoring')
  // async get(@Query('url') url: string) {
  //   const result = await this.monitoringWebsiteService.alertingData(url);
  //   return { message: 'successful', result: result };
  //   // return { message: 'successful', result: result };
  // }
}
