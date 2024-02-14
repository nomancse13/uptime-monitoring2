export class InfluxDbGateway {
  [x: string]: any;
  dbConn() {
    const dbHost = '127.0.0.1';
    const dbPort = '8086';
    const dbUser = 'influxUser';
    const dbPass = 'influxUser';
    const dbName = 'monitrix';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Influx = require('influxdb-nodejs');

    const conString =
      'http://' +
      dbUser +
      ':' +
      dbPass +
      '@' +
      dbHost +
      ':' +
      dbPort +
      '/' +
      dbName;

    const influxDbClient = new Influx(conString);

    return influxDbClient;
  }
}
