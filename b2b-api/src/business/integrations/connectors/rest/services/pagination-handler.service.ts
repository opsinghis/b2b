import { Injectable, Logger } from '@nestjs/common';
import {
  PaginationConfig,
  OffsetPaginationConfig,
  CursorPaginationConfig,
  LinkPaginationConfig,
  PagePaginationConfig,
  PaginatedResponse,
} from '../interfaces';
import { JsonPathMapperService } from './json-path-mapper.service';

/**
 * Pagination request parameters
 */
export interface PaginationRequest {
  cursor?: string;
  offset?: number;
  page?: number;
  limit?: number;
}

/**
 * Pagination result from response
 */
export interface PaginationResult {
  items: unknown[];
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  nextUrl?: string;
  prevUrl?: string;
}

/**
 * Pagination Handler Service
 * Supports offset, cursor, link, and page-based pagination
 */
@Injectable()
export class PaginationHandlerService {
  private readonly logger = new Logger(PaginationHandlerService.name);

  constructor(private readonly jsonPathMapper: JsonPathMapperService) {}

  /**
   * Build pagination parameters for request
   */
  buildPaginationParams(
    config: PaginationConfig,
    request: PaginationRequest,
  ): Record<string, string | number> {
    switch (config.type) {
      case 'offset':
        return this.buildOffsetParams(config, request);
      case 'cursor':
        return this.buildCursorParams(config, request);
      case 'page':
        return this.buildPageParams(config, request);
      case 'link':
      case 'none':
        return {};
      default:
        return {};
    }
  }

  /**
   * Build offset pagination parameters
   */
  private buildOffsetParams(
    config: OffsetPaginationConfig,
    request: PaginationRequest,
  ): Record<string, number> {
    const limit = Math.min(request.limit || config.defaultLimit || 20, config.maxLimit || 100);
    const offset = request.offset || 0;

    return {
      [config.offsetParam]: offset,
      [config.limitParam]: limit,
    };
  }

  /**
   * Build cursor pagination parameters
   */
  private buildCursorParams(
    config: CursorPaginationConfig,
    request: PaginationRequest,
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const limit = Math.min(request.limit || config.defaultLimit || 20, config.maxLimit || 100);

    params[config.limitParam] = limit;

    if (request.cursor) {
      params[config.cursorParam] = request.cursor;
    }

    return params;
  }

  /**
   * Build page pagination parameters
   */
  private buildPageParams(
    config: PagePaginationConfig,
    request: PaginationRequest,
  ): Record<string, number> {
    const pageSize = Math.min(
      request.limit || config.defaultPageSize || 20,
      config.maxPageSize || 100,
    );
    const page = request.page || 1;

    return {
      [config.pageParam]: page,
      [config.pageSizeParam]: pageSize,
    };
  }

  /**
   * Parse pagination from response
   */
  parsePaginationResponse(
    config: PaginationConfig,
    response: unknown,
    headers?: Record<string, string>,
  ): PaginationResult {
    switch (config.type) {
      case 'offset':
        return this.parseOffsetResponse(config, response);
      case 'cursor':
        return this.parseCursorResponse(config, response);
      case 'link':
        return this.parseLinkResponse(config, response, headers);
      case 'page':
        return this.parsePageResponse(config, response);
      case 'none':
        return this.parseNoPaginationResponse(config, response);
      default:
        return {
          items: Array.isArray(response) ? response : [],
          hasMore: false,
        };
    }
  }

  /**
   * Parse offset pagination response
   */
  private parseOffsetResponse(config: OffsetPaginationConfig, response: unknown): PaginationResult {
    const itemsPath = config.itemsPath || '$.data';
    const items = this.jsonPathMapper.extractValue(response, itemsPath);
    const itemsArray = Array.isArray(items) ? items : [];

    let total: number | undefined;
    if (config.totalPath) {
      const totalValue = this.jsonPathMapper.extractValue(response, config.totalPath);
      total = typeof totalValue === 'number' ? totalValue : undefined;
    }

    // Determine if there are more items
    // We can't know for certain without total, so we use heuristics
    const hasMore = total !== undefined ? itemsArray.length < total : itemsArray.length > 0;

    return {
      items: itemsArray,
      hasMore,
      total,
    };
  }

  /**
   * Parse cursor pagination response
   */
  private parseCursorResponse(config: CursorPaginationConfig, response: unknown): PaginationResult {
    const itemsPath = config.itemsPath || '$.data';
    const items = this.jsonPathMapper.extractValue(response, itemsPath);
    const itemsArray = Array.isArray(items) ? items : [];

    let nextCursor: string | undefined;
    let prevCursor: string | undefined;
    let hasMore = false;

    if (config.nextCursorPath) {
      const nextValue = this.jsonPathMapper.extractValue(response, config.nextCursorPath);
      nextCursor = nextValue ? String(nextValue) : undefined;
      hasMore = !!nextCursor;
    }

    if (config.prevCursorPath) {
      const prevValue = this.jsonPathMapper.extractValue(response, config.prevCursorPath);
      prevCursor = prevValue ? String(prevValue) : undefined;
    }

    if (config.hasMorePath) {
      const hasMoreValue = this.jsonPathMapper.extractValue(response, config.hasMorePath);
      hasMore = Boolean(hasMoreValue);
    }

    return {
      items: itemsArray,
      hasMore,
      nextCursor,
      prevCursor,
    };
  }

