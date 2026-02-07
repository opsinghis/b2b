import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { AGENT_TOOL_KEY, AgentToolMetadata, RegisteredTool } from './agent-tool.decorator';
import { ToolResponseDto, ToolsListResponseDto } from './dto';

@Injectable()
export class ToolsRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolsRegistryService.name);
  private readonly tools: Map<string, RegisteredTool> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    this.discoverTools();
    this.logger.log(`Discovered ${this.tools.size} agent tools`);
  }

  private discoverTools(): void {
    const controllers = this.discoveryService.getControllers();

    for (const wrapper of controllers) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const controllerName = metatype.name;
      const controllerPath = this.getControllerPath(metatype);

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName: string) => {
          const methodRef = instance[methodName];
          if (!methodRef) return;

          const metadata = this.reflector.get<AgentToolMetadata>(
            AGENT_TOOL_KEY,
            methodRef,
          );

          if (metadata) {
            const methodPath = this.getMethodPath(methodRef) || methodName;
            const httpMethod = this.getHttpMethod(methodRef) || 'POST';

            const tool: RegisteredTool = {
              ...metadata,
              handler: `${controllerName}.${methodName}`,
              controller: controllerName,
              method: httpMethod,
              path: `${controllerPath}/${methodPath}`.replace(/\/+/g, '/'),
            };

            this.tools.set(metadata.name, tool);
            this.logger.debug(`Registered tool: ${metadata.name}`);
          }
        },
      );
    }
  }

  private getControllerPath(metatype: unknown): string {
    const path = Reflect.getMetadata('path', metatype as object);
    return path ? `/${path}` : '';
  }

  private getMethodPath(method: unknown): string {
    const path = Reflect.getMetadata('path', method as object);
    return path || '';
  }

  private getHttpMethod(method: unknown): string {
    const methods = ['Get', 'Post', 'Put', 'Patch', 'Delete'];
    for (const m of methods) {
      if (Reflect.getMetadata(`${m.toLowerCase()}`, method as object) !== undefined) {
        return m.toUpperCase();
      }
    }
    // Check standard NestJS route decorators
    const requestMethod = Reflect.getMetadata('method', method as object);
    if (requestMethod !== undefined) {
      const methodMap: Record<number, string> = {
        0: 'GET',
        1: 'POST',
        2: 'PUT',
        3: 'DELETE',
        4: 'PATCH',
        5: 'OPTIONS',
        6: 'HEAD',
      };
      return methodMap[requestMethod] || 'POST';
    }
    return 'POST';
  }

  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): RegisteredTool[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      categories.add(tool.category);
    }
    return Array.from(categories).sort();
  }

  getToolsWithPermission(permissions: string[]): RegisteredTool[] {
    return this.getAllTools().filter((tool) => {
      if (!tool.permissions || tool.permissions.length === 0) {
        return true; // No permissions required
      }
      return tool.permissions.some((p) => permissions.includes(p));
    });
  }

  listTools(category?: string): ToolsListResponseDto {
    let tools = this.getAllTools();

    if (category) {
      tools = tools.filter((tool) => tool.category === category);
    }

    return {
      tools: tools.map((tool) => this.toToolResponse(tool)),
      total: tools.length,
      categories: this.getCategories(),
    };
  }

  private toToolResponse(tool: RegisteredTool): ToolResponseDto {
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
