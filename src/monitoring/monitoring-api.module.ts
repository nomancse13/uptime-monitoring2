import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluxDbModule } from 'nest-influxdb';
import { InfluxModuleOptions } from 'nest-influxdb/dist/interfaces';
import { SubscriberUserEntity } from 'src/monitoring-auth/auth/user/entity/user.entity';
import { QueueMailModule } from 'src/queue-mail/queue-mail.module';
import { IncidentEntity } from './incident/entity/incident.entity';
import { WebsiteResolveEntity } from './incident/entity/website-resolve.entity';
import { InfluxDemoService } from './influx/influx-demo.service';
import { InfluxController } from './influx/influx.controller';
import { InfluxService } from './influx/influx.service';
import { TrafficService } from './influx/traffic.service';
import { SSLEntity } from './ssl/entity/ssl.entity';
import { MonitoringSslController } from './ssl/monitoring-ssl.controller';
import { MonitoringSslService } from './ssl/monitoring-ssl.service';
import { WebsiteDataEntryEntity } from './website/entity/data-entry.entity';
import { ServerEntity } from './website/entity/server.entity';
import { WebsiteAlertEntity } from './website/entity/website-alert.entity';
import { WebsiteEntity } from './website/entity/website.entity';
import { MonitoringWebsiteController } from './website/monitoring-website.controller';
import { MonitoringWebsiteService } from './website/monitoring-website.service';
import { QueueWebsiteConsumer } from './website/queue-website/queue-website.consumer';
import { QueueWebsiteService } from './website/queue-website/queue-website.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebsiteEntity,
      IncidentEntity,
      WebsiteAlertEntity,
      SubscriberUserEntity,
      WebsiteDataEntryEntity,
      ServerEntity,
      WebsiteResolveEntity,
      SSLEntity,
    ]),
    InfluxDbModule.forRootAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: async (
        config_servie: ConfigService,
      ): Promise<InfluxModuleOptions> => {
        return {
          host: config_servie.get('INFLUX_HOST'),
          database: config_servie.get('INFLUX_DB'),
          username: config_servie.get('INFLUX_USER'),
          password: config_servie.get('INFLUX_PASS'),
        };
      },
    }),
    TerminusModule,
    HttpModule,
    QueueMailModule,
    BullModule.registerQueueAsync({
      name: 'monitrix-website', // website queue name
    }),
  ],
  providers: [
    MonitoringWebsiteService,
    InfluxService,
    InfluxDemoService,
    TrafficService,
    QueueWebsiteConsumer,
    QueueWebsiteService,
    MonitoringSslService,
  ],
  controllers: [
    MonitoringWebsiteController,
    InfluxController,
    MonitoringSslController,
  ],
  exports: [],
})
export class MonitoringApiModule {}
