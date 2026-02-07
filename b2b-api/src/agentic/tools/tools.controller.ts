import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ToolsRegistryService } from './tools-registry.service';
import { ToolResponseDto, ToolsListResponseDto } from './dto';
import { CanRead } from '@core/authorization';

@ApiTags('Agent Tools')
@ApiBearerAuth()
@Controller('agent/tools')
export class ToolsController {
  constructor(private readonly toolsRegistryService: ToolsRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List all available agent tools' })
  @ApiResponse({ status: 200, type: ToolsListResponseDto })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @CanRead('Contract') // Basic permission check - access to tools requires at least read access
  listTools(@Query('category') category?: string): ToolsListResponseDto {
    return this.toolsRegistryService.listTools(category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List available tool categories' })
  @ApiResponse({ status: 200, type: [String] })
  @CanRead('Contract')
  getCategories(): string[] {
    return this.toolsRegistryService.getCategories();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get details of a specific tool' })
  @ApiResponse({ status: 200, type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  @ApiParam({ name: 'name', description: 'Tool name' })
  @CanRead('Contract')
  getTool(@Param('name') name: string): ToolResponseDto | null {
    const tool = this.toolsRegistryService.getTool(name);
    if (!tool) {
      return null;
    }
    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      parameters: tool.parameters,
      permissions: tool.permissions,
      examples: tool.examples,
      handler: tool.handler,
      method: tool.method,
      path: tool.path,
    };
  }
}
