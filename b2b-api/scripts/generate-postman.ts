/**
 * Postman Collection Generator
 *
 * Generates a Postman collection from the NestJS Swagger/OpenAPI specification.
 * Includes pre-request scripts for automatic token handling.
 *
 * Usage: npm run generate:postman
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Dynamic import for openapi-to-postmanv2 (CommonJS module)
const Converter = require('openapi-to-postmanv2');

async function generatePostmanCollection() {
  // Import AppModule dynamically to avoid circular dependencies
  const { AppModule } = await import('../src/app.module');

  console.log('Creating NestJS application...');
  const app = await NestFactory.create(AppModule, { logger: false });

  // Build OpenAPI document
  console.log('Generating OpenAPI specification...');
  const config = new DocumentBuilder()
    .setTitle('B2B API')
    .setDescription('B2B Operations Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'x-tenant-id', in: 'header', description: 'Tenant ID or slug' },
      'x-tenant-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Convert OpenAPI to Postman
  console.log('Converting to Postman collection...');
  const postmanCollection = await convertOpenApiToPostman(document);

  // Post-process collection
  console.log('Adding authentication scripts...');
  const enhancedCollection = enhanceCollection(postmanCollection);

  // Create environment file
  console.log('Creating environment file...');
  const environment = createEnvironment();

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '..', 'docs', 'postman');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write collection file
  const collectionPath = path.join(outputDir, 'b2b-api.postman_collection.json');
  fs.writeFileSync(collectionPath, JSON.stringify(enhancedCollection, null, 2));
  console.log(`Collection written to: ${collectionPath}`);

  // Write environment file
  const envPath = path.join(outputDir, 'b2b-api.postman_environment.json');
  fs.writeFileSync(envPath, JSON.stringify(environment, null, 2));
  console.log(`Environment written to: ${envPath}`);

  await app.close();
  console.log('\nPostman collection generated successfully!');
  console.log('\nTo import into Postman:');
  console.log('1. Open Postman');
  console.log('2. Click Import > Upload Files');
  console.log('3. Select both files from docs/postman/');
  console.log('4. Select the "B2B API - Local" environment');
}

function convertOpenApiToPostman(openApiSpec: object): Promise<object> {
  return new Promise((resolve, reject) => {
    Converter.convert(
      { type: 'json', data: openApiSpec },
      {
        folderStrategy: 'Tags',
        requestParametersResolution: 'Example',
        exampleParametersResolution: 'Example',
        optimizeConversion: true,
        keepImplicitHeaders: false,
        includeAuthInfoInExample: true,
      },
      (err: Error | null, result: { result: boolean; output: Array<{ type: string; data: object }> }) => {
        if (err) {
          reject(err);
        } else if (!result.result) {
          reject(new Error('Conversion failed'));
        } else {
          resolve(result.output[0].data);
        }
      },
    );
  });
}

function enhanceCollection(collection: any): object {
  // Add collection-level pre-request script for token refresh
  collection.event = collection.event || [];
  collection.event.push({
    listen: 'prerequest',
    script: {
      type: 'text/javascript',
      exec: [
        '// Auto-refresh token if expired',
        'const accessToken = pm.environment.get("accessToken");',
        'const tokenExpiry = pm.environment.get("tokenExpiry");',
        '',
        'if (accessToken && tokenExpiry) {',
        '    const now = Math.floor(Date.now() / 1000);',
        '    const expiryTime = parseInt(tokenExpiry);',
        '    ',
        '    // Refresh if token expires in less than 60 seconds',
        '    if (expiryTime - now < 60) {',
        '        const refreshToken = pm.environment.get("refreshToken");',
        '        const baseUrl = pm.environment.get("baseUrl");',
        '        ',
        '        if (refreshToken && baseUrl) {',
        '            pm.sendRequest({',
        '                url: baseUrl + "/api/v1/auth/refresh",',
        '                method: "POST",',
        '                header: {',
        '                    "Content-Type": "application/json"',
        '                },',
        '                body: {',
        '                    mode: "raw",',
        '                    raw: JSON.stringify({ refreshToken: refreshToken })',
        '                }',
        '            }, function (err, res) {',
        '                if (!err && res.code === 200) {',
        '                    const jsonData = res.json();',
        '                    pm.environment.set("accessToken", jsonData.accessToken);',
        '                    pm.environment.set("refreshToken", jsonData.refreshToken);',
        '                    // Decode JWT to get expiry (simple decode, not verification)',
        '                    const payload = JSON.parse(atob(jsonData.accessToken.split(".")[1]));',
        '                    pm.environment.set("tokenExpiry", payload.exp);',
        '                    console.log("Token refreshed successfully");',
        '                }',
        '            });',
        '        }',
        '    }',
        '}',
      ],
    },
  });

  // Update collection info
  collection.info = collection.info || {};
  collection.info.name = 'B2B API';
  collection.info.description = 'B2B Operations Platform API - Generated from OpenAPI specification';

  // Add authentication variables to requests
  processItems(collection.item);

  // Add Auth folder with Login request if not exists
  addAuthFolder(collection);

  return collection;
}

function processItems(items: any[]): void {
  if (!items) return;

  for (const item of items) {
    if (item.item) {
      // This is a folder, process recursively
      processItems(item.item);
    } else if (item.request) {
      // This is a request
      processRequest(item);
    }
  }
}

function processRequest(item: any): void {
  const request = item.request;

  // Initialize headers if not present
  request.header = request.header || [];

  // Add /api/v1 prefix to paths if not already present
  if (request.url?.path && Array.isArray(request.url.path)) {
    const firstSegment = request.url.path[0];
    if (firstSegment !== 'api') {
      request.url.path = ['api', 'v1', ...request.url.path];
    }
  }

  // Remove all auth blocks (apikey and bearer) - we handle everything via headers instead
  // This prevents duplicate Authorization and x-tenant-id headers
  if (request.auth) {
    request.auth = null;
  }

  // Check if this is an auth endpoint (doesn't need auth headers)
  let urlPath = '';
  if (typeof request.url === 'string') {
    urlPath = request.url;
  } else if (request.url?.raw) {
    urlPath = request.url.raw;
  } else if (request.url?.path) {
    urlPath = '/' + request.url.path.join('/');
  }
  const isAuthEndpoint =
    urlPath.includes('/auth/login') ||
    urlPath.includes('/auth/register') ||
    urlPath.includes('auth/login') ||
    urlPath.includes('auth/register');

  // Remove any x-tenant-id headers with {{apiKey}} value (from OpenAPI security scheme)
  request.header = request.header.filter(
    (h: any) => !(h.key?.toLowerCase() === 'x-tenant-id' && h.value === '{{apiKey}}'),
  );

  if (!isAuthEndpoint) {
    // Add Authorization header with Bearer token
    const hasAuth = request.header.some((h: any) => h.key?.toLowerCase() === 'authorization');
    if (!hasAuth) {
      request.header.push({
        key: 'Authorization',
        value: 'Bearer {{accessToken}}',
        type: 'text',
      });
    }

    // Update or add x-tenant-id header
    const tenantHeader = request.header.find((h: any) => h.key?.toLowerCase() === 'x-tenant-id');
    if (tenantHeader) {
      tenantHeader.value = '{{tenantId}}';
    } else {
      request.header.push({
        key: 'x-tenant-id',
        value: '{{tenantId}}',
        type: 'text',
      });
    }
  }

  // Replace hardcoded host with variable
  if (request.url) {
    if (typeof request.url === 'string') {
      request.url = request.url.replace(/https?:\/\/[^/]+/, '{{baseUrl}}');
    } else if (request.url.raw) {
      request.url.raw = request.url.raw.replace(/https?:\/\/[^/]+/, '{{baseUrl}}');
      request.url.host = ['{{baseUrl}}'];
    }
  }
}

function addAuthFolder(collection: any): void {
  // Find existing Auth/Authentication folder
  let authFolder = collection.item?.find(
    (item: any) =>
      item.name?.toLowerCase() === 'auth' ||
      item.name?.toLowerCase() === 'authentication',
  );

  if (!authFolder) {
    authFolder = {
      name: 'Auth',
      description: 'Authentication endpoints',
      item: [],
    };
    collection.item = collection.item || [];
    collection.item.unshift(authFolder);
  }

  // Find existing Login request by name or URL
  let loginRequest = authFolder.item?.find((item: any) => {
    const name = item.name?.toLowerCase() || '';
    const urlPath = item.request?.url?.path?.join('/') || '';
    return name.includes('login') || urlPath.includes('auth/login');
  });

  if (!loginRequest) {
    loginRequest = {
      name: 'Login',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json', type: 'text' },
          { key: 'x-tenant-id', value: '{{tenantId}}', type: 'text' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify(
            {
              email: 'admin@b2b.local',
              password: 'Admin123!',
            },
            null,
            2,
          ),
          options: { raw: { language: 'json' } },
        },
        url: {
          raw: '{{baseUrl}}/api/v1/auth/login',
          host: ['{{baseUrl}}'],
          path: ['api', 'v1', 'auth', 'login'],
        },
      },
      event: [],
    };
    authFolder.item = authFolder.item || [];
    authFolder.item.unshift(loginRequest);
  }

  // Update x-tenant-id header to use variable
  if (loginRequest.request?.header) {
    const tenantHeader = loginRequest.request.header.find((h: any) => h.key?.toLowerCase() === 'x-tenant-id');
    if (tenantHeader) {
      tenantHeader.value = '{{tenantId}}';
    }
    // Remove Authorization header from login (it doesn't need it)
    loginRequest.request.header = loginRequest.request.header.filter(
      (h: any) => h.key?.toLowerCase() !== 'authorization',
    );
  }

  // Add test script to save tokens
  loginRequest.event = loginRequest.event || [];
  const hasTestScript = loginRequest.event.some((e: any) => e.listen === 'test');
  if (!hasTestScript) {
    loginRequest.event.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          'if (pm.response.code === 200 || pm.response.code === 201) {',
          '    const jsonData = pm.response.json();',
          '    ',
          '    if (jsonData.accessToken) {',
          '        pm.environment.set("accessToken", jsonData.accessToken);',
          '        console.log("Access token saved to environment");',
          '    }',
          '    ',
          '    if (jsonData.refreshToken) {',
          '        pm.environment.set("refreshToken", jsonData.refreshToken);',
          '        console.log("Refresh token saved to environment");',
          '    }',
          '    ',
          '    // Decode JWT to get expiry',
          '    if (jsonData.accessToken) {',
          '        try {',
          '            const payload = JSON.parse(atob(jsonData.accessToken.split(".")[1]));',
          '            if (payload.exp) {',
          '                pm.environment.set("tokenExpiry", payload.exp);',
          '            }',
          '        } catch (e) {',
          '            console.log("Could not decode token expiry");',
          '        }',
          '    }',
          '    ',
          '    pm.test("Login successful", function () {',
          '        pm.expect(jsonData.accessToken).to.be.a("string");',
          '    });',
          '} else {',
          '    pm.test("Login failed", function () {',
          '        pm.expect.fail("Login returned status " + pm.response.code);',
          '    });',
          '}',
        ],
      },
    });
  }

  // Find and fix Register request
  let registerRequest = authFolder.item?.find((item: any) => {
    const name = item.name?.toLowerCase() || '';
    const urlPath = item.request?.url?.path?.join('/') || '';
    return name.includes('register') || urlPath.includes('auth/register');
  });

  if (registerRequest?.request?.header) {
    const tenantHeader = registerRequest.request.header.find((h: any) => h.key?.toLowerCase() === 'x-tenant-id');
    if (tenantHeader) {
      tenantHeader.value = '{{tenantId}}';
    }
    // Remove Authorization header from register (it doesn't need it)
    registerRequest.request.header = registerRequest.request.header.filter(
      (h: any) => h.key?.toLowerCase() !== 'authorization',
    );
  }

  if (!registerRequest) {
    registerRequest = {
      name: 'Register',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json', type: 'text' },
          { key: 'x-tenant-id', value: '{{tenantId}}', type: 'text' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify(
            {
              email: 'newuser@example.com',
              password: 'password123',
              firstName: 'New',
              lastName: 'User',
            },
            null,
            2,
          ),
          options: { raw: { language: 'json' } },
        },
        url: {
          raw: '{{baseUrl}}/api/v1/auth/register',
          host: ['{{baseUrl}}'],
          path: ['api', 'v1', 'auth', 'register'],
        },
      },
    };
    authFolder.item.push(registerRequest);
  }

  // Find and fix Refresh Token request
  let refreshRequest = authFolder.item?.find((item: any) => {
    const name = item.name?.toLowerCase() || '';
    const urlPath = item.request?.url?.path?.join('/') || '';
    return name.includes('refresh') || urlPath.includes('auth/refresh');
  });

  if (refreshRequest) {
    // Add test script to save tokens
    refreshRequest.event = refreshRequest.event || [];
    const hasTestScript = refreshRequest.event.some((e: any) => e.listen === 'test');
    if (!hasTestScript) {
      refreshRequest.event.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'if (pm.response.code === 200 || pm.response.code === 201) {',
            '    const jsonData = pm.response.json();',
            '    if (jsonData.accessToken) {',
            '        pm.environment.set("accessToken", jsonData.accessToken);',
            '    }',
            '    if (jsonData.refreshToken) {',
            '        pm.environment.set("refreshToken", jsonData.refreshToken);',
            '    }',
            '}',
          ],
        },
      });
    }
  } else {
    refreshRequest = {
      name: 'Refresh Token',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
        body: {
          mode: 'raw',
          raw: JSON.stringify({ refreshToken: '{{refreshToken}}' }, null, 2),
          options: { raw: { language: 'json' } },
        },
        url: {
          raw: '{{baseUrl}}/api/v1/auth/refresh',
          host: ['{{baseUrl}}'],
          path: ['api', 'v1', 'auth', 'refresh'],
        },
      },
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'if (pm.response.code === 200 || pm.response.code === 201) {',
              '    const jsonData = pm.response.json();',
              '    if (jsonData.accessToken) {',
              '        pm.environment.set("accessToken", jsonData.accessToken);',
              '    }',
              '    if (jsonData.refreshToken) {',
              '        pm.environment.set("refreshToken", jsonData.refreshToken);',
              '    }',
              '}',
            ],
          },
        },
      ],
    };
    authFolder.item.push(refreshRequest);
  }

  // Find and fix Logout request
  let logoutRequest = authFolder.item?.find((item: any) => {
    const name = item.name?.toLowerCase() || '';
    const urlPath = item.request?.url?.path?.join('/') || '';
    return name.includes('logout') || urlPath.includes('auth/logout');
  });

  if (logoutRequest) {
    // Add test script to clear tokens
    logoutRequest.event = logoutRequest.event || [];
    const hasTestScript = logoutRequest.event.some((e: any) => e.listen === 'test');
    if (!hasTestScript) {
      logoutRequest.event.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'if (pm.response.code === 200 || pm.response.code === 201) {',
            '    pm.environment.unset("accessToken");',
            '    pm.environment.unset("refreshToken");',
            '    pm.environment.unset("tokenExpiry");',
            '    console.log("Tokens cleared from environment");',
            '}',
          ],
        },
      });
    }
  } else {
    logoutRequest = {
      name: 'Logout',
      request: {
        method: 'POST',
        header: [
          { key: 'Authorization', value: 'Bearer {{accessToken}}', type: 'text' },
          { key: 'Content-Type', value: 'application/json', type: 'text' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({ refreshToken: '{{refreshToken}}' }, null, 2),
          options: { raw: { language: 'json' } },
        },
        url: {
          raw: '{{baseUrl}}/api/v1/auth/logout',
          host: ['{{baseUrl}}'],
          path: ['api', 'v1', 'auth', 'logout'],
        },
      },
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'if (pm.response.code === 200 || pm.response.code === 201) {',
              '    pm.environment.unset("accessToken");',
              '    pm.environment.unset("refreshToken");',
              '    pm.environment.unset("tokenExpiry");',
              '    console.log("Tokens cleared from environment");',
              '}',
            ],
          },
        },
      ],
    };
    authFolder.item.push(logoutRequest);
  }
}

function createEnvironment(): object {
  return {
    id: 'b2b-api-local',
    name: 'B2B API - Local',
    values: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'default',
        enabled: true,
      },
      {
        key: 'tenantId',
        value: 'default',
        type: 'default',
        enabled: true,
      },
      {
        key: 'accessToken',
        value: '',
        type: 'secret',
        enabled: true,
      },
      {
        key: 'refreshToken',
        value: '',
        type: 'secret',
        enabled: true,
      },
      {
        key: 'tokenExpiry',
        value: '',
        type: 'default',
        enabled: true,
      },
    ],
    _postman_variable_scope: 'environment',
  };
}

// Run the generator
generatePostmanCollection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error generating Postman collection:', error);
    process.exit(1);
  });
