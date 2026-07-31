# Project: Custom Campaign System under NYC Campaign

## Architecture

- **Monorepo Structure**:
  - `apps/api`: Fastify 5 + TypeScript + Prisma CRM (`fastify.prisma.crm`) & Legacy (`fastify.prisma.legacy`)
  - `apps/web`: Next.js 15 + Ant Design 5 + Tailwind CSS v4
  - `packages/shared`: Shared Types (`@mos-lab/shared`)
- **Key Modules**:
  - Prisma Schema: `apps/api/prisma/crm.prisma`
  - Customer Module: `apps/api/src/modules/customers/routes.ts`, `customer.service.ts`
  - Allocation Module: `apps/api/src/modules/allocation/allocation.service.ts`, `allocation.routes.ts`, `allocation-cron.service.ts`
  - Campaign Module: `apps/api/src/modules/campaigns/*` (New)
  - Booking Module: `apps/api/src/modules/booking/*`
  - Web Navigation & UI: `apps/web/components/layout/sidebar.tsx`, `apps/web/app/dashboard/nyc/*`

## Milestones

| #   | Name                            | Scope                                                                                                                                               | Dependencies | Status |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | Database Schema & Migration     | Prisma CRM models for campaigns, touchpoints, promotions, logs, and allocation relationship                                                         | None         | DONE   |
| 2   | Shared Types & API Client       | `@mos-lab/shared` types and `apps/web/lib/api-client.ts` SDK extensions                                                                             | M1           | DONE   |
| 3   | Backend API & Logic             | Custom campaign CRUD, customer exclusive assignment, touchpoint pipeline, flexible promotions, batch allocation integration                         | M1, M2       | DONE   |
| 4   | Frontend Navigation & Pages     | Sidebar collapsible menu, Campaign Management page, Campaign Detail page with header metrics, touchpoint capsules, Booker filter, and table actions | M2, M3       | DONE   |
| 5   | Booking & Promotion Integration | Extend BookingWizardDrawer to display and select campaign promotions for campaign customers                                                         | M3, M4       | DONE   |
| 6   | End-to-End Verification & Audit | E2E test verification, adversarial testing, and forensic audit                                                                                      | M1-M5        | DONE   |

## Interface Contracts

### Campaign CRUD & Management

- `GET /api/campaigns`: List custom campaigns with metadata & customer stats
- `POST /api/campaigns`: Create a custom campaign (admin only)
- `GET /api/campaigns/:id`: Get single campaign with touchpoints & promotions
- `PUT /api/campaigns/:id`: Update campaign metadata / touchpoints / promotions
- `DELETE /api/campaigns/:id`: Delete/archive campaign

### Customer Exclusive Assignment

- `POST /api/campaigns/:id/customers`: Add customers from NYC pool into campaign
- `DELETE /api/campaigns/:id/customers`: Remove customer from campaign (return to NYC main)
- `GET /api/campaigns/:id/customers`: List campaign customers with filter by Booker & touchpoint bucket

### Touchpoint & Promotion Logging

- `POST /api/campaigns/:id/customers/:customerId/touchpoints/:touchpointId`: Toggle touchpoint log
- `GET /api/campaigns/:id/promotions`: Get active promotions for booking drawer

### Batch Allocation Integration

- `POST /api/allocation/batch`: Allocate campaign customers to Booker with `campaignId` context

## Code Layout

- Backend routes: `apps/api/src/modules/campaigns/*.ts` (imports with `.js`)
- Shared types: `packages/shared/src/types/campaign.ts`
- API client: `apps/web/lib/api-client.ts`
- Web pages: `apps/web/app/dashboard/nyc/campaigns/*`
