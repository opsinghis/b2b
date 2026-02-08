import { Injectable, Logger } from '@nestjs/common';
import { JSONPath } from 'jsonpath-plus';
import { JsonPathMapping, RequestMapping, ResponseMapping } from '../interfaces';

/**
 * JSON Path Mapper Service
 * Handles request/response transformation using JSONPath expressions
 */
@Injectable()
export class JsonPathMapperService {
  private readonly logger = new Logger(JsonPathMapperService.name);

  /**
   * Extract value using JSONPath
   */
  extractValue(data: unknown, path: string): unknown {
    try {
      const json = data as null | boolean | number | string | object | unknown[];
      const result = JSONPath({ path, json, wrap: false });
      return result;
    } catch (error) {
      this.logger.debug(
        `JSONPath extraction failed for path '${path}': ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  /**
   * Extract multiple values using JSONPath
   */
  extractValues(data: unknown, path: string): unknown[] {
    try {
      const json = data as null | boolean | number | string | object | unknown[];
      const result = JSONPath({ path, json, wrap: true });
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      this.logger.debug(
        `JSONPath extraction failed for path '${path}': ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Apply a single mapping
   */
  applyMapping(data: unknown, mapping: JsonPathMapping): { key: string; value: unknown } {
    let value = this.extractValue(data, mapping.source);

    // Apply default value if not found
    if (value === undefined || value === null) {
      value = mapping.defaultValue;
    }

    // Apply transformation
    if (value !== undefined && value !== null && mapping.transform) {
      value = this.transformValue(value, mapping.transform);
    }

    return { key: mapping.target, value };
  }

  /**
   * Apply multiple mappings to extract data
   */
  applyMappings(data: unknown, mappings: JsonPathMapping[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const { key, value } = this.applyMapping(data, mapping);
      if (value !== undefined) {
        this.setNestedValue(result, key, value);
      }
    }

    return result;
  }

  /**
   * Transform request input using request mapping
   */
  transformRequest(
    input: Record<string, unknown>,
    mapping: RequestMapping,
  ): {
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    pathParams?: Record<string, string>;
  } {
    const result: {
      body?: Record<string, unknown>;
      query?: Record<string, string>;
      headers?: Record<string, string>;
      pathParams?: Record<string, string>;
    } = {};

    // Map body
    if (mapping.bodyMappings?.length) {
      result.body = this.applyMappings(input, mapping.bodyMappings);
    }

    // Map query parameters
    if (mapping.queryMappings?.length) {
      const queryResult = this.applyMappings(input, mapping.queryMappings);
      result.query = this.flattenToStrings(queryResult);
    }

    // Map headers
    if (mapping.headerMappings?.length) {
      const headerResult = this.applyMappings(input, mapping.headerMappings);
      result.headers = this.flattenToStrings(headerResult);
    }

    // Map path parameters
    if (mapping.pathMappings?.length) {
      const pathResult = this.applyMappings(input, mapping.pathMappings);
      result.pathParams = this.flattenToStrings(pathResult);
    }

    return result;
  }

  /**
   * Transform response using response mapping
   */
  transformResponse(
    response: unknown,
    mapping: ResponseMapping,
  ): {
    data?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    error?: Record<string, unknown>;
  } {
    const result: {
      data?: Record<string, unknown>;
      meta?: Record<string, unknown>;
      error?: Record<string, unknown>;
    } = {};

    // Map data
    if (mapping.dataMappings?.length) {
      result.data = this.applyMappings(response, mapping.dataMappings);
    }

    // Map metadata
    if (mapping.metaMappings?.length) {
      result.meta = this.applyMappings(response, mapping.metaMappings);
    }

    // Map errors
    if (mapping.errorMappings?.length) {
      result.error = this.applyMappings(response, mapping.errorMappings);
    }

    return result;
  }

  /**
   * Transform a value to specified type
   */
  private transformValue(
    value: unknown,
    transform: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object',
  ): unknown {
    try {
      switch (transform) {
        case 'string':
          return String(value);

        case 'number':
          const num = Number(value);
          return isNaN(num) ? value : num;

        case 'boolean':
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value === '1';
          }
          return Boolean(value);

        case 'date':
          if (value instanceof Date) return value;
          const date = new Date(value as string | number);
          return isNaN(date.getTime()) ? value : date;

        case 'array':
          return Array.isArray(value) ? value : [value];

        case 'object':
          if (typeof value === 'object') return value;
          try {
            return JSON.parse(value as string);
          } catch {
            return { value };
          }

        default:
          return value;
      }
    } catch {
      return value;
    }
  }

  /**
   * Set a nested value using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Flatten object to string values (for query params, headers)
   */
  private flattenToStrings(obj: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        result[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    return result;
  }

  /**
   * Replace path parameters in URL template
   */
  replacePathParams(template: string, params: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(params)) {
      result = result.replace(`{${key}}`, encodeURIComponent(value));
    }

    // Check for unresolved parameters
    const unresolved = result.match(/\{([^}]+)\}/g);
    if (unresolved?.length) {
      this.logger.warn(`Unresolved path parameters: ${unresolved.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate JSONPath expression
   */
  validateJsonPath(path: string): { valid: boolean; error?: string } {
    try {
      // Test with empty object to validate syntax
      JSONPath({ path, json: {}, wrap: false });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Validate mapping configuration
   */
  validateMapping(mapping: JsonPathMapping): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!mapping.source) {
      errors.push('Mapping source is required');
    } else {
      const sourceValidation = this.validateJsonPath(mapping.source);
      if (!sourceValidation.valid) {
        errors.push(`Invalid source JSONPath: ${sourceValidation.error}`);
      }
    }

    if (!mapping.target) {
      errors.push('Mapping target is required');
    }

    if (
      mapping.transform &&
      !['string', 'number', 'boolean', 'date', 'array', 'object'].includes(mapping.transform)
    ) {
      errors.push(`Invalid transform type: ${mapping.transform}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
