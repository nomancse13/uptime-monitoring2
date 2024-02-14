import { Injectable } from '@nestjs/common';
import * as Influx from 'influx';

@Injectable()
export class InfluxDemoService {
  private readonly influx: Influx.InfluxDB;

  constructor() {
    this.influx = new Influx.InfluxDB({
      host: 'localhost:8086',
      //   port: 8086,
      database: 'monitrix',
      username: 'influxUser',
      password: 'influxUser',
      schema: [
        {
          measurement: 'noman',
          fields: {
            value: Influx.FieldType.INTEGER,
          },
          tags: ['host'],
        },
      ],
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
    const data = await this.influx.query(`select * from noman`);

    return data;
  }
}
