# Direct technical Inbox hotfix contract

Outcome: an explicitly authorized control-plane hotfix may record its own
production checkpoint without invoking Inbox approval controls. Product tickets
continue to require their normal Danny approval gates.

Authority: a local, operator-only command supplies no client evidence. The API
service reads the current report/job/plan/review manifest, canonical active
Danny identity, Git object graph, PM2 deployment marker, and fixed production
web marker. It has no HTTP route and cannot schedule a worker, commit, push or
deploy.

Mutation: only an `AWAITING_COMMIT_REVIEW` current job can be advanced. One
transaction records direct authorization and the same reporter-acceptance
checkpoint used by the normal release flow. A digest receipt makes exact retry
idempotent; stale or mismatched evidence fails closed.

Verification: focused service tests cover valid direct evidence, missing/stale
evidence, retry/concurrency, and the normal IDE approval path. Production
verification must observe the temporary reporter-acceptance state before an
explicit reporter acceptance can close the technical ticket.
