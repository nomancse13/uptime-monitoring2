import { StatusField } from '../enum/status.enum';

export interface LogMessageInterface {
  status: StatusField;
  message: string;
  services?: {
    tag?: string;
    value?: string;
    identity?: number;
  };
}
