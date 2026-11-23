# mOS Chat Frontend (`apps/web/components/mos-chat/`) — Scoped AI Agent Guide

> Keep every module `<= 650 LOC` and preserve public barrel exports (`MosGoogleChatPortal`, `MosChatContext`, `MosChatComposer`, `MosChatSidebar`, `MosChatMessageFeed`, `MosChatThreadDrawer`, `MosChatMobileThreadSheet`).

---

## 1. Module Architecture Map

- **`MosGoogleChatPortal.tsx`** (~376 LOC): Thin portal shell delegating state to `usePortalStateWiring` and UI to `MosChatMobileApp`, `MosChatDesktopSidebarPane`, `MosChatDesktopMainColumn`, `MosChatDesktopThreadAndDrawers`, `MosChatDesktopOverlays`, and `MosChatPortalModalStack`.
- **`hooks/` (21 domain hooks)**: Layout/resize, avatar/presence, AI & access control, dock state, composer refs, sidebar prefs & actions, bootstrap/realtime sync, read sync, attachments/paste, navigation/shortcuts, keyboard autofocus, message mutations, mention autocomplete, spaces/dock actions, message sending, task modals/actions, mission actions, UI adapters, and `usePortalStateWiring`.
- **`context/` (`MosChatContext.tsx` + 5 hooks)**: Shared Chat/Mobile context provider split across bootstrap/sync, message mutations, message send & media, space actions, and task/mission actions.
- **`shared/` (Desktop + Mobile headless hooks & utils)**: `useChatAiCopilotState`, `useChatReadReceipts`, `useChatThreadMissionState`, `useChatSwipeAndDoubleTap`, and `convertAttachmentToDataUrl`.
- **`components/` (Desktop UI & Shared Feed/Composer/Sidebar/Thread slices)**:
  - **Sidebar**: `MosChatSidebar` + `Header`, `SectionGroup`, `ConvRow`, `ConvMenu`.
  - **Feed**: `MosChatMessageFeed` + `PinnedBanner`, `MoveToThreadPopover`, `MessageItem`, `MessageBubble`, `MessageAiExtras`, `MessageThreadAndReactions`, `MessageActionBar`.
  - **Composer**: `MosChatComposer` + `Mobile` / `Desktop`.
  - **Thread**: `MosChatThreadDrawer` (`.types.ts`) + `PaneBar`, `RootHeader`, `ReplyItem`, `ReplyInlineEditor`, `ReplyMoreMenu`, `MoveReplyPopover`, `ThreadComposer` (+ `Mobile`/`Desktop`).
  - **Modals / Pane Wrappers**: `MosChatModals`, `MosChatPortalModalStack`, `MosChatDesktopHeader`, `MosChatDockedWindows`, `MosChatFilesPane`.
- **`mobile/`**: `MosChatMobileApp`, `MosChatMobileInbox`, `MosChatMobileThreadSheet` + `MissionCard`, `ThreadParentCard`, `ThreadParentTaskCard`, `ThreadReplyItem`, `ThreadComposer`, `ThreadOverlays`.
- **`modals/`, `utils/`, `constants/`, `store/`**: Specialized modal views, `chat-helpers.ts`, `portal-*.ts*` helpers, constants, and realtime dedupe store.

---

## 2. Core Invariants

1. **650-LOC Cap & `.js`-Free Web Imports**: Every `.ts`/`.tsx` production file here MUST remain `<= 650 LOC`. Use `apiClient` (`apps/web/lib/api-client.ts`), never raw Axios/`fetch()`.
2. **React Compiler Memoization**: Depend on full objects (`[activeConversation]`, `[currentUser]`) inside `useMemo`/`useCallback`, never optional-chained sub-properties (`[activeConversation?.messages]`). Do not copy stale `eslint-disable` comments.
3. **Vitest Mock Contracts (Do Not Break)**:
   - Keep `MosChatCustomerPickerModal` and `MosChatRichEditorModal` imported directly (never via `next/dynamic`) inside `mobile/MosChatMobileThreadOverlays.tsx` so `MosChatMobileThreadCustomerAttachment.test.tsx` mocks match.
   - Keep image compression helpers imported from `../utils/chat-helpers` in attachment hooks for `MosGoogleChatPortal.test.tsx`.
4. **Theme, Feather & Density Parity**: Equal support for `.light-theme` and `.dark-theme`, `tabular-nums` on dynamic counters/timestamps, top-right Drawer close icons (`AdaptiveDrawer`), and vector feather badges (`<CvFeather1Badge />` / `<FeatherSvg />`, NEVER Unicode `'🪶'`).
5. **Sequential Heavy Commands**: Run Vitest, ESLint, and Next.js build strictly one at a time to avoid worker fork CPU timeouts.

---

## 3. 3-Step Change & Verify Recipe

1. **Shared Contracts (`packages/shared/src/types/mos-chat.ts`)**: Update DTOs first and run `pnpm --filter @mos-lab/shared build`.
2. **Target Slice (`hooks/` / `shared/` / `components/` / `mobile/`)**: Implement change in the matching `<= 650 LOC` module (keep shared business logic in `shared/hooks/`).
3. **Verify Sequentially**:
   ```bash
   (cd apps/web && pnpm exec eslint --max-warnings=0 components/mos-chat/)
   pnpm --filter @mos-lab/web exec vitest run components/mos-chat/__tests__/
   pnpm --filter @mos-lab/web typecheck
   ```
