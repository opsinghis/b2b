# Why Build a Purpose-Built B2B Portal — Not a Commerce Engine

> **Core Thesis:** Medusa solves the wrong problem. It optimises for *Product → Cart → Checkout*. B2B optimises for *Relationships → Contracts → Approvals → Fulfilment*. These are fundamentally different domain models.

---

## 1. The Architecture Gap

Medusa is a brilliant headless commerce engine — for commerce. But B2B operations are not commerce. The table below shows where Medusa's architecture breaks down when applied to B2B.

| Dimension | Medusa.js | Custom B2B Portal | Why It Matters |
|-----------|-----------|-------------------|----------------|
| **Core Abstraction** | Product, Cart, Order, Payment | Organization, Contract, Quote, Approval | Medusa forces you to model B2B entities as commerce variants — square peg, round hole |
| **Pricing Model** | SKU-based with discount rules | Contract-based, tiered, volume, negotiated per-partner | B2B pricing is relational, not transactional. You need pricing per-organization, not per-product |
| **Workflow Engine** | None — requires custom plugins | Temporal.io native — multi-step approval chains with escalation | Approvals are the heartbeat of B2B. Medusa has no concept of approval workflows |
| **Multi-Tenancy** | Single-tenant with sales channels | Row-level security, tenant-scoped Prisma middleware | Sales channels ≠ tenants. You need hard data isolation, not soft filtering |
| **Partner Management** | Customer groups (flat) | Org hierarchies, partner types, onboarding workflows, health scoring | B2B partners have hierarchies, contracts, and lifecycle states — not just "groups" |
| **AI / Intelligence** | None | Context graphs, anomaly detection, smart routing, NL queries | Intelligence is built into the data model, not bolted on as a plugin |
| **Contract Lifecycle** | Not supported | Draft → Review → Negotiation → Approval → Active → Renewal/Termination | Contracts are a first-class entity with versioning, templates, and state machines |
| **Audit Trail** | Basic event logs | Full mutation audit with actor, IP, diff, and entity tracking | Enterprise B2B requires compliance-grade audit trails |
| **API Key Management** | Not supported | Scoped API keys with permissions, expiry, and usage tracking | Partners need programmatic access with fine-grained control |
| **RBAC + ABAC** | Basic customer roles | CASL-based hybrid with 6 pre-built roles + attribute policies | "Can approve quotes > £50k" is an ABAC rule — Medusa can't express this |

---

## 2. The Bloat Analysis

### What Medusa gives you (that you don't need)

| Medusa Module | Needed for B2B? | Complexity |
|---------------|:---------------:|:----------:|
| Cart & Checkout | ✗ No | High |
| Payment Processing | ✗ No | High |
| Shipping & Fulfillment | ✗ No | High |
| Storefront API | ✗ No | High |
| Gift Cards | ✗ No | Medium |
| Return & Refund | ✗ No | Medium |
| Tax Calculation | ✗ No | Medium |
| Product Variants | ✗ No | Medium |
| Inventory Management | ✗ No | Medium |
| Discount Engine | ✗ No | Medium |
| Customer Auth | ✓ Yes | Low |
| Notifications | ✓ Yes | Low |

**Result: 83% of Medusa's modules are dead weight** — maintained, updated, security-patched, but never used.

### What the Custom B2B Portal gives you (all purpose-built)

| Custom Module | Needed for B2B? | Status |
|---------------|:---------------:|:------:|
| Auth + RBAC + API Keys | ✓ Yes | Built |
| Multi-Tenant Isolation | ✓ Yes | Built |
| Contract Lifecycle | ✓ Yes | Built |
| Multi-Level Approvals | ✓ Yes | Built |
| Quote/RFQ Management | ✓ Yes | Built |
| Partner Hierarchies | ✓ Yes | Built |
| B2B Catalog + Pricing | ✓ Yes | Built |
| Temporal Workflows | ✓ Yes | Built |
| AI Engine + Context Graph | ✓ Yes | Built |
| Anomaly Detection | ✓ Yes | Built |
| Audit Trail | ✓ Yes | Built |
| Integration Adapters (ERP/CRM) | ✓ Yes | Built |

**Result: 100% utilisation** — every module serves a B2B purpose.

---

## 3. Time to Production

