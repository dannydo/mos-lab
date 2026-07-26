# R2: API Design & Completeness Review — Catalog Management

## 1. Observation

A detailed review was conducted on the API architecture, middleware implementations, Prisma schemas, shared types, and existing route patterns in `mos-lab`. The primary source files inspected include:

- `apps/api/src/server.ts`
- `apps/api/src/middlewares/auth.ts`
- `apps/api/src/modules/customers/routes.ts`
- `apps/api/src/modules/plans/routes/plan-crud.routes.ts`
- `apps/api/src/modules/roles/routes.ts`
- `apps/api/src/modules/staff/routes.ts`
- `apps/api/prisma/legacy.prisma` & `apps/api/prisma/crm.prisma`
- `packages/shared/src/types/` (`auth.ts`, `customer.ts`)
- `apps/web/lib/api-client.ts`

### Verbatim Observations:

1. **`requireRole` Middleware Signature (`apps/api/src/middlewares/auth.ts:54`)**:

   ```typescript
   export function requireRole(allowedRoles: UserRole[]) {
     return async (request: FastifyRequest, reply: FastifyReply) => {
       const user = request.user as JwtUserPayload | undefined;
       if (!user) {
         return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
       }
       if (!allowedRoles.includes(user.role)) {
         return reply.status(403).send({
           error: 'Forbidden',
           message: `Role "${user.role}" does not have permission to access this resource`,
         });
       }
     };
   }
   ```
   - **Finding**: `requireRole` strictly accepts an array (`UserRole[]`). Passing a single string `requireRole('admin')` causes TypeScript compilation failures and runtime behavior issues (`allowedRoles.includes` on a string).

2. **Module Route Registration in `server.ts`**:
   - Routes in `server.ts` are registered with `{ prefix: '/api' }` (e.g., `server.register(customerRoutes, { prefix: '/api' })`).
   - Existing modules use either entity paths (`/api/customers`, `/api/staff`, `/api/roles`) or feature namespaces (`/api/kpi/*`, `/api/omicall/*`).

3. **Proposed 11 Endpoints Analysis**:
   - Proposed list:
     - Services (5): `GET /services`, `GET /services/:id`, `POST /services`, `PUT /services/:id`, `DELETE /services/:id`
     - Combos (3): `GET /combos`, `POST /combos`, `PUT /combos/:id`
     - Products (3): `GET /products`, `POST /products`, `PUT /products/:id`
   - **Finding**: `GET /combos/:id`, `DELETE /combos/:id`, `GET /products/:id`, and `DELETE /products/:id` are completely omitted. This leaves Combos and Products without single-resource retrieval or deletion capabilities.

4. **Legacy Database Entity Structure (`apps/api/prisma/legacy.prisma:119-150`)**:
   - Model `service`: Contains `id`, `service_key`, `service_type`, `service_group`, `duration_minute`, `position`, `is_disabled`, `date_created`, `date_updated`.
   - Model `service_language`: Contains `service_id`, `language_id`, `service_name`, `service_short_description`, `service_description`.
   - **Finding**: Deleting a service directly from DB violates foreign key integrity in legacy `order_service` tables. Soft deletion via `is_disabled = true` is mandated. `position` column indicates ordering support is required.

5. **Pagination & Query Parameters**:
   - Across `mos-lab` (e.g., `customers/routes.ts`), listing endpoints parse query string parameters `page` (default 1) and `limit` / `pageSize` (default 20), returning paginated structures.

6. **Shared Types (`packages/shared/src/types/customer.ts:327`)**:
   - Existing `Service` interface is rudimentary (`id`, `name`, `price`, `duration`). Full catalog management requires rich types for Services, Combos, Products, breakdown items, and pagination query/response envelopes.

---

## 2. Logic Chain

1. **Auth Middleware Signature**:
   - _Observation_: `requireRole` is defined as `(allowedRoles: UserRole[])`.
   - _Reasoning_: If route definitions use `requireRole('admin')`, TypeScript raises a type error. If overridden by type assertion, `.includes` checks characters of the string instead of role arrays, causing silent authorization bypass or unexpected 403 blocks.
   - _Conclusion_: Route registrations must use array syntax `requireRole(['admin'])` or `requireRole(['admin', 'manager'])`. Additionally, updating `requireRole` in `auth.ts` to accept `allowedRoles: UserRole | UserRole[]` provides defense-in-depth.

2. **RESTful Naming & Namespace**:
   - _Observation_: `server.ts` registers routes under `/api`.
   - _Reasoning_: Placing endpoints at `/api/services`, `/api/combos`, `/api/products` pollutes the top-level API namespace. Grouping under `/api/catalog/*` (`/api/catalog/services`, `/api/catalog/combos`, `/api/catalog/products`) establishes a clean module boundary, consistent with `/api/kpi/*` and `/api/omicall/*`.

