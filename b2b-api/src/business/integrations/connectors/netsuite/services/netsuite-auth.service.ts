import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { NetSuiteCredentials, NetSuiteOAuth1Token } from '../interfaces';

/**
 * NetSuite Token-Based Authentication (TBA) Service
 * Implements OAuth 1.0a signing for NetSuite REST API
 */
export class NetSuiteAuthService {
  private readonly logger = new Logger(NetSuiteAuthService.name);

  private credentials?: NetSuiteCredentials;

  /**
   * Set credentials for authentication
   */
  setCredentials(credentials: NetSuiteCredentials): void {
    this.credentials = credentials;
    this.logger.debug(`Credentials set for realm: ${credentials.realm}`);
  }

  /**
   * Get current credentials
   */
  getCredentials(): NetSuiteCredentials | undefined {
    return this.credentials;
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return !!(
      this.credentials?.consumerKey &&
      this.credentials?.consumerSecret &&
      this.credentials?.tokenId &&
      this.credentials?.tokenSecret &&
      this.credentials?.realm
    );
  }

  /**
   * Generate OAuth 1.0a authorization header
   * NetSuite uses Token-Based Authentication (TBA) which is OAuth 1.0a based
   */
  generateAuthorizationHeader(method: string, url: string, body?: string): string {
    if (!this.credentials) {
      throw new Error('NetSuite credentials not configured');
    }

    const oauth = this.generateOAuth1Parameters(method, url, body);
    return this.buildAuthorizationHeader(oauth);
  }

  /**
   * Generate OAuth 1.0a parameters with signature
   */
  private generateOAuth1Parameters(
    method: string,
    url: string,
    body?: string,
  ): NetSuiteOAuth1Token {
    if (!this.credentials) {
      throw new Error('NetSuite credentials not configured');
    }

    const nonce = this.generateNonce();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.credentials.consumerKey,
      oauth_token: this.credentials.tokenId,
      oauth_nonce: nonce,
      oauth_timestamp: timestamp,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_version: '1.0',
    };

    // Build signature
    const signature = this.generateSignature(method, url, oauthParams, body);

    return {
      ...oauthParams,
      oauth_signature: signature,
    } as NetSuiteOAuth1Token;
  }

  /**
   * Generate HMAC-SHA256 signature for OAuth 1.0a
   */
  private generateSignature(
    method: string,
    url: string,
    oauthParams: Record<string, string>,
    _body?: string,
  ): string {
    if (!this.credentials) {
      throw new Error('NetSuite credentials not configured');
    }

    // Parse URL to separate base string and query params
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Collect all parameters (OAuth + URL query params)
    const allParams: Record<string, string> = { ...oauthParams };

    // Add URL query parameters
    urlObj.searchParams.forEach((value, key) => {
      allParams[key] = value;
    });

    // Sort parameters alphabetically by key
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys
      .map((key) => `${this.percentEncode(key)}=${this.percentEncode(allParams[key])}`)
      .join('&');

    // Build signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(baseUrl),
      this.percentEncode(paramString),
    ].join('&');

    // Build signing key
    const signingKey = [
      this.percentEncode(this.credentials.consumerSecret),
      this.percentEncode(this.credentials.tokenSecret),
    ].join('&');

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(signatureBaseString);
    const signature = hmac.digest('base64');

    this.logger.debug('Generated OAuth signature', {
      method,
      baseUrl,
      paramCount: sortedKeys.length,
    });

    return signature;
  }

  /**
   * Build OAuth authorization header string
   */
  private buildAuthorizationHeader(oauth: NetSuiteOAuth1Token): string {
    const realm = this.credentials?.realm || '';

    const headerParams = [
      `realm="${this.percentEncode(realm)}"`,
      `oauth_consumer_key="${this.percentEncode(oauth.oauth_consumer_key)}"`,
      `oauth_token="${this.percentEncode(oauth.oauth_token)}"`,
      `oauth_nonce="${this.percentEncode(oauth.oauth_nonce)}"`,
      `oauth_timestamp="${this.percentEncode(oauth.oauth_timestamp)}"`,
      `oauth_signature_method="${this.percentEncode(oauth.oauth_signature_method)}"`,
      `oauth_version="${this.percentEncode(oauth.oauth_version)}"`,
      `oauth_signature="${this.percentEncode(oauth.oauth_signature)}"`,
    ];

    return `OAuth ${headerParams.join(', ')}`;
  }

  /**
   * Generate random nonce for OAuth
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * RFC 3986 percent encoding
   */
  private percentEncode(value: string): string {
    return encodeURIComponent(value)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * Validate credentials format
   */
  validateCredentials(credentials: Partial<NetSuiteCredentials>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!credentials.consumerKey) {
      errors.push('Consumer Key is required');
    }
    if (!credentials.consumerSecret) {
      errors.push('Consumer Secret is required');
    }
    if (!credentials.tokenId) {
      errors.push('Token ID is required');
    }
    if (!credentials.tokenSecret) {
      errors.push('Token Secret is required');
    }
    if (!credentials.realm) {
      errors.push('Realm (Account ID) is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
