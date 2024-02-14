import { Injectable } from '@nestjs/common';
import isUp from 'isup';

@Injectable()
export class IsUpOrDownService {
  constructor() {}
  /**
   * create virtual fair
   */
  async getInfoAboutSite(link: string) {
    console.log(await isUp(link));
  }

  // async function millisToMinutesAndSeconds(millis) {
  //   var minutes = Math.floor(millis / 60000);
  //   var seconds = ((millis % 60000) / 1000).toFixed(0);
  //   return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  // }
}
