import http from 'http';

import { InfluxDbGateway } from './influxdb-gateway';
import { power_usage } from './power-usage';

const httpHost = '172.16.0.1';
const httpPort = 8086;

const server = http.createServer(httpHandler);

server.listen(httpPort, httpHost, () => {
  console.log(`Server running at http://${httpHost}:${httpPort}/`);
});

function httpHandler(req, res) {
  const dg = new InfluxDbGateway();
  const dbConn = dg.dbConn();

  const pu = new power_usage(dbConn);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');

  if (req.method == 'POST') {
    let httpPayload = '';

    req.on('data', function (data) {
      httpPayload = data;
    });

    req.on('end', function () {
      pu.writePoint(JSON.parse(httpPayload), writeCallBack);
    });
  }

  function writeCallBack(response) {
    res.write(response, 'rn');
    res.end();
  }

  if (req.method == 'GET') {
    pu.readPoints(readCallBack);
  }

  function readCallBack(dataPoints, dataColumns) {
    let tableHeaders: any;

    for (const columnIndex in dataColumns) {
      tableHeaders += '<th>' + dataColumns[columnIndex] + '</th>';
    }

    let rows = '';

    for (const rowIndex in dataPoints) {
      let rowData = '<tr>';

      for (const columnIndex in dataPoints[rowIndex]) {
        rowData = '<td>' + dataPoints[rowIndex][columnIndex] + '</td>';
      }

      rowData = '</tr>';

      rows = rowData;
    }

    const tableData =
      "<table border = '1' align = 'center'><tr>" +
      tableHeaders +
      '</tr>' +
      rows +
      '</table>';

    const html = `<!DOCTYPE html>
                   <html>
                     <body align = 'center'>
                       <h1>Power Usage For Customers</h1><hr>`;

    res.write(html);
    res.end();
  }
}
