# 🚀 AI Agent Development Guide for mos-lab

> Canonical compact index (`<= 15 KB` so it never truncates). Start with [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for package routing & verification commands, and read **only** the `docs/rules/*.md` or scoped `AGENTS.md` guide matching your task.

---

## 1. Mandatory Global Invariants

### A. Voice Chat, Double-Control & Anti-Clashing

- **Double-Control Shortcut**: macOS LaunchAgent `com.antigravity.double-control` (`/Users/dannydo/.gemini/antigravity/bin/double-control-listener`) focuses **Antigravity** and sends `Control + M` on double-Control.
- **Speak Once at Turn End**: At the end of **every direct reply to Danny**, call `/Users/dannydo/.gemini/antigravity/bin/speak "<2-3 concise Vietnamese sentences>"` (`vi-VN-HoaiMyNeural`) via `run_command` (`BypassSandbox: true`). Sync with Hột Mít (`/tmp/voice_hud.json`) if running.
- **Anti-Voice-Clashing & Anti-Echo**:
  - Call `speak` **at most once** per user turn. **NEVER** call `speak` on system-only `<SYSTEM_MESSAGE>` background task completion notifications.
  - When a bridge/background worker (`ide-task-bridge.ts`, deploy worker) already spoke (`speakAsync`), **do NOT** repeat the same narration via `speak` (say nothing or a single ultra-short status phrase).
  - Architecture & daemons handbook: [docs/VOICE_SYSTEM_ARCHITECTURE.md](docs/VOICE_SYSTEM_ARCHITECTURE.md).

### B. Zero-Friction Execution Invariants

1. **Never Guess Binaries & Paths**: Verify with `which <cmd>` / `test -f` before invoking.
2. **Defensive Terminal Reading**: Use safe fallbacks (`cat file 2>/dev/null || true`) so reads never crash with exit code 1.
3. **Workspace Anchoring**: Keep `Cwd` at `/Users/dannydo/projects/mos-lab` and anchor `.env` paths from repo root.
4. **Pre-edit Context Freshness**: Re-read ~15-20 lines around edited targets before patching to prevent stale matches.
5. **Tool Scope Discipline**: Use `write_file`/`edit_file` for workspace code & `brain/` artifacts; use shell/Python for system files outside the workspace.
6. **Mandatory Turn-End Task GC & Hard Timeouts**:
   - Before ending a turn or calling `speak`, run `manage_task(Action: 'list')` and `kill` any non-daemon background task lingering >45s or orphaned.
   - Wrap one-off Node/Playwright/DB scripts with explicit timeout (`setTimeout(() => process.exit(1), 25000).unref()`), `try/finally` cleanup (`browser.close()`, `conn.end()`, `process.exit(0)`), and `AbortSignal.timeout(10_000)` on network calls. Exclude `{.next,node_modules,dist,.turbo,coverage}` in `grep`.
7. **Comment-First Ticket Context**: For mOS Inbox tickets, query latest `crm_bug_report_comments` directly from DB first, address every technical question directly, and sync replies back to ticket comments.

### C. Wings Respectful Language & `CV🪶` Vector Feather Invariant

- **Strictly Forbidden**: NEVER use `"thợ"`, `"thợ mi"`, `"thợ kỹ thuật"`, `"thợ tự chủ"`, `"thợ lash"`, `"thợ cứng"`, `"tay nghề thợ"`, or legacy `"CV+"` / `"CV++"` in UI copy, identifiers, comments, docs, or playbooks.
- **Required Terms & Codes**:
  - `CV` (`Chuyên Viên` / `Chuyên Viên Mi` / `Chuyên Viên Kỹ Thuật`)
  - `CVL` (`Chuyên Viên Tự Chủ` — equivalent to `CV🪶`, `CV Lông`, `CV 1L`, etc.)
  - `CVLL` (`Chuyên Viên Tự Chủ Cấp Cao` — equivalent to `🪶CV🪶`, `CV 2 lông`, `CV 2L`, etc.)
  - `Thiên Thần` (staff collective) · `Nghệ Nhân Mi` (master lash artisan).
- **UI Vector Feather Invariant**: NEVER render raw Unicode `'🪶'` (U+1FAB6) on Web/iOS UI (macOS/iOS renders it like a baguette at small sizes). Always use `<CvFeather1Badge />`, `<CvFeather2Badge />`, or `<FeatherSvg />` (`lucide-react`, amber `#FFB400` / `#F59E0B`).
- **Sole Legacy SQL Exception**: Only `ugl.user_group_name LIKE '%Thợ%'` inside legacy MySQL queries (never exposed to UI).

### D. Zero-Trust Admin-Only Default & `/ios-app` `CV🪶` Privacy (`UI-010`)

- **4-Layer Zero-Trust Default**: Every new feature, `/dashboard/*` page, menu item, and API defaults to **`admin` / `super_admin` only** across (1) `sidebar.config.tsx`, (2) `DashboardLayout` + `isNonAdminAllowedDashboardPath`, (3) Backend `resolveMenuKeysForApiPath` → `__ADMIN_ONLY_DEFAULT__` (`403`), and (4) explicit Danny sign-off to unlock other roles.
- **`/ios-app` Access & `CVL` Scope**: Only `CVL`, `CVLL`, `CC`, and `Admin / Super Admin` (`canAccessIosConsultationApp`) may enter `/ios-app`. Non-admin `CVL` accounts are role-locked (`MY_CUSTOMERS`), masked-phone, and see ONLY unassigned head-slot queue customers (`Đầu tua`) plus their own assigned bookings (`filterBookingsForCvlScope`).

### E. Execution Safety, Intent Clarification & Kinh Thánh mOS

- **Intent Clarification Guard**: If a request is ambiguous or touches Production/DB mutations, clarify target server, DB, command, blast radius, and rollback first — never execute blindly.
- **Orb Local-First**: Test VPS/PHP/backfill scripts on `ssh root@ubuntu@orb` before proposing Production runs (which always require explicit approval).
- **Workspace Isolation & Credentials**: Never modify files outside `/Users/dannydo/projects/mos-lab` without explicit confirmation; never commit passwords, keys, tokens, or cookies (use `~/.ssh/config` aliases & env vars).
- **Kinh Thánh mOS Canon**: Business rule definitions live in `packages/shared/src/business-rules/mos-bible.ts` ([docs/kinh-thanh-mos/README.md](docs/kinh-thanh-mos/README.md)). Update the corresponding Commandment (`REVISED`/`RETIRED` for history, never silent delete) whenever business logic changes; backend services remain the sole execution truth.

---

## 2. Quick Commands & Monorepo Map

| Package / Path    | Purpose                                                  | Runtime    |
| ----------------- | -------------------------------------------------------- | ---------- |
| `packages/shared` | Shared DTOs, constants, system tokens, `@mos-lab/shared` | TS watcher |
| `apps/api`        | Fastify 5 API, Prisma CRM CRUD & approved legacy reads   | `:4001`    |
| `apps/web`        | Next.js 16 + Ant Design 5 + Tailwind v4 CRM & `/ios-app` | `:4000`    |
| `apps/ads-portal` | Next.js 16 + Python ads/lead portal                      | `:8000`    |

- `pnpm dev` — start all dev servers
- `pnpm verify:quick` — lint (`turbo lint` + `check:ui-contract` + `check:code-health`), all-package `typecheck`, API + Web tests
- `pnpm verify` — `verify:quick` + full `pnpm build`
- `pnpm --filter @mos-lab/api prisma:generate` / `prisma:migrate:crm` / `prisma:db:pull:legacy`

---

## 3. Core Coding & File-Size Guardrails

1. **Shared Types**: Define cross-package DTOs/constants in `packages/shared/src/` and rebuild `@mos-lab/shared` before consuming in `apps/*`.
2. **Typed Frontend API Calls**: Always use `apiClient` (`apps/web/lib/api-client.ts`) — never raw Axios or raw `fetch()` calls inside feature/iOS modules.
3. **Backend `.js` Extensions & Prisma Boundaries**: Relative imports in `apps/api` MUST end in `.js` (`NodeNext`). `fastify.prisma.crm` allows CRUD; `fastify.prisma.legacy` is **READ-ONLY** on transactional tables (`order`, `order_service`, `user`, `user_profile`, `staff_bonus`, `user_service_balance`) — write exception only for `/api/catalog/*` master metadata (`service*`, `product*`) protected by `requireRole(['admin'])` inside `$transaction`.
4. **UI & Theme Parity**: Support `.light-theme` and `.dark-theme` equally, use `tabular-nums` for dynamic numbers/timers, and anchor Drawer `[✕]` close buttons top-right (`closable: { placement: 'end' }` via `AdaptiveDrawer`).
5. **Code-Health Ratchet (`<= 650 LOC`)**: Keep new TS/TSX source modules `<= 650 LOC` (`pnpm check:code-health`) so AI agents can read & edit modules cleanly in a single pass. Never grow baseline legacy monoliths.

---

## 4. Domain Rules & Scoped `AGENTS.md` Routing Table

Read **only** the guide(s) relevant to the files you are modifying:

| Domain / Task                                                                                                    | Authoritative Guide                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Quickstart, verification recipes, source-of-truth routes                                                         | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)                                               |
| Light/Dark theme, Tailwind+Antd, `<Table>`, `ColumnsType`, `<CvDatePicker>`, SVG/Modal zIndex, icons             | [docs/rules/ui-theme-and-tables.md](docs/rules/ui-theme-and-tables.md)                   |
| mOS Inbox 3-Gate Bridge (`UI-007`), Night Shift, Orb local-first, Safety & Credentials                           | [docs/rules/inbox-and-ide-bridge.md](docs/rules/inbox-and-ide-bridge.md)                 |
| Booker salary/booked KPI, Telesales leaderboard, Allocation batches, LoCa 8 touchpoints, OmiCall SIP             | [docs/rules/sales-booker-and-telesales.md](docs/rules/sales-booker-and-telesales.md)     |
| CC Bonus/Tip (`TIP-001`)/VAT 8% (`VAT-001`)/Daily Sales/1.5x Wheel, FAL, EOM, Order SOP, CV Speed/Leave/Branches | [docs/rules/salon-ops-and-cv-rules.md](docs/rules/salon-ops-and-cv-rules.md)             |
| Combo recognition & bounds, VND rounding, Vietnamese tone-insensitive search, Hook deps, Constants               | [docs/rules/catalog-and-data-conventions.md](docs/rules/catalog-and-data-conventions.md) |
| `/ios-app` Frontend (step map, `UI-010`, `OPS-003` 7/7 diagnostic, `OPS-004` simulation)                         | [apps/web/app/ios-app/AGENTS.md](apps/web/app/ios-app/AGENTS.md)                         |
| `/api/ios` Backend (MySQL/CRM repo, batch SQL, simulation isolation, Legacy PHP step sync)                       | [apps/api/src/modules/ios/AGENTS.md](apps/api/src/modules/ios/AGENTS.md)                 |
| `/api/chat` Backend (15 route plugins, relational write-through, locks, SSE & access guards)                     | [apps/api/src/modules/chat/AGENTS.md](apps/api/src/modules/chat/AGENTS.md)               |
| mOS Chat Frontend (`MosGoogleChatPortal`, 21 hooks, `shared/` headless hooks, `mobile/` & Desktop UI slices)     | [apps/web/components/mos-chat/AGENTS.md](apps/web/components/mos-chat/AGENTS.md)         |
| mOS Mission / Bug Inbox API & Workers (`bug-report.service`, `routes/`, timing, health, classifier)              | [apps/api/src/modules/bug-reports/AGENTS.md](apps/api/src/modules/bug-reports/AGENTS.md) |
| Voice Chat, Hột Mít & 5 background daemons                                                                       | [docs/VOICE_SYSTEM_ARCHITECTURE.md](docs/VOICE_SYSTEM_ARCHITECTURE.md)                   |
