import { MiddlewareConsumer, Module } from '@nestjs/common';
import { NestModule } from '@nestjs/common/interfaces/modules';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule/dist';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IsUpOrDownModule } from './isup-or-down/isup-or-down.module';
import { validate } from './monitoring-auth/config/env.validation';
import {
  TypeOrmConfigModule,
  TypeOrmConfigService,
} from './monitoring-auth/config/typeorm-config';
import { AppLoggerModule } from './monitoring-auth/logger/app-logger.module';
import { LoggerMiddleware } from './monitoring-auth/middleware';
import { MonitoringApiModule } from './monitoring/monitoring-api.module';
import { QueueMailConsumer } from './queue-mail/queue-mail.consumer';
import { QueueMailModule } from './queue-mail/queue-mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ validate: validate, isGlobal: true }),
    // Typeorm initialize
    TypeOrmModule.forRootAsync({
      imports: [TypeOrmConfigModule, ScheduleModule.forRoot()],
      inject: [ConfigService],
      // Use useFactory, useClass, or useExisting
      // to configure the ConnectionOptions.
      name: TypeOrmConfigService.connectionName,
      useExisting: TypeOrmConfigService,
      // connectionFactory receives the configured ConnectionOptions
      // and returns a Promise<Connection>.
      // dataSourceFactory: async (options) => {
      //   const connection = await createConnection(options);
      //   return connection;
      // },
    }),
    RouterModule.register([
      //module prefix for admin
      {
        path: 'monitoring',
        module: MonitoringApiModule,
      },
    ]),
    IsUpOrDownModule,
    MonitoringApiModule,
    AppLoggerModule,
    QueueMailModule,
    // MonitoringAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, QueueMailConsumer],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
