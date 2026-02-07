import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { RateLimiterService } from './rate-limiter.service';
import { ToolsRegistryService, RegisteredTool } from '../tools';
import { ExecuteToolDto } from './dto';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let toolsRegistry: ToolsRegistryService;
  let rateLimiter: RateLimiterService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockUserPermissions = ['read_contract', 'create_contract'];

  const mockTool: RegisteredTool = {
    name: 'create_contract',
    description: 'Create a new contract',
    category: 'contracts',
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Contract title',
        required: true,
      },
      {
        name: 'value',
        type: 'number',
        description: 'Contract value',
        required: false,
      },
    ],
    permissions: ['create_contract'],
    examples: [],
    handler: 'ContractsController.create',
    controller: 'ContractsController',
    method: 'POST',
    path: '/contracts',
  };

  const mockToolNoPermissions: RegisteredTool = {
    name: 'list_items',
    description: 'List items',
    category: 'general',
    parameters: [],
    permissions: [],
    examples: [],
    handler: 'ItemsController.list',
    controller: 'ItemsController',
    method: 'GET',
    path: '/items',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: ToolsRegistryService,
          useValue: {
            getTool: jest.fn(),
            getAllTools: jest.fn(),
          },
        },
        {
          provide: RateLimiterService,
          useValue: {
            checkLimit: jest.fn(),
            getRemainingLimit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
    toolsRegistry = module.get(ToolsRegistryService);
    rateLimiter = module.get(RateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeTool', () => {
    it('should execute a tool successfully', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      (toolsRegistry.getTool as jest.Mock).mockReturnValue(mockTool);

      const dto: ExecuteToolDto = {
        toolName: 'create_contract',
        parameters: { title: 'Test Contract' },
      };

      const result = await service.executeTool(
        mockTenantId,
        mockUserId,
        dto,
        mockUserPermissions,
      );

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('create_contract');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw ForbiddenException when rate limit exceeded', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const dto: ExecuteToolDto = {
        toolName: 'create_contract',
      };

      await expect(
        service.executeTool(mockTenantId, mockUserId, dto, mockUserPermissions),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when tool not found', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      (toolsRegistry.getTool as jest.Mock).mockReturnValue(undefined);

      const dto: ExecuteToolDto = {
        toolName: 'nonexistent_tool',
      };

      await expect(
        service.executeTool(mockTenantId, mockUserId, dto, mockUserPermissions),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user lacks permissions', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      (toolsRegistry.getTool as jest.Mock).mockReturnValue(mockTool);

      const dto: ExecuteToolDto = {
        toolName: 'create_contract',
      };

      await expect(
        service.executeTool(mockTenantId, mockUserId, dto, ['read_only']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow execution when tool has no permission requirements', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      (toolsRegistry.getTool as jest.Mock).mockReturnValue(mockToolNoPermissions);

      const dto: ExecuteToolDto = {
        toolName: 'list_items',
      };

      const result = await service.executeTool(
        mockTenantId,
        mockUserId,
        dto,
        [], // No permissions
      );

      expect(result.success).toBe(true);
    });

    it('should include context in tool execution', async () => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      (toolsRegistry.getTool as jest.Mock).mockReturnValue(mockToolNoPermissions);

      const dto: ExecuteToolDto = {
        toolName: 'list_items',
        context: { requestId: 'req-123' },
      };

      const result = await service.executeTool(
        mockTenantId,
        mockUserId,
        dto,
        [],
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });
  });

  describe('executeMultipleTools', () => {
    beforeEach(() => {
      (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      (toolsRegistry.getTool as jest.Mock).mockReturnValue(mockToolNoPermissions);
    });

    it('should execute multiple tools sequentially', async () => {
      const tools: ExecuteToolDto[] = [
        { toolName: 'list_items' },
        { toolName: 'list_items' },
      ];

      const result = await service.executeMultipleTools(
        mockTenantId,
        mockUserId,
        tools,
        mockUserPermissions,
        false, // parallel
        false, // stopOnError
      );

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute multiple tools in parallel', async () => {
      const tools: ExecuteToolDto[] = [
        { toolName: 'list_items' },
        { toolName: 'list_items' },
        { toolName: 'list_items' },
      ];

      const result = await service.executeMultipleTools(
        mockTenantId,
        mockUserId,
        tools,
        mockUserPermissions,
        true, // parallel
        false, // stopOnError
      );

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
    });

    it('should stop on first error when stopOnError is true', async () => {
      (toolsRegistry.getTool as jest.Mock)
        .mockReturnValueOnce(mockToolNoPermissions)
        .mockReturnValueOnce(undefined) // This will cause BadRequestException
        .mockReturnValueOnce(mockToolNoPermissions);

      const tools: ExecuteToolDto[] = [
        { toolName: 'list_items' },
        { toolName: 'nonexistent' },
        { toolName: 'list_items' },
      ];

      const result = await service.executeMultipleTools(
        mockTenantId,
        mockUserId,
        tools,
        mockUserPermissions,
        false, // parallel
        true, // stopOnError
      );

      // Should stop after the second tool fails
      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });

    it('should continue on error when stopOnError is false', async () => {
      (toolsRegistry.getTool as jest.Mock)
        .mockReturnValueOnce(mockToolNoPermissions)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(mockToolNoPermissions);

      const tools: ExecuteToolDto[] = [
        { toolName: 'list_items' },
        { toolName: 'nonexistent' },
        { toolName: 'list_items' },
      ];

      const result = await service.executeMultipleTools(
        mockTenantId,
        mockUserId,
        tools,
        mockUserPermissions,
        false, // parallel
        false, // stopOnError
      );

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });

    it('should handle parallel execution failures', async () => {
      (rateLimiter.checkLimit as jest.Mock)
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 99,
          resetAt: new Date(),
        })
        .mockResolvedValueOnce({
          allowed: false,
          remaining: 0,
          resetAt: new Date(),
        });

      const tools: ExecuteToolDto[] = [
        { toolName: 'list_items' },
        { toolName: 'list_items' },
      ];

      const result = await service.executeMultipleTools(
        mockTenantId,
        mockUserId,
        tools,
        mockUserPermissions,
        true, // parallel
        false,
      );

      expect(result.results).toHaveLength(2);
      expect(result.failureCount).toBeGreaterThan(0);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info', async () => {
      const mockInfo = {
        remaining: 90,
        limit: 100,
        resetAt: new Date(),
      };
      (rateLimiter.getRemainingLimit as jest.Mock).mockResolvedValue(mockInfo);

      const result = await service.getRateLimitInfo(mockTenantId, mockUserId);

      expect(result).toEqual(mockInfo);
      expect(rateLimiter.getRemainingLimit).toHaveBeenCalledWith(
        `${mockTenantId}:${mockUserId}`,
      );
    });
  });

  describe('validateToolParameters', () => {
    it('should validate required parameters', () => {
      const result = service.validateToolParameters(mockTool, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: title');
    });

    it('should validate parameter types', () => {
      const result = service.validateToolParameters(mockTool, {
        title: 123, // Should be string
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Parameter 'title' has invalid type. Expected string, got number",
      );
    });

    it('should pass validation with correct parameters', () => {
      const result = service.validateToolParameters(mockTool, {
        title: 'Test Contract',
        value: 1000,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow optional parameters to be missing', () => {
      const result = service.validateToolParameters(mockTool, {
        title: 'Test Contract',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate enum values', () => {
      const toolWithEnum: RegisteredTool = {
        ...mockTool,
        parameters: [
          {
            name: 'status',
            type: 'string',
            description: 'Status',
            required: true,
            enum: ['active', 'inactive'],
          },
        ],
      };

      const result = service.validateToolParameters(toolWithEnum, {
        status: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Parameter 'status' has invalid value. Expected one of: active, inactive",
      );
    });

    it('should pass enum validation with valid value', () => {
      const toolWithEnum: RegisteredTool = {
        ...mockTool,
        parameters: [
          {
            name: 'status',
            type: 'string',
            description: 'Status',
            required: true,
            enum: ['active', 'inactive'],
          },
        ],
      };

      const result = service.validateToolParameters(toolWithEnum, {
        status: 'active',
      });

      expect(result.valid).toBe(true);
    });
  });
});

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    // Create service manually with mock config
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue: number) => defaultValue),
    };

    service = new RateLimiterService(mockConfigService as any);
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const result = await service.checkLimit('test-key');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should track request count', async () => {
      await service.checkLimit('test-key');
      const result = await service.checkLimit('test-key');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(98);
    });

    it('should block when limit exceeded', async () => {
      // Use a separate key and exhaust the limit
      for (let i = 0; i < 100; i++) {
        await service.checkLimit('exhaust-key');
      }

      const result = await service.checkLimit('exhaust-key');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('getRemainingLimit', () => {
    it('should return full limit for new key', async () => {
      const result = await service.getRemainingLimit('new-key');

      expect(result.remaining).toBe(100);
      expect(result.limit).toBe(100);
    });

    it('should return correct remaining after requests', async () => {
      await service.checkLimit('used-key');
      await service.checkLimit('used-key');

      const result = await service.getRemainingLimit('used-key');

      expect(result.remaining).toBe(98);
    });
  });

  describe('getLimit', () => {
    it('should return the default limit', () => {
      expect(service.getLimit()).toBe(100);
    });
  });

  describe('getWindowMs', () => {
    it('should return the window duration', () => {
      expect(service.getWindowMs()).toBe(60000);
    });
  });

  describe('clearExpiredEntries', () => {
    it('should not throw when clearing', () => {
      expect(() => service.clearExpiredEntries()).not.toThrow();
    });
  });
});
