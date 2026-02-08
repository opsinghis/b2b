import { NetSuiteAuthService } from './netsuite-auth.service';
import { NetSuiteCredentials } from '../interfaces';

describe('NetSuiteAuthService', () => {
  let service: NetSuiteAuthService;

  const mockCredentials: NetSuiteCredentials = {
    consumerKey: 'test-consumer-key',
    consumerSecret: 'test-consumer-secret',
    tokenId: 'test-token-id',
    tokenSecret: 'test-token-secret',
    realm: '1234567',
  };

  beforeEach(() => {
    service = new NetSuiteAuthService();
  });

  describe('setCredentials', () => {
    it('should set credentials successfully', () => {
      service.setCredentials(mockCredentials);
      expect(service.getCredentials()).toEqual(mockCredentials);
    });
  });

  describe('hasCredentials', () => {
    it('should return false when no credentials are set', () => {
      expect(service.hasCredentials()).toBe(false);
    });

    it('should return true when complete credentials are set', () => {
      service.setCredentials(mockCredentials);
      expect(service.hasCredentials()).toBe(true);
    });

    it('should return false with incomplete credentials', () => {
      service.setCredentials({ ...mockCredentials, consumerKey: '' });
      expect(service.hasCredentials()).toBe(false);
    });
  });

  describe('generateAuthorizationHeader', () => {
    beforeEach(() => {
      service.setCredentials(mockCredentials);
    });

    it('should generate OAuth authorization header', () => {
      const header = service.generateAuthorizationHeader(
        'GET',
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/salesOrder',
      );

      expect(header).toMatch(/^OAuth /);
      expect(header).toContain('oauth_consumer_key=');
      expect(header).toContain('oauth_token=');
      expect(header).toContain('oauth_signature_method="HMAC-SHA256"');
      expect(header).toContain('oauth_version="1.0"');
      expect(header).toContain('oauth_signature=');
      expect(header).toContain(`realm="${mockCredentials.realm}"`);
    });

    it('should generate unique nonce for each request', () => {
      const header1 = service.generateAuthorizationHeader(
        'GET',
        'https://1234567.suitetalk.api.netsuite.com/test',
      );
      const header2 = service.generateAuthorizationHeader(
        'GET',
        'https://1234567.suitetalk.api.netsuite.com/test',
      );

      const nonce1 = header1.match(/oauth_nonce="([^"]+)"/)?.[1];
      const nonce2 = header2.match(/oauth_nonce="([^"]+)"/)?.[1];

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toEqual(nonce2);
    });

    it('should handle URLs with query parameters', () => {
      const header = service.generateAuthorizationHeader(
        'GET',
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/salesOrder?limit=100&offset=0',
      );

      expect(header).toMatch(/^OAuth /);
      expect(header).toContain('oauth_signature=');
    });

    it('should throw error when credentials are not set', () => {
      const emptyService = new NetSuiteAuthService();

      expect(() => {
        emptyService.generateAuthorizationHeader('GET', 'https://example.com/test');
      }).toThrow('NetSuite credentials not configured');
    });

    it('should handle POST requests with body', () => {
      const body = JSON.stringify({ entity: { id: '123' } });
      const header = service.generateAuthorizationHeader(
        'POST',
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/salesOrder',
        body,
      );

      expect(header).toMatch(/^OAuth /);
      expect(header).toContain('oauth_signature=');
    });
  });

  describe('validateCredentials', () => {
    it('should return valid for complete credentials', () => {
      const result = service.validateCredentials(mockCredentials);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing consumerKey', () => {
      const result = service.validateCredentials({
        ...mockCredentials,
        consumerKey: undefined,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Consumer Key is required');
    });

    it('should return errors for missing consumerSecret', () => {
      const result = service.validateCredentials({
        ...mockCredentials,
        consumerSecret: undefined,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Consumer Secret is required');
    });

    it('should return errors for missing tokenId', () => {
      const result = service.validateCredentials({
        ...mockCredentials,
        tokenId: undefined,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Token ID is required');
    });

    it('should return errors for missing tokenSecret', () => {
      const result = service.validateCredentials({
        ...mockCredentials,
        tokenSecret: undefined,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Token Secret is required');
    });

    it('should return errors for missing realm', () => {
      const result = service.validateCredentials({
        ...mockCredentials,
        realm: undefined,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Realm (Account ID) is required');
    });

    it('should return all errors for completely empty credentials', () => {
      const result = service.validateCredentials({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(5);
    });
  });
});
