import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ToolsRegistryService } from './tools-registry.service';
import { AGENT_TOOL_KEY, AgentToolMetadata, RegisteredTool } from './agent-tool.decorator';

describe('ToolsRegistryService', () => {
  let service: ToolsRegistryService;
  let discoveryService: DiscoveryService;
  let metadataScanner: MetadataScanner;
  let reflector: Reflector;

  const mockToolMetadata: AgentToolMetadata = {
    name: 'test_tool',
    description: 'A test tool',
    category: 'testing',
    parameters: [
      {
        name: 'input',
        type: 'string',
        description: 'Test input',
        required: true,
      },
    ],
    permissions: ['read'],
    examples: [
      {
        input: { input: 'test' },
        output: 'result',
      },
    ],
  };

  const mockController = {
    name: 'TestController',
    instance: {
      testMethod: jest.fn(),
    },
    metatype: class TestController {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsRegistryService,
        {
          provide: DiscoveryService,
          useValue: {
            getControllers: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            scanFromPrototype: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToolsRegistryService>(ToolsRegistryService);
    discoveryService = module.get(DiscoveryService);
    metadataScanner = module.get(MetadataScanner);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should discover tools from controllers', () => {
      const discoverToolsSpy = jest.spyOn(service as any, 'discoverTools');

      service.onModuleInit();

      expect(discoverToolsSpy).toHaveBeenCalled();
    });
  });

  describe('getAllTools', () => {
    it('should return empty array when no tools registered', () => {
      const tools = service.getAllTools();

      expect(tools).toEqual([]);
    });
  });

  describe('getTool', () => {
    it('should return undefined for non-existent tool', () => {
      const tool = service.getTool('nonexistent');

      expect(tool).toBeUndefined();
    });
  });

  describe('getCategories', () => {
    it('should return empty array when no tools registered', () => {
      const categories = service.getCategories();

      expect(categories).toEqual([]);
    });
  });

  describe('listTools', () => {
    it('should return empty list when no tools registered', () => {
      const result = service.listTools();

      expect(result).toEqual({
        tools: [],
        total: 0,
        categories: [],
      });
    });

    it('should filter by category', () => {
      const result = service.listTools('testing');

      expect(result.tools).toEqual([]);
    });
  });

  describe('getToolsByCategory', () => {
    it('should return empty array for non-existent category', () => {
      const tools = service.getToolsByCategory('nonexistent');

      expect(tools).toEqual([]);
    });
  });

  describe('getToolsWithPermission', () => {
    it('should return empty array when no tools registered', () => {
      const tools = service.getToolsWithPermission(['read']);

      expect(tools).toEqual([]);
    });
  });
});

describe('ToolsRegistryService with registered tools', () => {
  let service: ToolsRegistryService;

  const mockRegisteredTools: RegisteredTool[] = [
    {
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
      ],
      permissions: ['create_contract'],
      examples: [],
      handler: 'ContractsController.create',
      controller: 'ContractsController',
      method: 'POST',
      path: '/contracts',
    },
    {
      name: 'list_contracts',
      description: 'List all contracts',
      category: 'contracts',
      parameters: [],
      permissions: ['read_contract'],
      examples: [],
      handler: 'ContractsController.findAll',
      controller: 'ContractsController',
      method: 'GET',
      path: '/contracts',
    },
    {
      name: 'create_quote',
      description: 'Create a new quote',
      category: 'quotes',
      parameters: [
        {
          name: 'title',
          type: 'string',
          description: 'Quote title',
          required: true,
        },
      ],
      permissions: [],
      examples: [],
      handler: 'QuotesController.create',
      controller: 'QuotesController',
      method: 'POST',
      path: '/quotes',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsRegistryService,
        {
          provide: DiscoveryService,
          useValue: {
            getControllers: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            scanFromPrototype: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToolsRegistryService>(ToolsRegistryService);

    // Manually register tools for testing
    const toolsMap = (service as any).tools as Map<string, RegisteredTool>;
    for (const tool of mockRegisteredTools) {
      toolsMap.set(tool.name, tool);
    }
  });

  describe('getAllTools', () => {
    it('should return all registered tools', () => {
      const tools = service.getAllTools();

      expect(tools).toHaveLength(3);
      expect(tools.map((t) => t.name)).toContain('create_contract');
      expect(tools.map((t) => t.name)).toContain('list_contracts');
      expect(tools.map((t) => t.name)).toContain('create_quote');
    });
  });

  describe('getTool', () => {
    it('should return a specific tool by name', () => {
      const tool = service.getTool('create_contract');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('create_contract');
      expect(tool?.category).toBe('contracts');
      expect(tool?.method).toBe('POST');
    });
  });

  describe('getCategories', () => {
    it('should return unique categories sorted', () => {
      const categories = service.getCategories();

      expect(categories).toEqual(['contracts', 'quotes']);
    });
  });

  describe('listTools', () => {
    it('should return all tools with metadata', () => {
      const result = service.listTools();

      expect(result.total).toBe(3);
      expect(result.categories).toEqual(['contracts', 'quotes']);
      expect(result.tools).toHaveLength(3);
    });

    it('should filter tools by category', () => {
      const result = service.listTools('contracts');

      expect(result.total).toBe(2);
      expect(result.tools.every((t) => t.category === 'contracts')).toBe(true);
    });

    it('should return empty list for non-existent category', () => {
      const result = service.listTools('nonexistent');

      expect(result.total).toBe(0);
      expect(result.tools).toEqual([]);
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools in a specific category', () => {
      const tools = service.getToolsByCategory('contracts');

      expect(tools).toHaveLength(2);
      expect(tools.every((t) => t.category === 'contracts')).toBe(true);
    });

    it('should return tools in quotes category', () => {
      const tools = service.getToolsByCategory('quotes');

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('create_quote');
    });
  });

  describe('getToolsWithPermission', () => {
    it('should return tools matching permissions', () => {
      const tools = service.getToolsWithPermission(['create_contract']);

      expect(tools).toHaveLength(2); // create_contract + create_quote (no permissions)
      expect(tools.map((t) => t.name)).toContain('create_contract');
    });

    it('should include tools with no permission requirements', () => {
      const tools = service.getToolsWithPermission(['any_permission']);

      expect(tools).toHaveLength(1); // Only create_quote has no permissions
      expect(tools[0].name).toBe('create_quote');
    });

    it('should return all tools with empty permissions', () => {
      const tools = service.getToolsWithPermission([
        'create_contract',
        'read_contract',
      ]);

      expect(tools).toHaveLength(3);
    });
  });
});
