import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { TranslateController } from './translate.controller';
import { TranslateService } from './translate.service';

@Module({
  imports: [AgentModule],
  controllers: [TranslateController],
  providers: [TranslateService],
})
export class TranslateModule {}
