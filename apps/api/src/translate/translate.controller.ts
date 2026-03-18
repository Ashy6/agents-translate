import {
  Body,
  Controller,
  Post,
  Query,
  Sse,
  MessageEvent,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TranslateDto } from './dto/translate.dto';
import { TranslateService } from './translate.service';

@Controller('translate')
export class TranslateController {
  constructor(private translateService: TranslateService) {}

  @Post()
  async translate(@Body() dto: TranslateDto) {
    return this.translateService.translate(dto);
  }

  @Sse('stream')
  @UsePipes(new ValidationPipe({ transform: true }))
  translateStream(@Query() dto: TranslateDto): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const gen = this.translateService.translateStream(dto);

      (async () => {
        try {
          for await (const chunk of gen) {
            subscriber.next({
              data: JSON.stringify({ token: chunk }),
            } as MessageEvent);
          }
          subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
          subscriber.complete();
        } catch (err) {
          subscriber.next({
            data: JSON.stringify({ error: (err as Error).message }),
          } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }
}
