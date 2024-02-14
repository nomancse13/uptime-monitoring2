import { HttpService } from '@nestjs/axios/dist';
import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common/enums';
import { BadRequestException } from '@nestjs/common/exceptions';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthCheckService } from '@nestjs/terminus';
import { InjectRepository } from '@nestjs/typeorm';
import * as Influx from 'influxdb-nodejs';
import { AlertTypeEnum } from 'src/monitoring-auth/auth/common/enum/alert-type.enum';
import { WebsiteAlertStatus } from 'src/monitoring-auth/auth/common/enum/website-alert-status.enum';
import { SubscriberUserEntity } from 'src/monitoring-auth/auth/user/entity/user.entity';
import { QueueMailDto } from 'src/queue-mail/queue-mail.dto';
import { QueueMailService } from 'src/queue-mail/queue-mail.service';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { IncidentEntity } from '../incident/entity/incident.entity';
import { WebsiteResolveEntity } from '../incident/entity/website-resolve.entity';
import { WebsiteDataEntryEntity } from './entity/data-entry.entity';
import { ServerEntity } from './entity/server.entity';
import { WebsiteAlertEntity } from './entity/website-alert.entity';
import { WebsiteEntity } from './entity/website.entity';
import { QueueWebsiteDto } from './queue-website/queue-website.dto';
import { QueueWebsiteService } from './queue-website/queue-website.service';

@Injectable()
export class MonitoringWebsiteService {
  constructor(
    @InjectRepository(WebsiteEntity)
    private readonly websiteRepository: BaseRepository<WebsiteEntity>,
    @InjectRepository(WebsiteAlertEntity)
    private readonly websiteAlertRepository: BaseRepository<WebsiteAlertEntity>,
    @InjectRepository(SubscriberUserEntity)
    private readonly subscriberUserRepository: BaseRepository<SubscriberUserEntity>,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: BaseRepository<IncidentEntity>,
    @InjectRepository(WebsiteResolveEntity)
    private readonly resolveRepository: BaseRepository<WebsiteResolveEntity>,
    @InjectRepository(WebsiteDataEntryEntity)
    private readonly dataEntryRepository: BaseRepository<WebsiteDataEntryEntity>,
    @InjectRepository(ServerEntity)
    private readonly serverRepository: BaseRepository<ServerEntity>,
    private health: HealthCheckService,
    private httpService: HttpService,
    private queueMailService: QueueMailService,
    private readonly configService: ConfigService,
    private readonly queueWebsiteService: QueueWebsiteService,
  ) {}

  // website checking
  async checkWebsite(url: string) {
    const websiteData = await this.websiteRepository.findOne({
      where: { websiteUrl: url },
    });
    let userData: any;
    let teamData: any;
    if (!websiteData) {
      throw new BadRequestException(`website url not matched!`);
    } else {
      userData = await this.subscriberUserRepository.findOne({
        where: { id: websiteData.userId },
      });
      teamData = await this.subscriberUserRepository.findOne({
        where: { id: userData?.parentId },
      });
    }

    return {
      websiteData: websiteData,
      userData: userData ? userData.email : 'noman@m4yours.com',
      teamData: teamData ? teamData.email : 'noman@m4yours.com',
    };
  }
  // connection with influx
  async getClient() {
    const client = new Influx(
      'http://monitrixinflux:influx[2023]!@dev.monitrix.online:8086/monitrix_db?auth=basic',
    );
    return client;
  }
  // get body
  async saveBody(data: any) {
    const saveData = await this.dataEntryRepository.save(data);
    return saveData;
  }

  // @Cron(CronExpression.EVERY_30_MINUTES)
  async checkAllSite() {
    const serverId = await this.configService.get('SERVER_ID');

    const website = await this.websiteRepository.find({
      where: { locationId: serverId },
    });

    const chunkSize = 100;

    for (let i = 0; i < website.length; i += chunkSize) {
      const chunk = website.slice(i, i + chunkSize);

      chunk.map(async (e) => {
        await this.monitoringSite(e.uniqueId);
      });
    }
  }

  // ------------ MONITORING API -----------

