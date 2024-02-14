import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus/dist/terminus.module';
import { IsUpOrDownController } from './isup-or-down.controller';
import { IsUpOrDownService } from './isup-or-down.service';
@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [IsUpOrDownController],
  providers: [IsUpOrDownService],
  exports: [IsUpOrDownService],
})
export class IsUpOrDownModule {}
