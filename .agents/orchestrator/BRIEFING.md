# BRIEFING — 2026-07-28T09:08:58+07:00

## Mission

Orchestrate and manage the refactoring of standard search filtering across all CRM dashboard modules in mos-lab (apps/web & apps/api) to support tone-insensitive & case-insensitive Vietnamese search (`removeVietnameseTones`).

## 🔒 My Identity

- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/dannydo/projects/mos-lab/.agents/orchestrator
- Original parent: parent
- Original parent conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6

## 🔒 My Workflow

- **Pattern**: Project / Canonical
- **Scope document**: /Users/dannydo/projects/mos-lab/.agents/orchestrator/PROJECT.md

1. **Decompose**: Decomposed into 5 milestones (M1: Exploration & Search Utility Creation, M2: Dashboard Search Refactoring, M3: Review & Challenge, M4: Forensic Integrity Audit, M5: Synthesis & Reporting).
2. **Dispatch & Execute**:
   - M1: Exploration & Search Utility Creation [in-progress]
   - M2: Refactor Search Controls Across All Dashboard Modules [planned]
   - M3: Review & Adversarial Challenge [planned]
   - M4: Forensic Integrity Audit [planned]
   - M5: Synthesis & Reporting [planned]
3. **On failure**: Retry / Replace / Skip / Redistribute / Redesign.
4. **Succession**: Self-succeed if spawn count >= 16.

- **Work items**:
  1. M1: Exploration & Search Utility Creation [done]
  2. M2: Dashboard Search Refactoring [done]
  3. M3: Review & Adversarial Challenge [done]
  4. M4: Forensic Integrity Audit [done] (Verdict: CLEAN)
  5. M5: Final Synthesis & Completion Report [in-progress]
- **Current phase**: 5 (Synthesis & Completion Reporting)
- **Current focus**: Synthesizing final execution report and delivering completion summary to Sentinel/User.

## 🔒 Key Constraints

- NEVER write, modify, or create source code files directly.
- MAY use file-editing tools ONLY for metadata/state files (.md) in .agents/ folder.
- Require workers to run builds and tests (`pnpm --filter @mos-lab/web build`).
- Forensic Auditor verdict is a BINARY VETO — violation means failure.
- Follow all rules in `/Users/dannydo/projects/mos-lab/AGENTS.md` and `.agents/AGENTS.md`.

## Current Parent

- Conversation ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6
- Updated: 2026-07-28T09:08:58+07:00

## Key Decisions Made

- Decomposed project into 5 milestones following the Project Pattern architecture.
- Initializing M1 with 3 parallel Explorer subagents to audit all 11 dashboard modules (`/today`, `/customers`, `/bk`, `/cc`, `/cv`, `/catalog`, `/appointments`, `/loca`, `/nyc`, `/omicall`, `/staff`) and verify search helper placement.

## Team Roster

| Agent           | Type                        | Work Item                                         | Status      | Conv ID                              |
| --------------- | --------------------------- | ------------------------------------------------- | ----------- | ------------------------------------ |
| explorer_m1_1   | teamwork_preview_explorer   | Audit /today, /customers, /bk, /cc                | completed   | fa1251cc-ca76-4434-aea0-eeeedbd43f36 |
| explorer_m1_2   | teamwork_preview_explorer   | Audit /cv, /catalog, /appointments, /loca         | completed   | 43e0935e-4085-4a59-b75f-3a7b3fab1661 |
| explorer_m1_3   | teamwork_preview_explorer   | Audit /nyc, /omicall, /staff & search utils       | completed   | cb1497fe-3c77-4fba-ad17-463b1e7ba5f3 |
| worker_m2_1     | teamwork_preview_worker     | Search Utils & /today, /customers, /bk, /cc       | completed   | 693fd96e-2964-4f0c-974f-1509350fcb15 |
| worker_m2_2     | teamwork_preview_worker     | Refactor /cv, /catalog, /appointments, /loca      | completed   | 01aa8469-b33f-4805-849b-768de3b2147f |
| worker_m2_3     | teamwork_preview_worker     | Refactor /nyc, /omicall, /staff & shared          | completed   | 09dbbc46-1032-4c51-b566-a3a37c1864de |
| reviewer_m3_1   | teamwork_preview_reviewer   | Review search utils & modules 1-6                 | completed   | 3cd24036-0800-453c-acc2-29ec497a379f |
| reviewer_m3_2   | teamwork_preview_reviewer   | Review modules 7-11 & shared controls             | completed   | 974fdedf-7a9b-44b1-a547-84bff65be49b |
| challenger_m3_1 | teamwork_preview_challenger | Empirical test harness for removeVietnameseTones  | completed   | 076aa07a-2758-40a1-89a0-4ec2d7ff61e5 |
| challenger_m3_2 | teamwork_preview_challenger | Codebase scan & build verification                | completed   | 0075b835-993d-4b6c-81dd-924ddeac0453 |
| worker_m3_fix   | teamwork_preview_worker     | Enhance Array children extraction & audit drawers | completed   | 0c28f098-db66-40cf-a93e-2545f3f1e0a1 |
| auditor_m4_1    | teamwork_preview_auditor    | Forensic Integrity Audit                          | in-progress | 01af96d1-c375-40e3-935b-542c5dccb478 |

## Succession Status

- Succession required: no
- Spawn count: 12 / 16
- Pending subagents: 01af96d1-c375-40e3-935b-542c5dccb478
- Predecessor: none
- Successor: not yet spawned

## Active Timers

- Heartbeat cron: task-21
- Safety timer: none

## Artifact Index

- /Users/dannydo/projects/mos-lab/.agents/orchestrator/ORIGINAL_REQUEST.md — Original User Request
- /Users/dannydo/projects/mos-lab/.agents/orchestrator/PROJECT.md — Project Scope & Milestones
- /Users/dannydo/projects/mos-lab/.agents/orchestrator/progress.md — Execution Progress
