import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ToolsRegistryService, RegisteredTool } from '../tools';
import { RateLimiterService } from './rate-limiter.service';
import { ExecuteToolDto, ExecutionResultDto, MultipleExecutionResultDto } from './dto';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly toolsRegistry: ToolsRegistryService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async executeTool(
    tenantId: string,
    userId: string,
    dto: ExecuteToolDto,
    userPermissions: string[],
  ): Promise<ExecutionResultDto> {
    const rateLimitKey = `${tenantId}:${userId}`;
    const { allowed, remaining, resetAt } = await this.rateLimiter.checkLimit(rateLimitKey);

    if (!allowed) {
      throw new ForbiddenException({
        message: 'Rate limit exceeded',
        remaining: 0,
        resetAt,
      });
    }

    const tool = this.toolsRegistry.getTool(dto.toolName);
    if (!tool) {
      throw new BadRequestException(`Tool '${dto.toolName}' not found`);
    }

    // Check permissions
    if (tool.permissions && tool.permissions.length > 0) {
      const hasPermission = tool.permissions.some((p) => userPermissions.includes(p));
      if (!hasPermission) {
        throw new ForbiddenException(`Insufficient permissions to execute tool '${dto.toolName}'`);
      }
    }

    const startTime = Date.now();

    try {
      // In a real implementation, this would dispatch to the actual tool handler
      // For now, we return a mock result simulating the tool execution
      const result = await this.dispatchTool(tool, dto.parameters || {}, {
        tenantId,
        userId,
        ...dto.context,
      });

      const executionTime = Date.now() - startTime;

      this.logger.log(`Tool '${dto.toolName}' executed successfully in ${executionTime}ms`);

      return {
        success: true,
        toolName: dto.toolName,
        result,
        executionTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Tool '${dto.toolName}' failed: ${errorMessage}`);

      return {
        success: false,
        toolName: dto.toolName,
        error: errorMessage,
        executionTime,
        timestamp: new Date(),
      };
    }
  }

  async executeMultipleTools(
    tenantId: string,
    userId: string,
    tools: ExecuteToolDto[],
    userPermissions: string[],
    parallel = false,
    stopOnError = false,
  ): Promise<MultipleExecutionResultDto> {
    const startTime = Date.now();
    const results: ExecutionResultDto[] = [];

    if (parallel) {
      const promises = tools.map((dto) => this.executeTool(tenantId, userId, dto, userPermissions));
      const settled = await Promise.allSettled(promises);

      for (const [index, settledResult] of settled.entries()) {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          results.push({
            success: false,
            toolName: tools[index].toolName,
            error: settledResult.reason?.message || 'Unknown error',
            executionTime: 0,
            timestamp: new Date(),
          });
        }
      }
    } else {
      for (const dto of tools) {
        try {
          const result = await this.executeTool(tenantId, userId, dto, userPermissions);
          results.push(result);

          if (stopOnError && !result.success) {
            break;
          }
        } catch (error) {
          const errorResult: ExecutionResultDto = {
            success: false,
            toolName: dto.toolName,
            error: error instanceof Error ? error.message : String(error),
            executionTime: 0,
            timestamp: new Date(),
          };
          results.push(errorResult);

          if (stopOnError) {
            break;
          }
        }
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      results,
      totalExecutionTime,
      successCount,
      failureCount,
      timestamp: new Date(),
    };
  }

  async getRateLimitInfo(
    tenantId: string,
    userId: string,
  ): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    const rateLimitKey = `${tenantId}:${userId}`;
    return this.rateLimiter.getRemainingLimit(rateLimitKey);
  }

  private async dispatchTool(
    tool: RegisteredTool,
    parameters: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    // This is a placeholder implementation
    // In a real system, this would:
    // 1. Find the controller and method
    // 2. Inject the parameters
    // 3. Execute the method with proper authentication context
    // 4. Return the result

    // For now, return a mock response
    return {
      message: `Tool '${tool.name}' executed`,
      handler: tool.handler,
      method: tool.method,
      path: tool.path,
      parameters,
      context,
      _mock: true,
    };
  }

  validateToolParameters(
    tool: RegisteredTool,
    parameters: Record<string, unknown>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of tool.parameters) {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      if (param.name in parameters) {
        const value = parameters[param.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== param.type) {
          errors.push(
            `Parameter '${param.name}' has invalid type. Expected ${param.type}, got ${actualType}`,
          );
        }

        if (param.enum && !param.enum.includes(String(value))) {
          errors.push(
            `Parameter '${param.name}' has invalid value. Expected one of: ${param.enum.join(', ')}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
