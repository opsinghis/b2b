# ERP Integration Module - Product Requirements Document

## Overview

Extensible integration layer for connecting the B2B platform with enterprise ERP systems, EDI networks, and regional e-invoicing requirements.

## Goals

1. **Extensibility** - Plugin architecture for adding new ERP connectors
2. **Multi-Protocol** - REST, SOAP, EDI (AS2/SFTP), Message Queues
3. **Regional Compliance** - E-invoicing for EU, LATAM, USA
4. **Reliability** - Retry logic, dead-letter queues, audit trails
5. **Real-time + Batch** - Support both sync and async patterns

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      B2B Platform Core                          │
│  Orders │ Invoices │ Products │ Partners │ Inventory │ Payments │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Integration Hub │
                    │    (PRD-040)    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼──────┐
│   Connector   │   │    Connector    │   │  Connector  │
│   Registry    │   │    Adapters     │   │   Events    │
│   (PRD-041)   │   │   (PRD-042+)    │   │  (PRD-047)  │
└───────────────┘   └─────────────────┘   └─────────────┘
```

---

## PRD Items

### Phase 7: Integration Foundation

| ID | Title | Priority | Iterations |
|----|-------|----------|------------|
| PRD-040 | Integration Hub Core | P0 | 12 |
| PRD-041 | Connector Registry & Plugin System | P0 | 10 |
| PRD-042 | Generic REST Connector | P0 | 8 |
| PRD-043 | Message Queue Integration (Events) | P0 | 10 |
| PRD-044 | Integration Monitoring & Logging | P1 | 8 |

### Phase 8: ERP Connectors

| ID | Title | Priority | Iterations |
|----|-------|----------|------------|
| PRD-045 | SAP S/4HANA Connector | P1 | 14 |
| PRD-046 | Microsoft Dynamics 365 Connector | P1 | 12 |
| PRD-047 | NetSuite Connector | P1 | 12 |
| PRD-048 | Oracle ERP Cloud Connector | P2 | 12 |
| PRD-049 | QuickBooks Connector | P2 | 8 |

### Phase 9: EDI & E-Invoicing

| ID | Title | Priority | Iterations |
|----|-------|----------|------------|
| PRD-050 | EDI X12 Parser/Generator | P1 | 12 |
| PRD-051 | EDIFACT Parser/Generator | P1 | 10 |
| PRD-052 | AS2/SFTP Transport | P1 | 10 |
| PRD-053 | E-Invoicing - Peppol (EU) | P1 | 12 |
| PRD-054 | E-Invoicing - CFDI (Mexico) | P1 | 14 |
| PRD-055 | E-Invoicing - NF-e (Brazil) | P2 | 14 |

### Phase 10: Business Flows

| ID | Title | Priority | Iterations |
|----|-------|----------|------------|
| PRD-056 | Order-to-Cash Flow | P0 | 12 |
| PRD-057 | Procure-to-Pay Flow | P1 | 12 |
| PRD-058 | Inventory/ATP Sync | P0 | 10 |
| PRD-059 | Price List Sync | P1 | 8 |
| PRD-060 | Customer Master Sync | P1 | 8 |

---

## Detailed PRD Specifications

### PRD-040: Integration Hub Core

**Module:** `src/integrations/hub`

**Description:** Central orchestration layer for all integrations. Routes messages, handles transformations, manages retry logic.

**Completion Criteria:**
- [ ] IntegrationHub service with message routing
- [ ] Transformation pipeline (source → canonical → target)
- [ ] Retry policy configuration (exponential backoff)
- [ ] Dead-letter queue for failed messages
- [ ] Circuit breaker pattern for external calls
- [ ] Idempotency handling (deduplication)
- [ ] Rate limiting per connector
- [ ] Health check endpoints for all integrations
- [ ] Unit tests with 80%+ coverage

**Data Models:**
```prisma
model IntegrationMessage {
  id              String   @id @default(cuid())
  messageType     String   // ORDER_CREATE, INVOICE_SYNC, etc.
  direction       Direction // INBOUND, OUTBOUND
  sourceSystem    String   // b2b-platform, sap, netsuite
  targetSystem    String
  correlationId   String   // Links related messages
  payload         Json
  canonicalPayload Json?   // Transformed payload
  status          MessageStatus
  retryCount      Int      @default(0)
  maxRetries      Int      @default(3)
  nextRetryAt     DateTime?
  processedAt     DateTime?
  errorMessage    String?
  errorDetails    Json?
  tenantId        String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId, status])
  @@index([correlationId])
  @@index([nextRetryAt])
}

