import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller({
  path: 'is-up-or-down',
})
export class AppController {
  constructor(
    private readonly appService: AppService, // private readonly IsUpOrDownService: IsUpOrDownService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // @Get('domain/website/:link')
  // async getOne(@Param('link') link: string) {
  //   const data = await this.IsUpOrDownService.getInfoAboutSite(link);
  //   return data;
  // }
}
