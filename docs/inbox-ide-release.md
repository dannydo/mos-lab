# IDE release checkpoint contract

Outcome: after the trusted deploy runner has pushed and production deployment has completed, it reads the live release markers and posts immutable metadata to `POST /api/ide-release-checkpoints/:ticketId`. The native ticket moves to reporter acceptance; it never deploys, accepts, or closes itself.

Authority: only `Authorization: Bearer $MOS_IDE_RELEASE_CHECKPOINT_TOKEN` is accepted. The independently configured publisher token must be at least 32 characters. Browser Inbox controls and direct-DB scripts are not release inputs. Normal product work retains code/test, commit, deploy and reporter gates.

Owner: Fastify Inbox service; CRM jobs and append-only audits are authoritative. No legacy writes, migration, date calculation or new ticket. The server captures an immutable review manifest (job/source/plan, base commit, binary patch hash, files, tests); commit and deploy approvals reference that manifest. Old jobs without these bindings fail closed, never backfill approvals.

Evidence: payload `{ jobId, manifestDigest, commitSha, apiRelease, webRelease }` must exactly match server-derived evidence. A full commit hash in the native job, matching deploy approval, has a parent and binary patch matching the worker-captured review manifest. The trusted API DEPLOY_COMMIT marker and Git ancestry prove deployed API code; the fixed production web version endpoint must prove the web release for frontend changes.

Publisher: `scripts/request-classifier-worker.ts` receives the immutable manifest digest only when the server leases a native DEPLOY job. It calls no checkpoint endpoint until `runTrustedProductionDeploy` has returned successfully, then independently reads API (and, where needed, web) markers and verifies the approved commit is an ancestor of each. It uses the separately configured `MOS_IDE_RELEASE_CHECKPOINT_TOKEN`, never logs it, and retries only the byte-identical receipt after a transport/502/503/504 failure. A missing token, marker, digest, ancestry match or endpoint acknowledgement leaves the job at `AWAITING_DEPLOY_REVIEW`; it never creates a synthetic failure, acceptance, audit or notification.

Mutation: one locked ticket transaction rechecks current source/plan, job, approvals and manifest. One success audit `IDE_RELEASE_CHECKPOINT_RECORDED` is the durable idempotency receipt; exact retries return it, conflicting/stale attempts fail closed without a mutation. Resolution, job, ticket, comment, audit and notification commit together. No git writes, worker scheduling, commit, push, deploy or reporter acceptance comes from this action.

UI: Inbox has no manual release-record action. Its existing server workflow projection renders the resulting Awaiting Reporter Acceptance state and reporter next action.

Verification: manifest/approval binding, Git evidence, absent/mismatched/stale/unauthorized cases, rollback, sequential/concurrent retry and API/UI projections. Live production QA may stop at a real missing-evidence rejection; never fabricate production approval/evidence or mutate unrelated tickets.