enum Direction {
  INBOUND
  OUTBOUND
}

enum MessageStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  DEAD_LETTER
}
```

**API Endpoints:**
```
POST   /api/v1/integrations/messages          # Submit message
GET    /api/v1/integrations/messages          # List messages
GET    /api/v1/integrations/messages/:id      # Get message details
POST   /api/v1/integrations/messages/:id/retry # Retry failed message
GET    /api/v1/integrations/health            # Health status
```

---

### PRD-041: Connector Registry & Plugin System

**Module:** `src/integrations/connectors`

**Description:** Plugin architecture for registering and managing ERP connectors. Each connector implements a standard interface.

**Completion Criteria:**
- [ ] ConnectorRegistry service for plugin management
- [ ] IConnector interface definition
- [ ] Connector configuration schema (per tenant)
- [ ] Credential vault integration (encrypted storage)
- [ ] Connector lifecycle (register, configure, enable, disable)
- [ ] Connector capability declaration (supports: orders, invoices, etc.)
- [ ] Dynamic connector loading
- [ ] Admin API for connector management
- [ ] Unit tests with 80%+ coverage

**Data Models:**
```prisma
model Connector {
  id              String   @id @default(cuid())
  code            String   @unique // sap-s4, netsuite, dynamics365
  name            String
  description     String?
  version         String
  type            ConnectorType
  capabilities    String[] // ORDER_SYNC, INVOICE_SYNC, INVENTORY_CHECK
  configSchema    Json     // JSON Schema for configuration
  isBuiltIn       Boolean  @default(false)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  configurations  ConnectorConfig[]
}

model ConnectorConfig {
  id              String   @id @default(cuid())
  connectorId     String
  connector       Connector @relation(fields: [connectorId], references: [id])
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  name            String   // "Production SAP", "Test SAP"
  config          Json     // Encrypted configuration
  credentials     Json     // Encrypted credentials (separate for security)
  isEnabled       Boolean  @default(false)
  lastTestedAt    DateTime?
  lastTestResult  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([connectorId, tenantId, name])
}

enum ConnectorType {
  REST_API
  SOAP
  EDI
  DATABASE
  MESSAGE_QUEUE
  FILE_BASED
}
```

**Connector Interface:**
```typescript
interface IConnector {
  // Metadata
  readonly code: string;
  readonly name: string;
  readonly capabilities: ConnectorCapability[];

  // Lifecycle
  initialize(config: ConnectorConfig): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  shutdown(): Promise<void>;

  // Operations (optional based on capabilities)
  sendOrder?(order: CanonicalOrder): Promise<ExternalReference>;
  getInvoices?(filters: InvoiceFilters): Promise<CanonicalInvoice[]>;
  checkInventory?(sku: string, warehouse?: string): Promise<InventoryLevel>;
  syncPrices?(priceListId: string): Promise<CanonicalPrice[]>;
  syncCustomer?(customer: CanonicalCustomer): Promise<ExternalReference>;
}
```

---

### PRD-042: Generic REST Connector

**Module:** `src/integrations/connectors/rest`

**Description:** Configurable REST connector that can connect to any REST API with mapping configuration.

**Completion Criteria:**
- [ ] Generic REST client with configurable auth (Basic, Bearer, OAuth2, API Key)
- [ ] Request/response mapping via JSONPath/templates
- [ ] Configurable endpoints per operation
- [ ] Header management
- [ ] Pagination handling (offset, cursor, link-based)
- [ ] Error mapping and handling
- [ ] Request/response logging
- [ ] Webhook receiver for callbacks
- [ ] Unit tests with 80%+ coverage

**Configuration Schema:**
```json
{
  "baseUrl": "https://api.example.com/v1",
  "auth": {
    "type": "oauth2",
    "tokenUrl": "https://auth.example.com/token",
    "clientId": "{{vault:client_id}}",
    "clientSecret": "{{vault:client_secret}}",
    "scope": "read write"
  },
  "operations": {
    "sendOrder": {
      "method": "POST",
      "path": "/orders",
      "requestMapping": {
        "order_number": "$.orderNumber",
        "customer_id": "$.customer.externalId",
        "lines": "$.items[*].{sku: productSku, qty: quantity, price: unitPrice}"
      },
      "responseMapping": {
        "externalId": "$.id",
        "status": "$.status"
      }
    },
    "getInvoices": {
      "method": "GET",
      "path": "/invoices",
      "pagination": {
        "type": "offset",
        "pageParam": "page",
        "limitParam": "per_page",
        "totalPath": "$.meta.total"
      }
    }
  }
}
```

---

### PRD-050: EDI X12 Parser/Generator

**Module:** `src/integrations/edi/x12`

**Description:** Parse and generate ANSI X12 EDI documents for US B2B transactions.

**Completion Criteria:**
- [ ] X12 Parser (string → structured object)
- [ ] X12 Generator (structured object → string)
- [ ] Support transaction sets: 850 (PO), 855 (PO Ack), 856 (ASN), 810 (Invoice)
- [ ] Envelope handling (ISA/GS/ST segments)
- [ ] Validation against X12 schema
- [ ] Partner-specific configuration (delimiters, versions)
- [ ] Canonical model mapping
- [ ] Error reporting with segment/element location
- [ ] Unit tests with 80%+ coverage

**Supported Transaction Sets:**
```typescript
enum X12TransactionSet {
  PO_850 = '850',           // Purchase Order
  PO_ACK_855 = '855',       // Purchase Order Acknowledgment
  ASN_856 = '856',          // Advance Ship Notice
  INVOICE_810 = '810',      // Invoice
  FUNC_ACK_997 = '997',     // Functional Acknowledgment
  INVENTORY_846 = '846',    // Inventory Inquiry/Advice
  PRICE_CAT_832 = '832',    // Price/Sales Catalog
}
```

**Example Flow:**
```
Partner PO (X12 850)
    → Parse → Canonical Order
    → B2B Platform Order
    → Process
    → Canonical PO Ack
    → Generate → X12 855
