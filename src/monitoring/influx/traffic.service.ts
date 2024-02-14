import { Injectable } from '@nestjs/common';
import * as Influx from 'influxdb-nodejs';
import { InfluxDbService } from 'nest-influxdb';

@Injectable()
export class TrafficService {
  constructor(private readonly influx_service: InfluxDbService) {}

  async getLastDay() {
    const client = new Influx(
      'http://monitrixinflux:influx[2023]!@dev.monitrix.online:8086/monitrix_db?auth=basic',
    );

    const fieldSchema = {
      status: 'i',
      resTime: 'i',
      presentTime: 'i',
      loadTime: 's',
      data: 's',
      url: 's',
    };
    const tagSchema = {
      spdy: ['speedy', 'fast', 'slow'],
      method: '*',
      type: ['1', '2', '3', '4', '5'],
    };
    client.schema('website-ma', fieldSchema, {
      // default is false
      stripUnknown: true,
    });
    client
      .write('website-ma')
      .field({
        status: 200,
        resTime: 2312,
        presentTime: 2312,
        loadTime: '0.239 sec',
        data: 'sfsldjfsdjfosd',
        url: 'https://github.com/vicanso/influxdb-nodejs',
      })
      .then(() => console.info('write point success'))
      .catch(console.error);
  }

  async getQuery() {
    const client = new Influx(
      'http://monitrixinflux:influx[2023]!@dev.monitrix.online:8086/monitrix_db?auth=basic',
    );

    return client
      .query('website-ma')
      .where('method', ['GET', 'POST'])
      .where('status', 200)
      .then()
      .catch(console.error);
  }
}
