import { Injectable } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { TranslateDto } from './dto/translate.dto';

@Injectable()
export class TranslateService {
  constructor(private agentService: AgentService) {}

  async translate(dto: TranslateDto): Promise<{ result: string }> {
    const result = await this.agentService.invoke(dto);
    return { result };
  }

  translateStream(dto: TranslateDto): AsyncGenerator<string> {
    return this.agentService.stream(dto);
  }
}
