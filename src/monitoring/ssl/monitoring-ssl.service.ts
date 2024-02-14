import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Influx from 'influxdb-nodejs';
import * as request from 'request';
import { SubscriberUserEntity } from 'src/monitoring-auth/auth/user/entity/user.entity';
import { BaseRepository } from 'typeorm-transactional-cls-hooked';
import { SSLEntity } from './entity/ssl.entity';

@Injectable()
export class MonitoringSslService {
  constructor(
    @InjectRepository(SSLEntity)
    private readonly sslRepository: BaseRepository<SSLEntity>,
    @InjectRepository(SubscriberUserEntity)
    private readonly subscriberUserRepository: BaseRepository<SubscriberUserEntity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ssl checking
  async checkSsl(url: string) {
    const sslData = await this.sslRepository.findOne({
      where: { url: url },
    });
    let userData: any;
    let teamData: any;
    if (!sslData) {
      throw new BadRequestException(`ssl url not matched!`);
    } else {
      userData = await this.subscriberUserRepository.findOne({
        where: { id: sslData.userId },
      });
      teamData = await this.subscriberUserRepository.findOne({
        where: { id: userData?.parentId },
      });
    }

    return {
      sslData: sslData,
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

  // @Cron(CronExpression.EVERY_30_MINUTES)
  async checkAllSSL() {
    const serverId = await this.configService.get('SERVER_ID');

    const ssl = await this.sslRepository.find({
      where: { locationId: serverId },
    });

    const chunkSize = 100;

    for (let i = 0; i < ssl.length; i += chunkSize) {
      const chunk = ssl.slice(i, i + chunkSize);

      chunk.map(async (e) => {
        await this.getPeerCertificate(e.uniqueId);
      });
    }
  }

  // async getPeerCertificate(url: string): Promise<any> {
  async getPeerCertificate(uniqueId: string): Promise<any> {
    const sslData = await this.sslRepository.findOne({
      where: { uniqueId: uniqueId },
    });

    let expireDays;

    const sslInfo = await new Promise((resolve, reject) => {
      request({
        url: sslData.url,
      })
        .on('error', function (err) {
          reject(err);
        })
        .on('response', async function (res) {
          const peerCertificate = res.socket.getPeerCertificate();
          const authorized = res.socket.authorized;
          const authorizationError = res.socket.authorizationError;
          const statusMsg = res.statusMessage;
          const status = res.status;

          const currentDate = new Date();

          const validUntil = new Date(peerCertificate.valid_to);

          const expireTime = validUntil.getTime() - currentDate.getTime();

          expireDays = Math.ceil(expireTime / (1000 * 3600 * 24));

          const data = {
            subject: peerCertificate.subject,
            issuer: peerCertificate.issuer,
            subjectaltname: peerCertificate.subjectaltname,
            infoAccess: peerCertificate.infoAccess,
            bits: peerCertificate.bits,
            valid_from: peerCertificate.valid_from,
            valid_to: peerCertificate.valid_to,
            fingerprint: peerCertificate.fingerprint,
            fingerprint256: peerCertificate.fingerprint256,
            url: sslData.url,
            authorized,
            authorizationError,
            statusMsg,
            message: [
              'Connection established',
              Math.sign(expireDays) === -1
                ? `Certificate expired!`
                : `Certificate expires in ${expireDays} days`,
            ],
          };
          resolve(data);
        });
    });

    if (sslInfo['valid_to'] != undefined) {
      const updateData = {
        validUntil: new Date(sslInfo['valid_to']).getTime(),
        expiringDays: expireDays,
      };

      if (updateData) {
        await this.sslRepository.update({ uniqueId: uniqueId }, updateData);
      }
    }
    await this.saveToInflux(sslInfo);
    return sslInfo;
  }

  // save to influx

  async saveToInflux(monitoringData: any) {
    const client = await this.getClient();

    const fieldSchema = {
      // subject: 's',
      // issuer: 's',
      // subjectaltname: 's',
      // infoAccess: 's',
      bits: 'i',
      valid_from: 's',
      valid_to: 's',
      fingerprint: 's',
      fingerprint256: 's',
      authorized: 'b',
      authorizationError: 's',
      statusMsg: 's',
      url: 's',
      message: 's',
    };
    const tagSchema = {
      spdy: ['speedy', 'fast', 'slow'],
      method: '*',
      type: ['1', '2', '3', '4', '5'],
    };
    client.schema('ssl-monitor', fieldSchema, tagSchema, {
      // default is false
      stripUnknown: true,
    });
    client
      .write('ssl-monitor')
      .tag({
        spdy: 'fast',
        method: 'GET',
        type: '2',
      })
      .field({
        // subject: monitoringData.subject,
        // issuer: monitoringData.issuer,
        // subjectaltname: monitoringData.subjectaltname,
        // infoAccess: monitoringData.infoAccess,
        bits: monitoringData.bits,
        valid_from: monitoringData.valid_from,
        valid_to: monitoringData.valid_to,
        fingerprint: monitoringData.fingerprint,
        fingerprint256: monitoringData.fingerprint256,
        authorized: monitoringData.authorized,
        authorizationError: monitoringData.authorizationError,
        statusMsg: monitoringData.statusMsg,
        url: monitoringData.url,
        message: monitoringData.message,
      })
      .then(() => console.info('write point success'))
      .catch(console.error);

    return 1;
  }

  // get ssl info from influx db

  async getQuery(url: string) {
    console.log('url', url);

    const client = await this.getClient();

    const data = await client
      .query('ssl-monitor')
      .where('method', ['GET', 'POST'])
      // .where('status', 200)
      .where('url', url)
      .then()
      .catch(console.error);

    return data?.results[0].series && data?.results[0].series.length > 0
      ? data?.results[0]?.series[0]
      : {};
  }
}
