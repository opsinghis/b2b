import { Controller, Get, Query, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { KpiResponseDto } from './dto';
import { TenantContext } from '@core/tenants';
import { CanRead, CanManage } from '@core/authorization';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get dashboard KPIs' })
  @ApiResponse({ status: 200, type: KpiResponseDto })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Force refresh cache',
  })
  @CanRead('Contract')
  async getKpis(
    @TenantContext() tenantId: string,
    @Query('refresh') refresh?: boolean,
  ): Promise<KpiResponseDto> {
    return this.dashboardService.getKpis(tenantId, refresh === true);
  }

  @Post('kpis/invalidate')
  @ApiOperation({ summary: 'Invalidate KPIs cache' })
  @ApiResponse({ status: 204, description: 'Cache invalidated' })
  @CanManage('Contract')
  async invalidateCache(@TenantContext() tenantId: string): Promise<void> {
    await this.dashboardService.invalidateKpisCache(tenantId);
  }
}