| Phase | Medusa Path | Custom Path | Notes |
|-------|:-----------:|:-----------:|-------|
| Initial Setup | 2 weeks | 3 weeks | Medusa faster out of the box, but... |
| Stripping Commerce Bloat | 3–4 weeks | 0 | Removing cart, checkout, payments, shipping |
| Building B2B Features as Plugins | 8–12 weeks | 4–6 weeks (native) | Fighting the framework vs building with it |
| Approval Workflows | 4–6 weeks (from scratch) | Already built | Temporal.io integration included |
| Multi-Tenancy Retrofit | 6–8 weeks | Already built | Medusa was never designed for multi-tenancy |
| AI Integration | 4–6 weeks (external) | Already built | Context graph is native to the data model |
| **Total to Production** | **27–38 weeks** | **7–9 weeks** | **3–4× faster with custom** |

### The Hidden Cost of Medusa

You spend the first 4 weeks removing commerce features and the next 12 weeks building B2B features as plugins that fight the framework's assumptions. With custom, every week is additive — you're always building forward, never stripping back.

---

## 4. Three Things Architecturally Impossible as Medusa Plugins

### 4.1 Multi-Tenant Row-Level Security

Multi-tenancy with RLS is a **foundational data-layer decision**. It requires Prisma middleware that auto-scopes every query by tenant ID, PostgreSQL row-level security policies, and tenant context injection at the middleware level. This cannot be retrofitted as a plugin — it must be baked into the ORM layer from day one. Medusa's sales channels provide soft filtering, not hard data isolation.

### 4.2 Temporal Approval Workflows

Medusa's event system is fire-and-forget. B2B approvals require multi-step orchestration with timeouts, escalation, delegation, and rollback. Temporal.io provides durable execution guarantees — if a step times out after 48 hours, it auto-escalates. If the system crashes mid-approval, it resumes exactly where it left off. This level of workflow orchestration fundamentally cannot be expressed in Medusa's subscriber/event pattern.

### 4.3 AI Context Graph

The Context Graph service builds rich relationship maps around entities — a contract's linked organization, sibling contracts, related quotes, user activity, risk factors, and opportunities. This requires deep integration with the Prisma data model and entity relationships. As a Medusa plugin, you'd be fighting the commerce entity model (products, carts, orders) instead of working with native B2B entities (organizations, contracts, approvals).

---

## 5. The Verdict

| # | Point |
|---|-------|
| ⚠️ | Medusa gives you 80% of what you don't need and 20% of what you do |
| 🔧 | Every B2B feature in Medusa is a plugin fighting the commerce core |
| ✅ | Custom gives you 100% B2B-native with zero commerce tax |
| 🧠 | The AI Engine alone justifies custom — it's architecturally impossible as a Medusa plugin |
| ⚡ | Temporal workflows for approvals can't be retrofitted into Medusa's event system |
| 🔒 | Multi-tenancy with RLS is a foundational choice — not something you add later |

---

## 6. When to Use What

### Use Medusa when:

Your primary workflow is **browse → add to cart → pay**. Medusa excels at headless storefronts with product browsing, cart management, checkout flows, and payment processing. Classic B2C or B2C-adjacent commerce. If you're selling products online, Medusa is excellent.

### Use a Custom B2B Portal when:

Your primary workflows are **contract negotiation, multi-level approvals, partner lifecycle management, tiered/negotiated pricing, and enterprise integrations**. When you need AI-native intelligence, not AI as an afterthought. When multi-tenancy isn't optional. When the relationship IS the product.

---

## 7. Bottom Line

> Using Medusa for B2B is like buying a lorry to deliver letters. It can do it, but you're paying for 40 tonnes of payload capacity you'll never use, while missing the letterbox-sized slot you actually need.

---

## 8. Custom B2B Portal — Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | NestJS 10 (TypeScript) | Modular, enterprise-grade backend |
| API | REST (Swagger) + GraphQL (Apollo) | Dual API surface |
| Database | PostgreSQL 16 + Prisma ORM | Tenant-scoped queries with middleware |
| Cache | Redis 7 | Session, rate limiting, real-time |
| Auth | JWT + Keycloak + CASL | SSO, RBAC + ABAC hybrid |
| Queue | BullMQ | Async jobs, notifications |
| Workflows | Temporal.io | Durable approval orchestration |
| Search | Elasticsearch 8 | Full-text across contracts, quotes, orgs |
| Files | MinIO (S3-compatible) | Document and contract file storage |
| Logging | Pino | Structured, high-performance logging |
| Tenant Context | nestjs-cls | Request-scoped tenant isolation |
| AI | Native context graph + anomaly detection | Intelligence woven into the data model |

---

*B2B Portal Architecture Decision Record — Custom NestJS vs Medusa.js*
