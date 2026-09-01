# `@mos-lab/shared`

Canonical cross-package contracts for the Fastify API and both Next.js applications.

Import public types, constants, theme tokens, and utilities from the package root:

```ts
import { ACTIVE_LASH_SALONS, type Customer, removeVietnameseTones } from '@mos-lab/shared';
```

## Ownership

- `src/types/`: request/response DTOs and domain models, grouped by feature.
- `src/constants/system-constants.ts`: business numbers, IDs, thresholds, and shared configuration.
- `src/theme/tokens.ts`: responsive, density, typography, and design tokens.
- `src/utils/`: pure utilities safe to use in API and browser packages.
- `src/index.ts`: the only public barrel; add every new public contract here.

Do not create a second barrel under `src/types`, redefine a shared DTO in an app, or import internal source paths from consumers.

```bash
pnpm --filter @mos-lab/shared lint
pnpm --filter @mos-lab/shared typecheck
pnpm --filter @mos-lab/shared build
```
