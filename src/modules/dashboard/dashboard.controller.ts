import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('summary')
  @ApiOperation({
    summary: 'Live operational snapshot; UTC today/month metrics',
  })
  summary() {
    return this.service.getDashboardSummary();
  }
  @Get('requests-by-status')
  requestsByStatus(@Query() query: DashboardQueryDto) {
    return this.service.getRequestsByStatus(query);
  }
  @Get('requests-by-category')
  requestsByCategory(@Query() query: DashboardQueryDto) {
    return this.service.getRequestsByCategory(query);
  }
  @Get('technician-workload')
  technicianWorkload(@Query() query: DashboardQueryDto) {
    return this.service.getTechnicianWorkload(query);
  }
  @Get('monthly-cost')
  monthlyCost(@Query() query: DashboardQueryDto) {
    return this.service.getMaintenanceCostSummary(query);
  }
  @Get('average-resolution-time')
  averageResolutionTime(@Query() query: DashboardQueryDto) {
    return this.service.getAverageResolutionTime(query);
  }
  @Get('feedback-summary')
  feedbackSummary(@Query() query: DashboardQueryDto) {
    return this.service.getFeedbackSummary(query);
  }
  @Get('low-stock-parts')
  lowStockParts() {
    return this.service.getLowStockParts();
  }
}
