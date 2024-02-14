import { Controller } from '@nestjs/common';
import { Get, Param, Query } from '@nestjs/common/decorators';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonitoringSslService } from './monitoring-ssl.service';

@ApiTags('Monitoring|SSL')
@Controller({
  //path name
  path: 'ssl-monitoring',
  //route version
  version: '1',
})
export class MonitoringSslController {
  constructor(private readonly monitoringSslService: MonitoringSslService) {}

  // get monitoring api
  @Get(':uniqueId')
  async saveInflux(@Param('uniqueId') uniqueId: any) {
    const data = await this.monitoringSslService.getPeerCertificate(uniqueId);

    return { message: 'successful', result: data };
  }

  // get from influx

  @ApiOperation({
    summary: 'get data from influx',
    description: 'this route is responsible for get data from influx',
  })
  @Get('monitoring-data')
  async getData(@Query('url') url: string) {
    const result = await this.monitoringSslService.getQuery(url);

    return { message: 'successful', result: result };
  }
}
