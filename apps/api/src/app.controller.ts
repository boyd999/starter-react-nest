import { Controller, Get } from '@nestjs/common';
import { buildHealthStatus, type HealthStatus } from '@acme/shared';

@Controller()
export class AppController {
  @Get('health')
  health(): HealthStatus {
    return buildHealthStatus();
  }
}
