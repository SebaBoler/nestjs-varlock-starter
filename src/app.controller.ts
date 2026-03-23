import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get('health')
  health(): { status: string; env: string } {
    return {
      status: 'ok',
      env: this.configService.getOrThrow<string>('NODE_ENV'),
    };
  }
}