3. **CRUD Incompleteness**:
   - _Observation_: The 11 proposed endpoints provide full CRUD for Services, but only List/Create/Update for Combos and Products.
   - _Reasoning_: Admin UI components require fetching single combo/product details (e.g. loading edit forms, showing preview modal) and deleting/deactivating items.
   - _Conclusion_: Baseline CRUD requires 15 endpoints (adding `GET /combos/:id`, `DELETE /combos/:id`, `GET /products/:id`, `DELETE /products/:id`).

4. **Soft Delete, Position & Operational Completeness**:
   - _Observation_: `legacy.prisma` includes `is_disabled` and `position` on `service`.
   - _Reasoning_: Hard deletes break historical order records. Drag-and-drop reordering is required for displaying services in booking forms. Admin workflows require bulk status changes.
   - _Conclusion_: The API specification must include status toggle/restore endpoints (`PATCH /catalog/services/:id/status`), reordering (`POST /catalog/services/reorder`), bulk status updates (`POST /catalog/services/bulk-status`), and category/group metadata listing (`GET /catalog/groups`, `GET /catalog/types`). This expands the total complete catalog suite to 22 endpoints.

---

## 3. Caveats

- **Read-Only Context**: This review produces architectural specifications and recommendations; no source code files under `apps/` or `packages/` were modified.
- **Legacy DB Multi-language Table**: Legacy MySQL schema uses `service_language` for Vietnamese titles and descriptions. Backend queries must perform appropriate `LEFT JOIN` or Prisma inclusion on `service_language` (where `language_id = 1` for VN).
- **PUT vs. PATCH**: While `PUT` is proposed for entity updates, `PATCH` should also be supported for partial updates (e.g., toggling active state or updating price without resending full image/description payloads).

---

## 4. Conclusion

### Summary of Critical Findings & Risk Ratings

| ID   | Issue Category                 | Severity / Risk | Finding Summary                                                                                                     | Recommended Action                                                                     |
| ---- | ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| R2-1 | **Middleware Signature**       | 🔴 **High**     | `requireRole` in `auth.ts` requires `UserRole[]`. Passing string `requireRole('admin')` breaks build / auth checks. | Use `requireRole(['admin'])`. Enhance `auth.ts` signature to `UserRole \| UserRole[]`. |
| R2-2 | **CRUD Incompleteness**        | 🔴 **High**     | Proposed 11 endpoints omit `GET` & `DELETE` for Combos and Products.                                                | Expand baseline CRUD from 11 to 15 endpoints.                                          |
| R2-3 | **Namespace Structure**        | 🟡 **Medium**   | Unprefixed `/services` pollutes root API namespace.                                                                 | Standardize under `/api/catalog/*` namespace.                                          |
| R2-4 | **Soft Delete & Reordering**   | 🟡 **Medium**   | Lacks `is_disabled` toggle, restore, and `position` reordering support.                                             | Add `PATCH /status`, `POST /restore`, and `POST /reorder` endpoints.                   |
| R2-5 | **Bulk & Metadata Operations** | 🔵 **Low**      | Missing bulk status toggle, selection endpoints, and category listing.                                              | Add bulk endpoints and `GET /catalog/groups`, `GET /catalog/select`.                   |

---

### Proposed Fix for `apps/api/src/middlewares/auth.ts`

