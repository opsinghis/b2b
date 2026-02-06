# B2B Backend Portal — Architecture

## Overview
A composable, AI-native B2B operations platform built on NestJS. Designed for multi-tenant enterprise use with approval workflows, contract management, partner onboarding, and agentic orchestration.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   Refine Admin UI  │  Partner Portal  │  Mobile App  │  CLI    │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│         GraphQL (Apollo)  +  REST (OpenAPI/Swagger)             │
│         Rate Limiting  │  Auth  │  Versioning                   │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (NestJS)                    │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Auth   │ │  Tenants │ │   Orgs   │ │  Users   │          │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Contracts│ │  Quotes  │ │ Catalog  │ │Approvals │          │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Notifs  │ │Dashboard │ │Integrtns │ │AI Engine │          │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │PostgreSQL│ │  Redis   │ │Temporal  │ │  MinIO   │          │
│  │ (Prisma) │ │ (Cache)  │ │(Workflow)│ │ (Files)  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │Elastic   │ │  BullMQ  │ │ Keycloak │                       │
│  │ Search   │ │ (Queues) │ │  (IAM)   │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Module Descriptions

### Core Modules
| Module | Purpose |
|--------|---------|
| **Auth** | JWT + Keycloak integration, RBAC with CASL, API key management, SSO |
| **Tenants** | Multi-tenant management, tenant isolation, config per tenant |
| **Organizations** | Company hierarchies, departments, business units, partner relationships |
| **Users** | User profiles, role assignment, preferences, activity tracking |

### Business Modules
| Module | Purpose |
|--------|---------|
| **Contracts** | Contract lifecycle (draft → negotiation → active → renewal), versioning, templates |
| **Quotes** | RFQ/RFP workflows, quote generation, pricing rules, validity management |
| **Catalog** | B2B product/service catalogs, custom pricing tiers, volume discounts |
| **Approvals** | Multi-level approval chains, delegation, escalation, SLA tracking |

### Platform Modules
| Module | Purpose |
|--------|---------|
| **Notifications** | Multi-channel (email, SMS, in-app, Slack/Teams), templates, preferences |
| **Dashboard** | KPIs, reporting, widgets, real-time metrics via WebSocket |
| **Integrations** | ERP, CRM, PIM, OMS connectors with adapter pattern |
| **AI Engine** | Context graph, agentic workflows, intelligent routing, anomaly detection |

## Multi-Tenancy Strategy
- **Row-Level Security (RLS)** via PostgreSQL policies
- Tenant context injected at middleware level via `X-Tenant-ID` header or JWT claim
- Prisma middleware auto-filters all queries by tenant
- Tenant-specific configuration stored in dedicated config table

## Event-Driven Architecture
- Domain events published via NestJS EventEmitter (in-process)
- Cross-service events via BullMQ (async jobs)
- Workflow orchestration via Temporal.io
- Real-time updates via Socket.io gateway

## Security Model
- RBAC + ABAC hybrid using CASL
- Pre-built roles: Super Admin, Tenant Admin, Manager, Operator, Viewer, Partner
- Attribute-based policies for fine-grained access (e.g., "can approve quotes > £50k")
- Audit trail on all mutations
- Data encryption at rest and in transit
