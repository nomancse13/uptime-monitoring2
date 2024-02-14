/**dependencies */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
/**controllers */
import { AuthController } from './auth.controller';
/**services */
import { AuthService } from './auth.service';
/**Authentication strategies */
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueMailModule } from 'src/queue-mail/queue-mail.module';
import { AtStrategy } from './strategy';
import { RtStrategy } from './strategy/rt.strategy';
import { SubscriberUserEntity } from './user/entity/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SubscriberUserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // secret: 'at-secret',
        // // secretOrKey: 'thisisdarknightisontequaltoday.weareawesome',
        // signOptions: {
        //   expiresIn: configService.get<string>('JWT_EXPIRATION'),
        // },
      }),
      inject: [ConfigService],
    }),
    QueueMailModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy, RtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
