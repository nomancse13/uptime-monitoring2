import { Controller, Get } from '@nestjs/common';
import { InfluxDemoService } from './influx-demo.service';
import { InfluxService } from './influx.service';
import { TrafficService } from './traffic.service';

@Controller({
  //path name
  path: 'influx',
  //route version
  version: '1',
})
export class InfluxController {
  constructor(
    private readonly influxService: InfluxService,
    private readonly influxDemoService: InfluxDemoService,
    private readonly trafficService: TrafficService,
  ) {}

  //   influx query
  @Get()
  async getData() {
    const result = await this.trafficService.getQuery();

    return { message: 'successful', result: result };
  }

  //   get write point
  @Get('host-point')
  async getDataHost(): Promise<any> {
    const result = await this.influxService.writePoint('localhost:8086', 88);

    return { message: 'successful', result: result };
  }
}
