import { Test, TestingModule } from '@nestjs/testing';
import { PaginationHandlerService } from './pagination-handler.service';
import { JsonPathMapperService } from './json-path-mapper.service';

describe('PaginationHandlerService', () => {
  let service: PaginationHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationHandlerService, JsonPathMapperService],
    }).compile();

    service = module.get<PaginationHandlerService>(PaginationHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildPaginationParams', () => {
    describe('offset pagination', () => {
      const config = {
        type: 'offset' as const,
        offsetParam: 'offset',
        limitParam: 'limit',
        defaultLimit: 20,
        maxLimit: 100,
      };

      it('should build default offset params', () => {
        const result = service.buildPaginationParams(config, {});
        expect(result).toEqual({ offset: 0, limit: 20 });
      });

      it('should use provided offset and limit', () => {
        const result = service.buildPaginationParams(config, { offset: 50, limit: 25 });
        expect(result).toEqual({ offset: 50, limit: 25 });
      });

      it('should cap limit at maxLimit', () => {
        const result = service.buildPaginationParams(config, { limit: 500 });
        expect(result.limit).toBe(100);
      });
    });

    describe('cursor pagination', () => {
      const config = {
        type: 'cursor' as const,
        cursorParam: 'cursor',
        limitParam: 'limit',
        defaultLimit: 20,
      };

      it('should build cursor params without cursor', () => {
        const result = service.buildPaginationParams(config, {});
        expect(result).toEqual({ limit: 20 });
      });

      it('should include cursor when provided', () => {
        const result = service.buildPaginationParams(config, { cursor: 'abc123' });
        expect(result).toEqual({ cursor: 'abc123', limit: 20 });
      });
    });

    describe('page pagination', () => {
      const config = {
        type: 'page' as const,
        pageParam: 'page',
        pageSizeParam: 'per_page',
        defaultPageSize: 20,
      };

      it('should build default page params', () => {
        const result = service.buildPaginationParams(config, {});
        expect(result).toEqual({ page: 1, per_page: 20 });
      });

      it('should use provided page and limit', () => {
        const result = service.buildPaginationParams(config, { page: 3, limit: 50 });
        expect(result).toEqual({ page: 3, per_page: 50 });
      });
    });

    describe('no pagination', () => {
      it('should return empty params', () => {
        const result = service.buildPaginationParams({ type: 'none' }, {});
        expect(result).toEqual({});
      });
    });
  });

  describe('parsePaginationResponse', () => {
    describe('offset pagination', () => {
      const config = {
        type: 'offset' as const,
        offsetParam: 'offset',
        limitParam: 'limit',
        itemsPath: '$.data',
        totalPath: '$.meta.total',
      };

      it('should parse offset pagination response', () => {
        const response = {
          data: [{ id: 1 }, { id: 2 }],
          meta: { total: 100 },
        };

        const result = service.parsePaginationResponse(config, response);

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(100);
        expect(result.hasMore).toBe(true);
      });
    });

    describe('cursor pagination', () => {
      const config = {
        type: 'cursor' as const,
        cursorParam: 'cursor',
        limitParam: 'limit',
        itemsPath: '$.items',
        nextCursorPath: '$.nextCursor',
        hasMorePath: '$.hasMore',
      };

      it('should parse cursor pagination with next cursor', () => {
        const response = {
          items: [{ id: 1 }],
          nextCursor: 'cursor123',
          hasMore: true,
        };

        const result = service.parsePaginationResponse(config, response);

        expect(result.items).toHaveLength(1);
        expect(result.nextCursor).toBe('cursor123');
        expect(result.hasMore).toBe(true);
      });

      it('should detect no more items when cursor is null', () => {
        const response = {
          items: [{ id: 1 }],
          nextCursor: null,
          hasMore: false,
        };

        const result = service.parsePaginationResponse(config, response);

        expect(result.hasMore).toBe(false);
        expect(result.nextCursor).toBeUndefined();
      });
    });

    describe('link pagination', () => {
      const config = {
        type: 'link' as const,
        itemsPath: '$.data',
        nextLinkPath: '$.links.next',
        prevLinkPath: '$.links.prev',
      };

      it('should parse link pagination response', () => {
        const response = {
          data: [{ id: 1 }],
          links: {
            next: 'https://api.example.com/items?page=2',
            prev: null,
          },
        };

        const result = service.parsePaginationResponse(config, response);

        expect(result.items).toHaveLength(1);
        expect(result.nextUrl).toBe('https://api.example.com/items?page=2');
        expect(result.hasMore).toBe(true);
      });

      it('should parse Link header', () => {
        const configWithHeader = {
          ...config,
          parseLinkHeader: true,
        };
        const response = { data: [{ id: 1 }] };
        const headers = {
          link: '<https://api.example.com/items?page=2>; rel="next", <https://api.example.com/items?page=0>; rel="prev"',
        };

        const result = service.parsePaginationResponse(configWithHeader, response, headers);

        expect(result.nextUrl).toBe('https://api.example.com/items?page=2');
        expect(result.prevUrl).toBe('https://api.example.com/items?page=0');
      });
    });

    describe('page pagination', () => {
      const config = {
        type: 'page' as const,
        pageParam: 'page',
        pageSizeParam: 'per_page',
        itemsPath: '$.data',
        totalPagesPath: '$.meta.totalPages',
        totalItemsPath: '$.meta.total',
      };

      it('should parse page pagination response', () => {
        const response = {
          data: [{ id: 1 }, { id: 2 }],
          meta: { totalPages: 5, total: 100 },
        };

        const result = service.parsePaginationResponse(config, response);

        expect(result.items).toHaveLength(2);
        expect(result.totalPages).toBe(5);
        expect(result.total).toBe(100);
      });
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response', () => {
      const paginationResult = {
        items: [{ id: 1 }, { id: 2 }],
        hasMore: true,
        nextCursor: 'cursor123',
        total: 100,
      };

      const result = service.createPaginatedResponse(paginationResult);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBe('cursor123');
      expect(result.pagination.total).toBe(100);
    });
  });

  describe('validatePaginationConfig', () => {
    it('should validate offset pagination config', () => {
      const result = service.validatePaginationConfig({
        type: 'offset',
        offsetParam: 'offset',
        limitParam: 'limit',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject offset pagination without offsetParam', () => {
      const result = service.validatePaginationConfig({
        type: 'offset',
        offsetParam: '',
        limitParam: 'limit',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Offset pagination requires offsetParam');
    });

    it('should validate cursor pagination config', () => {
      const result = service.validatePaginationConfig({
        type: 'cursor',
        cursorParam: 'cursor',
        limitParam: 'limit',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject cursor pagination without cursorParam', () => {
      const result = service.validatePaginationConfig({
        type: 'cursor',
        cursorParam: '',
        limitParam: 'limit',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cursor pagination requires cursorParam');
    });

    it('should validate page pagination config', () => {
      const result = service.validatePaginationConfig({
        type: 'page',
        pageParam: 'page',
        pageSizeParam: 'per_page',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate link pagination config', () => {
      const result = service.validatePaginationConfig({
        type: 'link',
      });

      expect(result.valid).toBe(true);
    });

    it('should validate no pagination config', () => {
      const result = service.validatePaginationConfig({
        type: 'none',
      });

      expect(result.valid).toBe(true);
    });
  });
});