  async monitoringSite(uniqueId: any) {
    const websiteData = await this.websiteRepository.findOne({
      where: { uniqueId: uniqueId },
    });

    const presentTime = Date.now();

    const checkSite = await this.checkWebsite(websiteData.websiteUrl);

    let data: any;
    try {
      data = await this.health.check([
        () =>
          this.httpService
            .get(websiteData.websiteUrl)
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
                let loadTimeNum: any;
                let loadTime: any;
                let sec: any;
                let message: any;
                if (status) {
                  responseTime = Date.now();
                  message = `No incidents recorded for ${url} according to current alert settings`;
                  loadTimeNum = (responseTime - presentTime) / 1000;
                  loadTime = `${(responseTime - presentTime) / 1000} sec`;
                  sec = ((loadTimeNum % 60000) / 1000).toFixed(0);
                }

                return {
                  otherService: {
                    status,
                    url,
                    reqData,
                    responseTime,
                    presentTime,
                    loadTime,
                    sec,
                    data,
                    message,
                  },
                };
              },
            )
            .catch(async ({ code, config: { url } }) => {
              const updatedData = {
                alertStatus: WebsiteAlertStatus.Down,
                lastCheckTime: new Date(),
                lastLoadTime: null,
              };

              if (updatedData) {
                await this.websiteRepository.update(
                  { id: checkSite?.websiteData.id },
                  updatedData,
                );
              }

              throw new HealthCheckError('Other service check failed', {
                otherService: {
                  status: HttpStatus.FORBIDDEN,
                  code,
                  url,
                },
              });
            }),
      ]);
    } catch (e) {
      console.log(e);
    }

    const monitoringData = data?.details?.otherService;

    const webData = new QueueWebsiteDto();

    webData.checkSite = checkSite;
    // webData.url = websiteData.websiteUrl;
    webData.monitoringData = monitoringData;

    await this.queueWebsiteService.alert(webData);

    // await this.alertingData(websiteData.websiteUrl, checkSite, monitoringData);

    return monitoringData;
  }

  // ALL TIME MONITORING SITE

  // async allTimeMonitoringSite(url: string) {
  //   const serverId = await this.configService.get('SERVER_ID');

  //   const serverInfo = await this.serverRepository.findOne({
  //     where: { id: serverId, status: StatusField.ACTIVE },
  //   });

  //   const presentTime = Date.now();

  //   const checkSite = await this.checkWebsite(url);

  //   const data = await this.health.check([
  //     () =>
  //       this.httpService
  //         .get(url)
  //         .toPromise()
  //         .then(
  //           ({
  //             statusText,
  //             config: { url },
  //             data,
  //             request,
  //             headers,
  //             // response,
  //           }) => {
  //             // console.log(statusText, 'sss');

  //             const reqData = request.host;
  //             const status: any =
  //               statusText === 'OK' ? HttpStatus.OK : HttpStatus.FORBIDDEN;

  //             let responseTime: any;
  //             let message: any;
  //             let loadTimeNum: any;
  //             let loadTime: any;
  //             let sec: any;
  //             if (status) {
  //               responseTime = Date.now();
  //               message = `No incidents recorded for ${url} according to current alert settings`;
  //               loadTimeNum = (responseTime - presentTime) / 1000;
  //               loadTime = `${(responseTime - presentTime) / 1000} sec`;
  //               sec = ((loadTimeNum % 60000) / 1000).toFixed(0);
  //             }

  //             return {
  //               otherService: {
  //                 status,
  //                 url,
  //                 reqData,
  //                 responseTime,
  //                 presentTime,
  //                 loadTime,
  //                 sec,
  //                 data,
  //                 message,
  //               },
  //             };
  //           },
  //         )
  //         .catch(async ({ code, config: { url } }) => {
  //           const updatedData = {
  //             alertStatus: WebsiteAlertStatus.Down,
  //             lastCheckTime: new Date(),
  //             lastLoadTime: null,
  //           };

  //           if (updatedData) {
  //             await this.websiteRepository.update(
  //               { id: checkSite?.websiteData.id },
  //               updatedData,
  //             );
  //           }
  //           throw new HealthCheckError('Other service check failed', {
  //             otherService: {
  //               status: HttpStatus.FORBIDDEN,
  //               code,
  //               url,
  //             },
  //           });
  //         }),
  //   ]);

  //   const monitoringData = data?.details?.otherService;

  //   const insertData = await this.saveToInflux(monitoringData);
  //   if (insertData == 1) {
  //     await this.saveBody({
  //       websiteId: checkSite?.websiteData?.id,
  //       bodyData: monitoringData.data,
  //     });
  //     await this.alertingData(url, checkSite, monitoringData);

  //     return `success!`;
  //   }
  // }

  // save to influx
  async saveToInflux(monitoringData: any, alertStatus: any, messageData: any) {
    const client = await this.getClient();

    const fieldSchema = {
      status: 'i',
      resTime: 'i',
      presentTime: 'i',
      loadTime: 's',
      url: 's',
      message: 's',
      alert: 'b',
    };
    const tagSchema = {
      spdy: ['speedy', 'fast', 'slow'],
      method: '*',
      type: ['1', '2', '3', '4', '5'],
    };
    client.schema('website-monitor', fieldSchema, tagSchema, {
      // default is false
      stripUnknown: true,
    });
    client
      .write('website-monitor')
      .tag({
        spdy: 'fast',
        method: 'GET',
        type: '2',
      })
      .field({
        status: monitoringData.status,
        resTime: monitoringData.responseTime,
        presentTime: monitoringData.presentTime,
        loadTime: monitoringData.loadTime,
        url: monitoringData.url,
        message:
          alertStatus == WebsiteAlertStatus.Alert
            ? messageData
            : monitoringData.message,
        alert: alertStatus == WebsiteAlertStatus.Alert ? true : false,
      })
      .then(() => console.info('write point success'))
      .catch(console.error);

    return 1;
  }

  // get website info from influx db

  async getQuery(url: string) {
    const client = await this.getClient();

    const data = await client
      .query('website-monitor')
      .where('method', ['GET', 'POST'])
      .where('status', 200)
      .where('url', url)
      .then()
      .catch(console.error);

    return data?.results[0].series && data?.results[0].series.length > 0
      ? data?.results[0]?.series[0]
      : {};
  }

  // get data entry
  async getDataEntry(id: number) {
    const data = await this.dataEntryRepository.findOne({
      where: { websiteId: id },
    });
    return data;
  }

  // get monitoring full data

  async alertingData(checkSite: any, monitoringData: any) {
    try {
      // fetching alert data
      const websiteAlertData = await this.websiteAlertRepository.find({
        where: { websiteId: checkSite?.websiteData.id },
      });

      // get body section data
      const getBodyData = await this.getDataEntry(checkSite?.websiteData.id);

      const loadTimeData = [];
      const alertData = [];

      const messageData = [];

      if (monitoringData) {
        for (let j = 0; j < websiteAlertData.length; j++) {
          if (websiteAlertData[j].type == AlertTypeEnum.LOAD_TIME) {
            loadTimeData.push(monitoringData.loadTime);
            if (monitoringData.loadTime > websiteAlertData[j].comparisonLimit) {
              const saveData = {
                comparison: 'Greater than',
                type: AlertTypeEnum.LOAD_TIME,
                comparisonLimit: websiteAlertData[j].comparisonLimit,
                message: `${monitoringData.loadTime} is greater than ${websiteAlertData[j].comparisonLimit}`,
                websiteId: getBodyData?.websiteId,
                isOccured: 1,
              };

              await this.incidentRepository.save(saveData);
              alertData.push(1);
              messageData.push(saveData.message);
            } else {
              const saveData = {
                type: AlertTypeEnum.LOAD_TIME,
                websiteId: getBodyData?.websiteId,
                isOccured: 0,
              };

              await this.incidentRepository.save(saveData);
              alertData.push(0);
            }
          } else if (websiteAlertData[j].type == AlertTypeEnum.RESPONSE_CODE) {
            if (monitoringData.status != websiteAlertData[j].comparisonLimit) {
              const saveData = {
                comparison: 'Not equal to',
                type: AlertTypeEnum.RESPONSE_CODE,
                comparisonLimit: websiteAlertData[j].comparisonLimit,
                websiteId: getBodyData?.websiteId,
                isOccured: 1,
                message: `${monitoringData.status} is not equal ${websiteAlertData[j].comparisonLimit}`,
              };
              await this.incidentRepository.save(saveData);
              alertData.push(2);
              messageData.push(saveData.message);
            } else {
              const saveData = {
                type: AlertTypeEnum.RESPONSE_CODE,
                websiteId: getBodyData?.websiteId,
                isOccured: 0,
              };

              await this.incidentRepository.save(saveData);
              alertData.push(0);
            }
          } else if (
            websiteAlertData[j].type == AlertTypeEnum.SEARCH_STRING_MISSING
          ) {
            const stringCheck = monitoringData?.data?.includes(
              `${checkSite?.websiteData.searchString}`,
            );

            if (stringCheck == true) {
              alertData.push(0);

              const saveData = {
                type: AlertTypeEnum.SEARCH_STRING_MISSING,
                websiteId: checkSite?.websiteData.id,
                isOccured: 0,
              };

              await this.incidentRepository.save(saveData);
            } else {
              const saveData = {
                comparison: 'Not equal to',
                type: AlertTypeEnum.SEARCH_STRING_MISSING,
                comparisonLimit: checkSite?.websiteData.searchString,
                websiteId: checkSite?.websiteData.id,
                isOccured: 1,
                message: `search string is not equal ${checkSite?.websiteData.searchString}`,
              };
              await this.incidentRepository.save(saveData);
              alertData.push(3);
              messageData.push(saveData.message);
            }
          }
        }
      }

      const loadTimeIncident = [];
      const responseCodeIncident = [];
      const searchStringIncident = [];
      // website load time data

      const loadTimeAlert = await this.latestLoadTime(
        checkSite?.websiteData?.id,
      );

      await Promise.all(
        loadTimeAlert.map((e) => {
          loadTimeIncident.push(e.isOccured);
        }),
      );

      // website response code data

      const responseCodeAlert = await this.lastResponseCode(
        checkSite?.websiteData?.id,
      );

      await Promise.all(
        responseCodeAlert.map((e) => {
          responseCodeIncident.push(e.isOccured);
        }),
      );

      // website search string data

      const searchStringAlert = await this.latestsearchString(
        checkSite?.websiteData?.id,
      );

      await Promise.all(
        searchStringAlert.map((e) => {
          searchStringIncident.push(e.isOccured);
        }),
      );

      let countLoad = 0;
      let countResponse = 0;
      let countString = 0;

      // load time incident
      await Promise.all(
        loadTimeIncident.reverse().map(async (e) => {
          if (e == 0) {
            countLoad = 0;
          } else {
            countLoad += 1;
          }
        }),
      );

      // responseCode incident
      await Promise.all(
        responseCodeIncident.reverse().map(async (e) => {
          if (e == 0) {
            countResponse = 0;
          } else {
            countResponse += 1;
          }
        }),
      );

      // count string incident
      await Promise.all(
        searchStringIncident.reverse().map(async (e) => {
          if (e == 0) {
            countString = 0;
          } else {
            countString += 1;
          }
        }),
      );

      // console.log(loadTimeIncident, 'loadTimeIncident');
      // console.log(responseCodeIncident, 'responseCodeIncident');
      // console.log(searchStringIncident, 'searchStringIncident');
      // console.log(countLoad, 'loadd');
      // console.log(countResponse, 'countResponse');
      // console.log(countString, 'countString');

      // alert status update
      let alertStatus: any;

      if (
        alertData.includes(1) ||
        alertData.includes(2) ||
        alertData.includes(3)
      ) {
        alertStatus = WebsiteAlertStatus.Alert;
      } else {
        alertStatus = WebsiteAlertStatus.UP;
      }

      const updatedData = {
        alertStatus: alertStatus,
        lastCheckTime: new Date(),
        lastLoadTime: loadTimeData[0],
      };
      // update main website alert status
      if (updatedData) {
        await this.websiteRepository.update(
          { id: checkSite?.websiteData.id },
          updatedData,
        );
      }

      // save data to influx
      await this.saveToInflux(monitoringData, alertStatus, messageData);

      // load data info from resolve

      const loadDataResolve = await this.resolveRepository.findOne({
        where: {
          type: AlertTypeEnum.LOAD_TIME,
          websiteId: checkSite?.websiteData.id,
        },
      });
      // respnse code data info from resolve

      const responseDataResolve = await this.resolveRepository.findOne({
        where: {
          type: AlertTypeEnum.RESPONSE_CODE,
          websiteId: checkSite?.websiteData.id,
        },
      });

      // string data from reslove
      const stringDataResolve = await this.resolveRepository.findOne({
        where: {
          type: AlertTypeEnum.SEARCH_STRING_MISSING,
          websiteId: checkSite?.websiteData.id,
        },
      });

      const websiteLoadAlertData = await this.websiteAlertRepository.findOne({
        where: {
          websiteId: checkSite?.websiteData.id,
          type: AlertTypeEnum.LOAD_TIME,
        },
      });
      const websiteRespnseAlertData = await this.websiteAlertRepository.findOne(
        {
          where: {
            websiteId: checkSite?.websiteData.id,
            type: AlertTypeEnum.RESPONSE_CODE,
          },
        },
      );

      const websiteStringAlertData = await this.websiteAlertRepository.findOne({
        where: {
          websiteId: checkSite?.websiteData.id,
          type: AlertTypeEnum.SEARCH_STRING_MISSING,
        },
      });

      // load mail
      if (countLoad >= checkSite?.websiteData.occurrences && !loadDataResolve) {
        const saveData = {
          comparison: 'Not equal to',
          type: AlertTypeEnum.LOAD_TIME,
          comparisonLimit: websiteLoadAlertData.comparisonLimit,
          websiteId: getBodyData?.websiteId,
          resloveStatus: 1,
          message: `resolve status is not equal ${websiteLoadAlertData.comparisonLimit}`,
        };
        // save to resolve table
        await this.resolveRepository.save(saveData);

        // email sent

        const mailDataToUser = new QueueMailDto();

        mailDataToUser.toMail = checkSite?.userData;
        mailDataToUser.subject = `Monitrix: Load Incident Message`;
        mailDataToUser.bodyHTML = 'Load Incident occured';

        const mailDataToTeam = new QueueMailDto();

        mailDataToTeam.toMail = checkSite?.teamData;
        mailDataToTeam.subject = `Monitrix: Load Incident Message`;
        mailDataToTeam.bodyHTML = 'Load Incident occured';

        await this.queueMailService.sendMail(mailDataToUser);
        await this.queueMailService.sendMail(mailDataToTeam);

        const updatedData = {
          isOccured: 0,
        };

        await this.incidentRepository.update(
          {
            websiteId: checkSite?.websiteData?.id,
            type: AlertTypeEnum.LOAD_TIME,
          },
          updatedData,
        );
      } else if (loadTimeIncident[0] == 0) {
        await this.resolveRepository.delete({
          websiteId: checkSite?.websiteData?.id,
          type: AlertTypeEnum.LOAD_TIME,
          resloveStatus: 1,
        });
      }

      // // response code mail
      if (
        countResponse >= checkSite?.websiteData.occurrences &&
        !responseDataResolve
      ) {
        const saveData = {
          comparison: 'Not equal to',
          type: AlertTypeEnum.RESPONSE_CODE,
          comparisonLimit: websiteRespnseAlertData.comparisonLimit,
          websiteId: getBodyData?.websiteId,
          resloveStatus: 1,
          message: `resolve status is not equal ${websiteRespnseAlertData.comparisonLimit}`,
        };
        // save to resolve table
        await this.resolveRepository.save(saveData);

        // email sent

        const mailDataToUser = new QueueMailDto();

        mailDataToUser.toMail = checkSite?.userData;
        mailDataToUser.subject = `Monitrix: Response Incident Message`;
        mailDataToUser.bodyHTML = 'Response Incident occured';

        const mailDataToTeam = new QueueMailDto();

        mailDataToTeam.toMail = checkSite?.teamData;
        mailDataToTeam.subject = `Monitrix: Response Incident Message`;
        mailDataToTeam.bodyHTML = 'Response Incident occured';

        await this.queueMailService.sendMail(mailDataToUser);
        await this.queueMailService.sendMail(mailDataToTeam);

        const updatedData = {
          isOccured: 0,
        };

        await this.incidentRepository.update(
          {
            websiteId: checkSite?.websiteData?.id,
            type: AlertTypeEnum.RESPONSE_CODE,
          },
          updatedData,
        );
      } else if (responseCodeIncident[0] == 0) {
        await this.resolveRepository.delete({
          websiteId: checkSite?.websiteData?.id,
          type: AlertTypeEnum.RESPONSE_CODE,
          resloveStatus: 1,
        });
      }

      // // string code mail
      if (
        countString >= checkSite?.websiteData.occurrences &&
        !stringDataResolve
      ) {
        const saveData = {
          comparison: 'Not equal to',
          type: AlertTypeEnum.SEARCH_STRING_MISSING,
          comparisonLimit: websiteStringAlertData.comparisonLimit,
          websiteId: getBodyData?.websiteId,
          resloveStatus: 1,
          message: `resolve status is not equal ${websiteStringAlertData.comparisonLimit}`,
        };
        // save to resolve table
        await this.resolveRepository.save(saveData);

        // email sent

        const mailDataToUser = new QueueMailDto();

        mailDataToUser.toMail = checkSite?.userData;
        mailDataToUser.subject = `Monitrix: Search String Incident Message`;
        mailDataToUser.bodyHTML = 'Search String Incident occured';

        const mailDataToTeam = new QueueMailDto();

        mailDataToTeam.toMail = checkSite?.teamData;
        mailDataToTeam.subject = `Monitrix: Search String Incident Message`;
        mailDataToTeam.bodyHTML = 'Search String Incident occured';

        await this.queueMailService.sendMail(mailDataToUser);
        await this.queueMailService.sendMail(mailDataToTeam);

        const updatedData = {
          isOccured: 0,
        };

        await this.incidentRepository.update(
          {
            websiteId: checkSite?.websiteData?.id,
            type: AlertTypeEnum.SEARCH_STRING_MISSING,
          },
          updatedData,
        );
      } else if (searchStringIncident[0] == 0) {
        await this.resolveRepository.delete({
          websiteId: checkSite?.websiteData?.id,
          type: AlertTypeEnum.SEARCH_STRING_MISSING,
          resloveStatus: 1,
        });
      }

      return `success!`;
    } catch (e) {
      return e;
    }
  }

  // latest load time data

  async latestLoadTime(websiteId: number) {
    const websiteInfo = await this.websiteRepository.findOne({
      where: { id: websiteId },
    });
    const data = await this.incidentRepository
      .createQueryBuilder('incident')
      .where(`incident.websiteId = ${websiteId}`)
      .andWhere(`incident.type= '${AlertTypeEnum.LOAD_TIME}'`)
      // .andWhere(`incident.isOccured = 1`)
      .limit(websiteInfo.occurrences)
      .orderBy('incident.id', 'DESC')
      .getMany();

    return data;
  }

  // latest responseCode  data

  async lastResponseCode(websiteId: number) {
    const websiteInfo = await this.websiteRepository.findOne({
      where: { id: websiteId },
    });
    const data = await this.incidentRepository
      .createQueryBuilder('incident')
      .where(`incident.websiteId = ${websiteId}`)
      .andWhere(`incident.type= '${AlertTypeEnum.RESPONSE_CODE}'`)
      // .andWhere(`incident.isOccured = 1`)
      .limit(websiteInfo.occurrences)
      .orderBy('incident.id', 'DESC')
      .getMany();

    return data;
  }

  // latest searchString data

  async latestsearchString(websiteId: number) {
    const websiteInfo = await this.websiteRepository.findOne({
      where: { id: websiteId },
    });
    const data = await this.incidentRepository
      .createQueryBuilder('incident')
      .where(`incident.websiteId = ${websiteId}`)
      .andWhere(`incident.type= '${AlertTypeEnum.SEARCH_STRING_MISSING}'`)
      // .andWhere(`incident.isOccured = 1`)
      .limit(websiteInfo.occurrences)
      .orderBy('incident.id', 'DESC')
      .getMany();

    return data;
  }
}
