# Responsive Phase 0 QA Inventory — 2026-08-13

## Scope

Phase 0 captures the current UI as evidence. It does not claim that the existing pages are responsive or visually approved.

Representative routes:

- `/dashboard`
- `/dashboard/customers`
- `/dashboard/appointments`
- `/dashboard/today`
- `/dashboard/schedule-calendar`
- `/dashboard/catalog`
- `/dashboard/qa-shop`

## Claims that require evidence

| Claim                                                  | Functional check                              | Visual state                   | Evidence                                      |
| ------------------------------------------------------ | --------------------------------------------- | ------------------------------ | --------------------------------------------- |
| Dev authentication can open protected dashboard routes | Obtain mock token, seed storage and navigate  | Authenticated default page     | Capture manifest final URL and screenshot     |
| QA presets reproduce the agreed device matrix          | Create a fresh context for every preset       | Initial viewport               | Manifest viewport dimensions                  |
| Both themes can be captured deterministically          | Seed `mos_theme` before navigation            | Dark and light default state   | Paired screenshots                            |
| WebKit catches early Safari-engine layout differences  | Launch the same smoke routes with WebKit      | iPhone/iPad portrait/landscape | WebKit manifest and screenshots               |
| Page-level horizontal overflow is detected             | Compare document scroll/client width          | Initial above-the-fold state   | Manifest metrics                              |
| Visible elements outside the viewport are discoverable | Inspect visible element bounds                | Initial above-the-fold state   | Overflow candidate list                       |
| Evidence is safe to keep as a local QA artifact        | Sanitize data regions before capture          | Every screenshot               | `sanitized: true`; output remains git-ignored |
| Network failures represent product risk, not avatars   | Stub known external image hosts in QA context | Every screenshot               | `0` failed request in summaries               |

## Controls and state transitions sampled

- Authentication state: unauthenticated origin → authenticated dashboard route.
- Theme state: dark → light in isolated browser contexts.
- Viewport state: iPhone 12 portrait/landscape, iPad portrait/landscape, desktop, FHD and 4K.
- Route state: seven representative application archetypes.
- Load state: initial route render after a short deterministic settle window.
- Customers interaction states: advanced filter drawer, booking wizard drawer, random selector modal, customer detail drawer và empty results.
- WebKit smoke: Customers, Today và Schedule Calendar tại iPhone/iPad portrait và landscape; Customer interaction states tại iPhone/iPad/FHD.

## Visual checks

- App Shell: sidebar/header/content boundaries.
- Page-level horizontal overflow.
- Header action clipping or crowding.
- Fixed-width table, chart, calendar and modal surfaces visible above the fold.
- Content padding and information density by viewport.
- Light/dark surface consistency.
- Mobile primary context visibility.

## Exploratory scenarios

1. iPhone 12 landscape: short viewport height may expose header/content collision even when width appears adequate.
2. 4K: fixed content composition may create excessive empty space or fail to surface additional useful information.
3. API/data delay: a route may render a stable shell but later overflow when dense data arrives.
4. Internal scroll containers: document metrics may pass while a required region is visibly clipped; screenshots remain the primary evidence.

## Intentional exclusions

- No task is marked responsive-pass in Phase 0.
- Destructive or data-mutating controls are not exercised.
- Interaction baseline không thực hiện submit/mutation; các step sâu hơn bên trong drawer/modal sẽ được bổ sung ở phase của workflow tương ứng.
- Loading/error state có timing không ổn định được deferred; empty state đã được capture có chủ đích bằng truy vấn không có kết quả.
- Native-window DPI behavior is deferred to the system hardening phase.
- Playwright WebKit is early engine coverage, not a replacement for a physical-device Safari acceptance test.