```

---

### PRD-053: E-Invoicing - Peppol (EU)

**Module:** `src/integrations/einvoice/peppol`

**Description:** Peppol BIS Billing 3.0 compliant e-invoicing for European partners.

**Completion Criteria:**
- [ ] UBL 2.1 Invoice/CreditNote generation
- [ ] Peppol BIS Billing 3.0 validation
- [ ] Participant ID lookup (SMP/SML)
- [ ] Access Point integration (via API)
- [ ] Document status tracking
- [ ] Country-specific extensions (DE, FR, IT, NL)
- [ ] Schematron validation
- [ ] PDF/A-3 with embedded XML
- [ ] Unit tests with 80%+ coverage

**Supported Document Types:**
- Invoice (UBL 2.1)
- Credit Note (UBL 2.1)
- Self-Billing Invoice

**Country Extensions:**
| Country | Standard | Notes |
|---------|----------|-------|
| Germany | XRechnung | Leitweg-ID required |
| France | Factur-X | Chorus Pro integration |
| Italy | FatturaPA | SDI submission |
| Netherlands | SI-UBL | Standard Peppol |

---

### PRD-054: E-Invoicing - CFDI (Mexico)

**Module:** `src/integrations/einvoice/cfdi`

**Description:** CFDI 4.0 compliant e-invoicing for Mexican tax authority (SAT).

**Completion Criteria:**
- [ ] CFDI 4.0 XML generation
- [ ] Digital signature (CSD certificate)
- [ ] PAC integration for timbrado (stamping)
- [ ] UUID (folio fiscal) tracking
- [ ] Cancellation flow with motivo
- [ ] Complement support (Pagos 2.0, Comercio Exterior)
- [ ] PDF representation generation
- [ ] SAT validation service integration
- [ ] Addenda support (Walmart, Liverpool, etc.)
- [ ] Unit tests with 80%+ coverage

**CFDI Types:**
- Ingreso (Income - standard invoice)
- Egreso (Credit note)
- Traslado (Transfer/waybill)
- Pago (Payment complement)
- Nómina (Payroll)

---

### PRD-056: Order-to-Cash Flow

**Module:** `src/integrations/flows/o2c`

**Description:** End-to-end order-to-cash integration flow orchestration.

**Completion Criteria:**
- [ ] Order sync (B2B → ERP) on order creation
- [ ] Order status updates (ERP → B2B)
- [ ] Shipment/ASN sync (ERP → B2B)
- [ ] Invoice generation trigger
- [ ] Invoice sync (ERP → B2B)
- [ ] Payment status sync
- [ ] Credit check before order (real-time)
- [ ] Configurable flow per tenant
- [ ] Flow monitoring dashboard data
- [ ] Unit tests with 80%+ coverage

**Flow Definition:**
```yaml
name: order-to-cash
triggers:
  - event: ORDER_CREATED
    source: b2b-platform

