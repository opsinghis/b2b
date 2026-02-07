import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security - Disable CSP in development to allow Swagger UI
  // In production, configure CSP properly
  const isDev = process.env.NODE_ENV !== 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.enableCors();

  // API Prefix and Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
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
  SwaggerModule.setup('docs', app, document);

  // Root redirect to Swagger docs
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req, res) => {
    res.redirect('/docs');
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Application is running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger documentation: http://localhost:${port}/docs`);
}

void bootstrap();
