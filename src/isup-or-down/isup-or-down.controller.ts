import { HttpService } from '@nestjs/axios/dist';
import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import {
  HealthCheck,
  HealthCheckError,
} from '@nestjs/terminus/dist/health-check';
import { HttpHealthIndicator } from '@nestjs/terminus/dist/health-indicator';
import { IsUpOrDownService } from './isup-or-down.service';

@Controller({
  path: 'is-up-or-down',
  version: '1',
})
export class IsUpOrDownController {
  constructor(
    private readonly isUpOrDownService: IsUpOrDownService,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private httpService: HttpService,
  ) {}

  //   @Get('domain/website/:link')
  //   async getOne(@Param('link') link: string) {
  //     console.log('noman');

  //     const data = await this.IsUpOrDownService.getInfoAboutSite(link);
  //     return data;
  //   }

  @Get('website')
  @HealthCheck()
  async check(@Query('url') url: string) {
    const presentTime = Date.now();
    return this.health.check([
      () =>
        this.httpService
          .get(url)
          .toPromise()
          .then(
            ({
              statusText,
              config: { url },
              data,
              request,
              headers,
              // response,
            }) => {
              const reqData = request.host;

              const status: any =
                statusText === 'OK' ? HttpStatus.OK : HttpStatus.FORBIDDEN;

              let responseTime: any;
              let loadTimeFinal: any;
              let loadTimeNum: any;
              let loadTime: any;
              let sec: any;
              if (status) {
                responseTime = Date.now();
                loadTimeNum = (responseTime - presentTime) / 1000;
                loadTime = `${(responseTime - presentTime) / 1000} sec`;
                loadTimeFinal = loadTimeNum + 20;
                sec = ((loadTimeNum % 60000) / 1000).toFixed(0);
              }

              return {
                'other-service': {
                  status,
                  url,
                  // request,
                  reqData,
                  responseTime,
                  presentTime,
                  loadTime,
                  loadTimeFinal,
                  sec,
                  data,
                },
              };
            },
          )
          .catch(({ code, config: { url } }) => {
            throw new HealthCheckError('Other service check failed', {
              'other-service': {
                status: HttpStatus.FORBIDDEN,
                code,
                url,
              },
            });
          }),
    ]);

    // return data;
    // try {
    //   const domainName = url.split('.');

    //   const data = await this.health.check([
    //     async () => await this.http.pingCheck(domainName[1], url),
    //   ]);
    //   return HttpStatus.OK;
    // } catch (e) {
    //   // console.log(e.details);

    //   throw new HealthCheckError(e, HttpStatus.FORBIDDEN);
    // }

    // if (data && data.status === 'ok') {
    //   return HttpStatus.OK;
    // } else if (data && data.status === 'error') {
    //   throw new HealthCheckError('check-failed', {
    //     'other-service': { status: HttpStatus.FORBIDDEN },
    //   });
    // }

    // const data = this.httpService
    //   .get(url)
    //   .pipe(map((response) => response.data));
    // return data;

    // const data = this.httpService
    //   .get(url)
    //   .pipe(map((response) => response.data));
  }
}