steps:
  - name: credit_check
    connector: erp
    operation: checkCredit
    condition: "order.total > tenant.creditCheckThreshold"
    onFailure: REJECT_ORDER

  - name: sync_order
    connector: erp
    operation: sendOrder
    retries: 3

  - name: await_confirmation
    type: wait
    event: ORDER_CONFIRMED
    timeout: 24h

  - name: notify_customer
    connector: notification
    operation: sendEmail
    template: order_confirmed
```

---

### PRD-058: Inventory/ATP Sync

**Module:** `src/integrations/flows/inventory`

**Description:** Real-time and batch inventory synchronization with ATP (Available-to-Promise) calculations.

**Completion Criteria:**
- [ ] Real-time stock check API (sync)
- [ ] Batch inventory sync (scheduled)
- [ ] ATP calculation (on-hand - allocated - reserved + incoming)
- [ ] Multi-warehouse support
- [ ] Safety stock configuration
- [ ] Low stock alerts
- [ ] Inventory reservation on cart/checkout
- [ ] Reservation timeout and release
- [ ] Inventory audit trail
- [ ] Unit tests with 80%+ coverage

**Data Model:**
```prisma
model InventoryLevel {
  id              String   @id @default(cuid())
  productId       String
  warehouseCode   String
  tenantId        String

  // Quantities
  onHand          Int      @default(0)
  allocated       Int      @default(0)  // Reserved for orders
  reserved        Int      @default(0)  // Reserved in carts
  incoming        Int      @default(0)  // Expected from POs

  // ATP = onHand - allocated - reserved + incoming

  safetyStock     Int      @default(0)
  reorderPoint    Int?
  lastSyncedAt    DateTime?
  externalId      String?  // ERP inventory ID

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([productId, warehouseCode, tenantId])
  @@index([tenantId, productId])
}

model InventoryReservation {
  id              String   @id @default(cuid())
  productId       String
  warehouseCode   String
  quantity        Int
  type            ReservationType // CART, ORDER
  referenceId     String   // cartId or orderId
  expiresAt       DateTime?
  releasedAt      DateTime?
  tenantId        String
  createdAt       DateTime @default(now())

  @@index([tenantId, referenceId])
  @@index([expiresAt])
}
```

---

## Implementation Order

```
Phase 7: Foundation (PRD-040 → PRD-044)
    ↓
Phase 8: First ERP Connector (PRD-045 or PRD-047)
    ↓
Phase 9: EDI if needed (PRD-050 → PRD-052)
    ↓
Phase 10: E-Invoicing by region (PRD-053 → PRD-055)
    ↓
Phase 11: Business Flows (PRD-056 → PRD-060)
```

---

## Extensibility Points

### Adding a New ERP Connector

1. Implement `IConnector` interface
2. Register in ConnectorRegistry
3. Define configuration schema
4. Map to/from canonical models
5. Add to connector capabilities

### Adding a New EDI Transaction Set

1. Define segment/element schema
2. Implement parser rules
3. Implement generator templates
4. Map to/from canonical model
5. Add validation rules

### Adding a New E-Invoice Format

1. Implement document generator
2. Add validation (XSD/Schematron)
3. Integrate with authority/network
4. Add PDF generation
5. Handle status callbacks

---

## Canonical Data Models

All connectors transform to/from these canonical models:

```typescript
// Canonical Order
interface CanonicalOrder {
  id: string;
  orderNumber: string;
  orderDate: Date;
  customer: CanonicalParty;
  shipTo: CanonicalAddress;
  billTo: CanonicalAddress;
  lines: CanonicalOrderLine[];
  totals: CanonicalTotals;
  currency: string;
  paymentTerms: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Canonical Invoice
interface CanonicalInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  orderReference?: string;
  supplier: CanonicalParty;
  customer: CanonicalParty;
  lines: CanonicalInvoiceLine[];
  totals: CanonicalTotals;
  currency: string;
  taxSummary: CanonicalTaxSummary[];
  paymentInfo?: CanonicalPaymentInfo;
}

// Canonical Product
interface CanonicalProduct {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: string;
  prices: CanonicalPrice[];
  inventory?: CanonicalInventory;
  attributes?: Record<string, string>;
}
```

---

## Summary

| Phase | PRD Range | Focus | Est. Iterations |
|-------|-----------|-------|-----------------|
| 7 | PRD-040 → PRD-044 | Integration Foundation | 48 |
| 8 | PRD-045 → PRD-049 | ERP Connectors | 58 |
| 9 | PRD-050 → PRD-055 | EDI & E-Invoicing | 72 |
| 10 | PRD-056 → PRD-060 | Business Flows | 50 |
| **Total** | **21 PRD items** | | **~228 iterations** |

This provides a complete, extensible ERP integration layer for global B2B operations.
