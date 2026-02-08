import { IntegrationConnectorType, IntegrationDirection, CapabilityCategory } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { NetSuiteConnector } from './netsuite.connector';

describe('NetSuiteConnector', () => {
  let connector: NetSuiteConnector;
  let mockHttpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    mockHttpService = {
      axiosRef: {
        request: jest.fn(),
      },
    } as unknown as jest.Mocked<HttpService>;

    connector = new NetSuiteConnector();
    connector.initializeServices(mockHttpService);
  });

  describe('getMetadata', () => {
    it('should return connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.code).toBe('netsuite');
      expect(metadata.name).toBe('Oracle NetSuite');
      expect(metadata.version).toBeDefined();
      expect(metadata.type).toBe(IntegrationConnectorType.ERP);
      expect(metadata.direction).toBe(IntegrationDirection.BIDIRECTIONAL);
    });
  });

  describe('getCredentialRequirements', () => {
    it('should return TBA credential requirements', () => {
      const credentials = connector.getCredentialRequirements();

      expect(credentials).toHaveLength(1);
      expect(credentials[0].fields).toBeDefined();
      expect(credentials[0].fields.map((f: { key: string }) => f.key)).toContain('consumerKey');
      expect(credentials[0].fields.map((f: { key: string }) => f.key)).toContain('consumerSecret');
      expect(credentials[0].fields.map((f: { key: string }) => f.key)).toContain('tokenId');
      expect(credentials[0].fields.map((f: { key: string }) => f.key)).toContain('tokenSecret');
      expect(credentials[0].fields.map((f: { key: string }) => f.key)).toContain('realm');
    });
  });

  describe('getConfigSchema', () => {
    it('should return configuration schema', () => {
      const schema = connector.getConfigSchema();

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties).toHaveProperty('accountId');
      expect(schema.properties).toHaveProperty('timeout');
      expect(schema.properties).toHaveProperty('retryAttempts');
      expect(schema.required).toContain('accountId');
    });
  });

  describe('getCapabilities', () => {
    it('should return connector capabilities', () => {
      const capabilities = connector.getCapabilities();

      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities).toContainEqual(
        expect.objectContaining({ category: CapabilityCategory.CRUD }),
      );
      expect(capabilities).toContainEqual(
        expect.objectContaining({ category: CapabilityCategory.SYNC }),
      );
    });

    it('should have sales order capabilities', () => {
      const capabilities = connector.getCapabilities();
      const salesOrderCaps = capabilities.filter((c) => c.name.toLowerCase().includes('order'));

      expect(salesOrderCaps.length).toBeGreaterThan(0);
    });

    it('should have customer capabilities', () => {
      const capabilities = connector.getCapabilities();
      const customerCaps = capabilities.filter((c) => c.name.toLowerCase().includes('customer'));

      expect(customerCaps.length).toBeGreaterThan(0);
    });

    it('should have inventory capabilities', () => {
      const capabilities = connector.getCapabilities();
      const inventoryCaps = capabilities.filter((c) => c.name.toLowerCase().includes('inventory'));

      expect(inventoryCaps.length).toBeGreaterThan(0);
    });
  });

  describe('initialize', () => {
    it('should initialize with valid credentials and config', async () => {
      const context = {
        credentials: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          tokenId: 'test-token',
          tokenSecret: 'test-token-secret',
          realm: '1234567',
        },
        config: {
          accountId: '1234567',
        },
        tenantId: 'test-tenant',
        configId: 'test-config-id',
      };

      await expect(connector.initialize(context)).resolves.not.toThrow();
    });

    it('should throw error with missing credentials', async () => {
      const context = {
        credentials: {},
        config: { accountId: '1234567' },
        tenantId: 'test-tenant',
        configId: 'test-config-id',
      };

      await expect(connector.initialize(context)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with missing config', async () => {
      const context = {
        credentials: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          tokenId: 'test-token',
          tokenSecret: 'test-token-secret',
          realm: '1234567',
        },
        config: {},
        tenantId: 'test-tenant',
        configId: 'test-config-id',
      };

      await expect(connector.initialize(context)).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('should fail without initialization', async () => {
      const context = {
        credentials: {},
        config: {},
        tenantId: 'test-tenant',
        configId: 'test-config-id',
      };
      const result = await connector.testConnection(context);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('executeCapability', () => {
    const validContext = {
      credentials: {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        tokenId: 'test-token',
        tokenSecret: 'test-token-secret',
        realm: '1234567',
      },
      config: { accountId: '1234567' },
      tenantId: 'test-tenant',
      configId: 'test-config-id',
    };

    it('should fail with unknown operation', async () => {
      // Initialize first
      await connector.initialize(validContext);

      const result = await connector.executeCapability('unknown.operation', {}, validContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown capability');
    });
  });

  describe('destroy', () => {
    it('should destroy successfully', async () => {
      await expect(connector.destroy()).resolves.not.toThrow();
    });
  });

  describe('capability declarations', () => {
    it('should have salesOrder capabilities', () => {
      const capabilities = connector.getCapabilities();
      const salesOrderCaps = capabilities.filter((c) => c.code.startsWith('salesOrder.'));

      expect(salesOrderCaps.length).toBeGreaterThan(0);
      expect(salesOrderCaps.map((c) => c.code)).toContain('salesOrder.create');
      expect(salesOrderCaps.map((c) => c.code)).toContain('salesOrder.get');
    });

    it('should have customer capabilities', () => {
      const capabilities = connector.getCapabilities();
      const customerCaps = capabilities.filter((c) => c.code.startsWith('customer.'));

      expect(customerCaps.length).toBeGreaterThan(0);
      expect(customerCaps.map((c) => c.code)).toContain('customer.get');
      expect(customerCaps.map((c) => c.code)).toContain('customer.create');
    });

    it('should have item capabilities', () => {
      const capabilities = connector.getCapabilities();
      const itemCaps = capabilities.filter((c) => c.code.startsWith('item.'));

      expect(itemCaps.length).toBeGreaterThan(0);
      expect(itemCaps.map((c) => c.code)).toContain('item.list');
      expect(itemCaps.map((c) => c.code)).toContain('item.get');
    });

    it('should have invoice capabilities', () => {
      const capabilities = connector.getCapabilities();
      const invoiceCaps = capabilities.filter((c) => c.code.startsWith('invoice.'));

      expect(invoiceCaps.length).toBeGreaterThan(0);
      expect(invoiceCaps.map((c) => c.code)).toContain('invoice.get');
    });

    it('should have inventory capabilities', () => {
      const capabilities = connector.getCapabilities();
      const inventoryCaps = capabilities.filter((c) => c.code.startsWith('inventory.'));

      expect(inventoryCaps.length).toBeGreaterThan(0);
      expect(inventoryCaps.map((c) => c.code)).toContain('inventory.check');
    });

    it('should have search capabilities', () => {
      const capabilities = connector.getCapabilities();
      const searchCaps = capabilities.filter((c) => c.code.startsWith('search.'));

      expect(searchCaps.length).toBeGreaterThan(0);
      expect(searchCaps.map((c) => c.code)).toContain('search.execute');
    });
  });
});
