import { InfluxDbGateway } from './influxdb-gateway';

export class power_usage {
  dbConn: InfluxDbGateway;
  measurement: string;
  constructor(dbConn: InfluxDbGateway) {
    this.dbConn = dbConn;
    this.measurement = 'power_usage';
  }

  //   read points
  readPoints(callBack) {
    const reader = this.dbConn.query(this.measurement);

    reader
      .then(function (data) {
        const dataPoints = data.results[0].series[0].values;
        const dataColumns = data.results[0].series[0].columns;

        callBack(dataPoints, dataColumns);
      })
      .catch(console.error);
  }

  // write point
  writePoint(pointData, callBack) {
    this.dbConn
      .write(this.measurement)
      .tag({
        customer_id: pointData['customer_id'],
      })
      .field({
        KWh: pointData['KWh'],
      })
      .then(callBack('Success.'))
      .catch(console.error);
  }
}