```typescript
// Enhanced requireRole supporting both single string and array inputs
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtUserPayload | undefined;

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!rolesArray.includes(user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Role "${user.role}" does not have permission to access this resource`,
      });
    }
  };
}
```

---

### Complete 22-Endpoint Catalog API Specification Table

All endpoints are registered under `{ prefix: '/api/catalog' }` (or `/api`).

| #   | Method   | Endpoint Path           | Middleware / Roles                               | Description & Requirements                                         | Query / Body Params                                                                              | Response Structure                                                                |
| --- | -------- | ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | `GET`    | `/services`             | `requireAuth`                                    | List services with search, group filter, active status, pagination | `page=1&pageSize=20&search=mi&group=eyelash&type=Fix&isDisabled=false`                           | `{ success: true, data: Service[], meta: { page, pageSize, total, totalPages } }` |
| 2   | `GET`    | `/services/select`      | `requireAuth`                                    | Light non-paginated service list for UI dropdowns                  | `group=eyelash&isDisabled=false`                                                                 | `{ success: true, data: Array<{ id, name, price, duration, key }> }`              |
| 3   | `GET`    | `/services/:id`         | `requireAuth`                                    | Get single service detail with localized text & attribute sets     | Path: `id`                                                                                       | `{ success: true, data: ServiceDetail }`                                          |
| 4   | `POST`   | `/services`             | `requireAuth, requireRole(['admin', 'manager'])` | Create new service item                                            | Body: `{ name, serviceKey, serviceType, serviceGroup, durationMinute, price, description, ... }` | `201 Created` `{ success: true, data: Service }`                                  |
| 5   | `PUT`    | `/services/:id`         | `requireAuth, requireRole(['admin', 'manager'])` | Replace/update full service details                                | Path: `id`, Body: `UpdateServiceInput`                                                           | `{ success: true, data: Service }`                                                |
| 6   | `PATCH`  | `/services/:id`         | `requireAuth, requireRole(['admin', 'manager'])` | Partial update of service attributes                               | Path: `id`, Body: `Partial<UpdateServiceInput>`                                                  | `{ success: true, data: Service }`                                                |
| 7   | `DELETE` | `/services/:id`         | `requireAuth, requireRole(['admin'])`            | Soft delete service (`is_disabled = true`)                         | Path: `id`                                                                                       | `{ success: true, message: 'Service disabled successfully' }`                     |
| 8   | `POST`   | `/services/:id/restore` | `requireAuth, requireRole(['admin'])`            | Restore soft-deleted service (`is_disabled = false`)               | Path: `id`                                                                                       | `{ success: true, data: Service }`                                                |
| 9   | `POST`   | `/services/reorder`     | `requireAuth, requireRole(['admin', 'manager'])` | Update display `position` order for drag-and-drop                  | Body: `{ items: Array<{ id: number, position: number }> }`                                       | `{ success: true, message: 'Positions updated' }`                                 |
| 10  | `POST`   | `/services/bulk-status` | `requireAuth, requireRole(['admin'])`            | Bulk enable/disable services                                       | Body: `{ ids: number[], isDisabled: boolean }`                                                   | `{ success: true, updatedCount: number }`                                         |
| 11  | `GET`    | `/combos`               | `requireAuth`                                    | List combos with pagination & filters                              | `page=1&pageSize=20&search=combo&isDisabled=false`                                               | `{ success: true, data: Combo[], meta: { page, pageSize, total, totalPages } }`   |
| 12  | `GET`    | `/combos/:id`           | `requireAuth`                                    | Get combo detail with constituent services & price breakdown       | Path: `id`                                                                                       | `{ success: true, data: ComboDetailWithServices }`                                |
| 13  | `POST`   | `/combos`               | `requireAuth, requireRole(['admin', 'manager'])` | Create new combo package                                           | Body: `{ name, code, price, services: Array<{ serviceId, count, priceOverride }> }`              | `201 Created` `{ success: true, data: Combo }`                                    |
| 14  | `PUT`    | `/combos/:id`           | `requireAuth, requireRole(['admin', 'manager'])` | Update combo package                                               | Path: `id`, Body: `UpdateComboInput`                                                             | `{ success: true, data: Combo }`                                                  |
| 15  | `DELETE` | `/combos/:id`           | `requireAuth, requireRole(['admin'])`            | Soft delete combo package                                          | Path: `id`                                                                                       | `{ success: true, message: 'Combo disabled' }`                                    |
| 16  | `GET`    | `/products`             | `requireAuth`                                    | List products with pagination & search                             | `page=1&pageSize=20&search=serum&category=skincare`                                              | `{ success: true, data: Product[], meta: { page, pageSize, total, totalPages } }` |
| 17  | `GET`    | `/products/:id`         | `requireAuth`                                    | Get single product detail                                          | Path: `id`                                                                                       | `{ success: true, data: ProductDetail }`                                          |
| 18  | `POST`   | `/products`             | `requireAuth, requireRole(['admin', 'manager'])` | Create new retail product                                          | Body: `{ name, code, price, stockQuantity, category, description }`                              | `201 Created` `{ success: true, data: Product }`                                  |
| 19  | `PUT`    | `/products/:id`         | `requireAuth, requireRole(['admin', 'manager'])` | Update retail product                                              | Path: `id`, Body: `UpdateProductInput`                                                           | `{ success: true, data: Product }`                                                |
| 20  | `DELETE` | `/products/:id`         | `requireAuth, requireRole(['admin'])`            | Soft delete retail product                                         | Path: `id`                                                                                       | `{ success: true, message: 'Product disabled' }`                                  |
| 21  | `GET`    | `/groups`               | `requireAuth`                                    | Get distinct service groups & categories                           | None                                                                                             | `{ success: true, data: Array<{ key: string, name: string, count: number }> }`    |
| 22  | `GET`    | `/types`                | `requireAuth`                                    | Get distinct service types (Fix, Adjust, Log, etc.)                | None                                                                                             | `{ success: true, data: Array<{ key: string, label: string }> }`                  |

---

## 5. Verification Method

Once implemented, the catalog module can be independently verified using the following steps:

1. **Static Analysis & Type Checking**:
   - Run `pnpm --filter @mos-lab/api check` (or `npx tsc --noEmit`) to verify TypeScript type compliance across routes and auth middleware.
   - Run `pnpm --filter @mos-lab/shared build` to verify shared types export cleanly.

2. **Middleware Verification**:
   - Inspect route handlers to confirm all `preHandler` declarations use array syntax: `preHandler: [requireAuth, requireRole(['admin', 'manager'])]`.

3. **Functional API Integration Tests**:
   - Verify pagination bounds (`page=1&pageSize=10`) return correct `meta.totalPages` and `meta.total`.
   - Verify soft delete sets `is_disabled = true` in legacy database instead of deleting table rows.
   - Verify drag-and-drop reordering updates `position` values atomically.