  /**
   * Parse link pagination response (HATEOAS / RFC 5988)
   */
  private parseLinkResponse(
    config: LinkPaginationConfig,
    response: unknown,
    headers?: Record<string, string>,
  ): PaginationResult {
    const itemsPath = config.itemsPath || '$.data';
    const items = this.jsonPathMapper.extractValue(response, itemsPath);
    const itemsArray = Array.isArray(items) ? items : [];

    let nextUrl: string | undefined;
    let prevUrl: string | undefined;

    // Check response body for links
    if (config.nextLinkPath) {
      const nextValue = this.jsonPathMapper.extractValue(response, config.nextLinkPath);
      nextUrl = nextValue ? String(nextValue) : undefined;
    }

    if (config.prevLinkPath) {
      const prevValue = this.jsonPathMapper.extractValue(response, config.prevLinkPath);
      prevUrl = prevValue ? String(prevValue) : undefined;
    }

    // Parse Link header if configured
    if (config.parseLinkHeader && headers) {
      const linkHeader = headers['link'] || headers['Link'];
      if (linkHeader) {
        const parsedLinks = this.parseLinkHeader(linkHeader);
        nextUrl = nextUrl || parsedLinks.next;
        prevUrl = prevUrl || parsedLinks.prev;
      }
    }

    return {
      items: itemsArray,
      hasMore: !!nextUrl,
      nextUrl,
      prevUrl,
    };
  }

  /**
   * Parse page pagination response
   */
  private parsePageResponse(config: PagePaginationConfig, response: unknown): PaginationResult {
    const itemsPath = config.itemsPath || '$.data';
    const items = this.jsonPathMapper.extractValue(response, itemsPath);
    const itemsArray = Array.isArray(items) ? items : [];

    let totalPages: number | undefined;
    let totalItems: number | undefined;
    let page: number | undefined;
    let pageSize: number | undefined;

    if (config.totalPagesPath) {
      const value = this.jsonPathMapper.extractValue(response, config.totalPagesPath);
      totalPages = typeof value === 'number' ? value : undefined;
    }

    if (config.totalItemsPath) {
      const value = this.jsonPathMapper.extractValue(response, config.totalItemsPath);
      totalItems = typeof value === 'number' ? value : undefined;
    }

    // Calculate hasMore based on available info
    const hasMore = totalPages !== undefined && page !== undefined ? page < totalPages : itemsArray.length > 0;

    return {
      items: itemsArray,
      hasMore,
      total: totalItems,
      totalPages,
      page,
      pageSize,
    };
  }

  /**
   * Parse response with no pagination
   */
  private parseNoPaginationResponse(
    config: { type: 'none'; itemsPath?: string },
    response: unknown,
  ): PaginationResult {
    const itemsPath = config.itemsPath || '$';
    const items = this.jsonPathMapper.extractValue(response, itemsPath);
    const itemsArray = Array.isArray(items) ? items : [items];

    return {
      items: itemsArray,
      hasMore: false,
    };
  }

  /**
   * Parse RFC 5988 Link header
   */
  private parseLinkHeader(header: string): { next?: string; prev?: string; first?: string; last?: string } {
    const links: Record<string, string> = {};
    const parts = header.split(',');

    for (const part of parts) {
      const match = part.match(/<([^>]+)>.*rel="?([^";\s]+)"?/);
      if (match) {
        const [, url, rel] = match;
        links[rel.trim()] = url.trim();
      }
    }

    return {
      next: links['next'],
      prev: links['prev'] || links['previous'],
      first: links['first'],
      last: links['last'],
    };
  }

  /**
   * Create paginated response from result
   */
  createPaginatedResponse<T>(result: PaginationResult): PaginatedResponse<T> {
    return {
      items: result.items as T[],
      pagination: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Validate pagination configuration
   */
  validatePaginationConfig(config: PaginationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (config.type) {
      case 'offset':
        if (!config.offsetParam) errors.push('Offset pagination requires offsetParam');
        if (!config.limitParam) errors.push('Offset pagination requires limitParam');
        break;

      case 'cursor':
        if (!config.cursorParam) errors.push('Cursor pagination requires cursorParam');
        if (!config.limitParam) errors.push('Cursor pagination requires limitParam');
        break;

      case 'page':
        if (!config.pageParam) errors.push('Page pagination requires pageParam');
        if (!config.pageSizeParam) errors.push('Page pagination requires pageSizeParam');
        break;

      case 'link':
      case 'none':
        // No required fields
        break;

      default:
        errors.push(`Unknown pagination type`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
