import { Injectable } from '@nestjs/common';
import * as Influx from 'influx';

@Injectable()
export class InfluxService {
  private readonly influx: Influx.InfluxDB;

  constructor() {
    this.influx = new Influx.InfluxDB({
      host: 'localhost:8086',
      username: 'monitrixinflux',
      password: 'influx[2023]!',
      // database: 'monitrix',
      // schema: [
      //   {
      //     measurement: 'noman',
      //     fields: {
      //       value: Influx.FieldType.INTEGER,
      //     },
      //     tags: ['host'],
      //   },
      // ],
    });
  }

  //   write point
  async writePoint(host: string, value: number): Promise<void> {
    await this.influx.writePoints([
      {
        measurement: 'noman',
        tags: {
          host: host,
        },
        fields: {
          value: value,
        },
        timestamp: Date.now(),
      },
    ]);
  }

  //   query
  async mainQuery() {
    const data = await this.influx.getDatabaseNames();
    console.log(data, 'daa');

    return data;
  }
}
