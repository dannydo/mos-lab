# `/api/chat` Backend Module — Scoped AI Agent Guide

> Keep changes modular (`<= 650 LOC` per source file) and preserve the public barrel exports in `routes.ts`.

---

## 1. Module Architecture Map (`apps/api/src/modules/chat/`)

- **`routes.ts`** (~80 LOC): Canonical Fastify plugin `mosChatRoutes` & public re-export barrel (consumed by `server.ts`, `notifications/routes.ts`, and unit tests).
- **Domain Route Plugins (`routes/*.routes.ts`, 15 files `<= 550 LOC`)**:
  - `bootstrap.routes.ts` — `/chat/bootstrap`, `/chat/unread-summary`, `/chat/user-prefs`, `/chat/access-config`
  - `media-and-tts.routes.ts` — uploads (`/chat/upload-*`), range-streamed `/chat/media/:fileName`, Hoài My `/chat/tts`
  - `messages-send-forward.routes.ts` — `POST /chat/messages`, `POST /chat/messages/forward`
  - `threads.routes.ts` — `POST /chat/threads`, `/extract-checklist`, `/threads/move`
  - `messages-engagement.routes.ts` — `/reaction`, `/pin`, `/buzz`
  - `messages-edit-delete.routes.ts` — `PUT`/`DELETE`/`POST restore` on `/chat/messages/:messageId`
  - `tasks-create.routes.ts` & `tasks-manage.routes.ts` — `POST /chat/tasks`, `PATCH`/`DELETE /chat/tasks/:taskId`
  - `conversations-read-pin.routes.ts` — `POST /chat/conversations`, `/read`, `/threads/:messageId/read`, `/unread`, `/pin`
  - `conversations-members-config.routes.ts` — `/members`, `/nickname`, `PATCH /chat/conversations/:id`
  - `missions.routes.ts` — `POST /chat/missions`, `/chat/missions/:reportId/action`
  - `workflows.routes.ts` — `/chat/workflows*`
  - `realtime-and-search.routes.ts` — SSE `/chat/stream`, `/chat/sync`, paginated `/messages`, `/search`
  - `voice-calls.routes.ts` — `/chat/calls/*`
  - `push-and-workspace.routes.ts` — `/chat/push/*`, `/chat/google-workspace/preview`
- **State, Defaults & Helpers**:
  - `chat-state-store.ts` — In-memory snapshot + relational write-through + debounced `crm_config` backup (`loadChatState`, `saveConversations`, `saveTasks`, `saveUserSidebarPrefs`, `saveAccessConfig`).
  - `chat-state-defaults.ts` — Retention constants, default seeds, and preference/access normalizers.
  - `chat-thread-task-helpers.ts` — `deduplicateTasks`, `moveChatThreadItemInMemory`, `withTaskMutationLock`.
  - `chat-staff-directory.service.ts` — Cached staff & team directory (`loadStaffDirectoryCached`).
- **Supporting Services**: `chat-repository.service.ts`, `chat-realtime.hub.ts`, `chat-access.service.ts`, `chat-format.service.ts`, `chat-file.service.ts`, `chat-forward.service.ts`, `chat-voice-call.service.ts`, `chat-web-push.service.ts`, `chat-workflow.service.ts`, `chat-google-workspace.service.ts`, `chat-mission-bridge.service.ts`, `chat-bulk-sync.ts`.

---

## 2. Core Invariants

1. **Relational Write-Through + `crm_config` Backup**: Always persist conversation/message/thread/task mutations through `saveConversations` / `saveTasks` with targeted `hint` (`touchedMessage`, `touchedReply`, `touchedTask`, etc.) so O(1) relational upserts stay on the critical path while `crm_config` snapshots debounce cleanly.
2. **Mutation Serialization**: Wrap conversation/message writes with `withChatMutationLock` (`chat-repository.service.ts`) and task updates/deletes with `withTaskMutationLock` (`chat-thread-task-helpers.ts`).
3. **Cache & Notification Invalidation**: `saveConversations`, `saveTasks`, and `saveUserSidebarPrefs` automatically advance `memoryChatCache.version` (invalidating `/chat/unread-summary` per-version cache) and call `invalidateNotificationsCache()`.
4. **Access & Privacy Guards**: Every room/message/search/preview endpoint MUST enforce `canUserAccessConversation(conv, user, staffDirectory)` and `evaluateCanUserAccessMosChat`.
5. **NodeNext `.js` Imports & 650-LOC Ceiling**: Every relative import in `apps/api/src/modules/chat/**` MUST end with `.js` and every production `.ts` file MUST stay `<= 650 LOC`.

---

## 3. 3-Step Recipe: Adding or Modifying a Chat Endpoint

1. **Shared DTOs (`packages/shared/src/types/mos-chat.ts`)**: Define request/response types first and run `pnpm --filter @mos-lab/shared build`.
2. **Domain Route Plugin (`apps/api/src/modules/chat/routes/*.routes.ts`)**: Add/update the route in the matching domain plugin (keeping `<= 650 LOC`); reuse `loadChatState`, `saveConversations`/`saveTasks`, and `chatRealtimeHub`.
3. **Test & Verify**:
   ```bash
   pnpm --filter @mos-lab/api typecheck
   pnpm --filter @mos-lab/api exec tsx --test src/modules/chat/*.test.ts
   ```
