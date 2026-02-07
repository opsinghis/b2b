import { Test, TestingModule } from '@nestjs/testing';
import { JsonPathMapperService } from './json-path-mapper.service';

describe('JsonPathMapperService', () => {
  let service: JsonPathMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JsonPathMapperService],
    }).compile();

    service = module.get<JsonPathMapperService>(JsonPathMapperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractValue', () => {
    const testData = {
      user: {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        address: {
          city: 'New York',
          zip: '10001',
        },
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };

    it('should extract simple value', () => {
      const result = service.extractValue(testData, '$.user.name');
      expect(result).toBe('John');
    });

    it('should extract nested value', () => {
      const result = service.extractValue(testData, '$.user.address.city');
      expect(result).toBe('New York');
    });

    it('should extract array element', () => {
      const result = service.extractValue(testData, '$.items[0].name');
      expect(result).toBe('Item 1');
    });

    it('should return undefined for non-existent path', () => {
      const result = service.extractValue(testData, '$.nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('extractValues', () => {
    const testData = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ],
    };

    it('should extract multiple values', () => {
      const result = service.extractValues(testData, '$.items[*].name');
      expect(result).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should return empty array for non-existent path', () => {
      const result = service.extractValues(testData, '$.nonexistent[*]');
      expect(result).toEqual([]);
    });
  });

  describe('applyMapping', () => {
    const testData = {
      source_field: 'value',
      number_field: '42',
    };

    it('should apply simple mapping', () => {
      const result = service.applyMapping(testData, {
        source: '$.source_field',
        target: 'targetField',
      });

      expect(result.key).toBe('targetField');
      expect(result.value).toBe('value');
    });

    it('should apply default value when source is missing', () => {
      const result = service.applyMapping(testData, {
        source: '$.missing_field',
        target: 'targetField',
        defaultValue: 'default',
      });

      expect(result.value).toBe('default');
    });

    it('should transform to number', () => {
      const result = service.applyMapping(testData, {
        source: '$.number_field',
        target: 'targetField',
        transform: 'number',
      });

      expect(result.value).toBe(42);
    });

    it('should transform to boolean', () => {
      const result = service.applyMapping({ flag: 'true' }, {
        source: '$.flag',
        target: 'flag',
        transform: 'boolean',
      });

      expect(result.value).toBe(true);
    });
  });

  describe('applyMappings', () => {
    const testData = {
      first_name: 'John',
      last_name: 'Doe',
      age: '30',
    };

    it('should apply multiple mappings', () => {
      const result = service.applyMappings(testData, [
        { source: '$.first_name', target: 'firstName' },
        { source: '$.last_name', target: 'lastName' },
        { source: '$.age', target: 'age', transform: 'number' },
      ]);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
      });
    });

    it('should handle nested target paths', () => {
      const result = service.applyMappings(testData, [
        { source: '$.first_name', target: 'user.name.first' },
        { source: '$.last_name', target: 'user.name.last' },
      ]);

      expect(result).toEqual({
        user: {
          name: {
            first: 'John',
            last: 'Doe',
          },
        },
      });
    });
  });

  describe('transformRequest', () => {
    const input = {
      userId: '123',
      name: 'Test',
      page: '1',
      authToken: 'token123',
    };

    it('should transform body fields', () => {
      const result = service.transformRequest(input, {
        bodyMappings: [
          { source: '$.name', target: 'displayName' },
        ],
      });

      expect(result.body).toEqual({ displayName: 'Test' });
    });

    it('should transform query parameters', () => {
      const result = service.transformRequest(input, {
        queryMappings: [
          { source: '$.page', target: 'pageNumber' },
        ],
      });

      expect(result.query).toEqual({ pageNumber: '1' });
    });

    it('should transform headers', () => {
      const result = service.transformRequest(input, {
        headerMappings: [
          { source: '$.authToken', target: 'X-Auth-Token' },
        ],
      });

      expect(result.headers).toEqual({ 'X-Auth-Token': 'token123' });
    });

    it('should transform path parameters', () => {
      const result = service.transformRequest(input, {
        pathMappings: [
          { source: '$.userId', target: 'id' },
        ],
      });

      expect(result.pathParams).toEqual({ id: '123' });
    });
  });

  describe('transformResponse', () => {
    const response = {
      data: {
        user: { id: 1, name: 'John' },
      },
      meta: {
        total: 100,
        page: 1,
      },
      error: null,
    };

    it('should transform data fields', () => {
      const result = service.transformResponse(response, {
        dataMappings: [
          { source: '$.data.user.name', target: 'userName' },
        ],
      });

      expect(result.data).toEqual({ userName: 'John' });
    });

    it('should transform meta fields', () => {
      const result = service.transformResponse(response, {
        metaMappings: [
          { source: '$.meta.total', target: 'totalCount' },
        ],
      });

      expect(result.meta).toEqual({ totalCount: 100 });
    });
  });

  describe('replacePathParams', () => {
    it('should replace single parameter', () => {
      const result = service.replacePathParams('/users/{id}', { id: '123' });
      expect(result).toBe('/users/123');
    });

    it('should replace multiple parameters', () => {
      const result = service.replacePathParams('/users/{userId}/posts/{postId}', {
        userId: '123',
        postId: '456',
      });
      expect(result).toBe('/users/123/posts/456');
    });

    it('should URL encode parameter values', () => {
      const result = service.replacePathParams('/search/{query}', {
        query: 'hello world',
      });
      expect(result).toBe('/search/hello%20world');
    });
  });

  describe('validateJsonPath', () => {
    it('should validate correct JSONPath', () => {
      const result = service.validateJsonPath('$.data.items[*].name');
      expect(result.valid).toBe(true);
    });

    it('should handle empty path', () => {
      const result = service.validateJsonPath('');
      expect(result.valid).toBe(true); // Empty is technically valid
    });
  });

  describe('validateMapping', () => {
    it('should validate correct mapping', () => {
      const result = service.validateMapping({
        source: '$.data.value',
        target: 'outputField',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject mapping without source', () => {
      const result = service.validateMapping({
        source: '',
        target: 'outputField',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mapping source is required');
    });

    it('should reject mapping without target', () => {
      const result = service.validateMapping({
        source: '$.data',
        target: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mapping target is required');
    });

    it('should reject invalid transform type', () => {
      const result = service.validateMapping({
        source: '$.data',
        target: 'output',
        transform: 'invalid' as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid transform type'))).toBe(true);
    });
  });
});
