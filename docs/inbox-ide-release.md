# IDE release checkpoint contract

Outcome: Danny records an already approved, actually deployed implementation without pretending a worker ran. The native ticket moves to reporter acceptance, never closes itself.

Authority: existing canonical Danny super_admin guard for preview and confirmation; authenticated worker evidence remains separate from human approval. Normal product work retains code/test, commit, deploy and reporter gates. Technical Inbox/control-plane improvements may be directly implemented/released when explicitly authorized; this does not fabricate ticket approvals.

Owner: Fastify Inbox service; CRM jobs and append-only audits are authoritative. No legacy writes, migration, date calculation or new ticket. The server captures an immutable review manifest (job/source/plan, base commit, binary patch hash, files, tests); commit and deploy approvals reference that manifest. Old jobs without these bindings fail closed, never backfill approvals.

Evidence: a full commit hash in the native job, matching deploy approval, whose parent and binary patch match the worker-captured review manifest. The trusted API DEPLOY_COMMIT marker and Git ancestry prove deployed API code; the fixed production web version endpoint must prove the web release for frontend changes. Browser requests contain only the reviewed evidence token and acknowledgment, never approval identities, test results or release claims.

Mutation: one locked ticket transaction rechecks current source/plan, job, approvals and manifest. One success audit is the durable idempotency receipt; exact retries return it, conflicting/stale attempts fail. Resolution, job, ticket, comment, audit and notification commit together. Authorized validation rejections retain a separate reason audit but never success/checkpoint/notification effects. No git writes, worker scheduling, commit, push, deploy or reporter acceptance from this action.

UI: existing drawer with a dedicated AdaptiveModal and typed SDK; server preview explains missing evidence, confirmation locks duplicate clicks, errors stay visible, success hydrates detail and refreshes Inbox. No new persistence/pagination. Desktop >=1440x900, phone, both themes and accessible loading/error states.

Verification: manifest/approval binding, Git evidence, absent/mismatched/stale/unauthorized cases, rollback, sequential/concurrent retry, API projections and UI hydration. Live production QA may stop at a real missing-evidence rejection; never fabricate production approval/evidence or mutate unrelated tickets.
