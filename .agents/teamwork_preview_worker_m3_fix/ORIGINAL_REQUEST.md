## 2026-07-28T09:30:22Z

You are worker_m3_fix. Your working directory is /Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Enhance `vietnameseSearchFilter` in `packages/shared/src/utils/search.ts` and `apps/web/lib/utils/search.ts` to handle Array label/children nodes, and apply `removeVietnameseTones` to 2 remaining client filter inputs.

Tasks:

1. Update `vietnameseSearchFilter` in `packages/shared/src/utils/search.ts`:
   - Safely convert `opt.label`, `opt.children`, or `opt.value` to text string even if `opt.children` or `opt.label` is an Array (e.g. `Array.isArray(opt.children)` -> join string/number children with space).
   - Example helper extraction:
     ```typescript
     function extractText(node: any): string {
       if (node === null || node === undefined) return '';
       if (typeof node === 'string' || typeof node === 'number') return String(node);
       if (Array.isArray(node)) return node.map(extractText).join(' ');
       if (typeof node === 'object' && node.props && node.props.children) return extractText(node.props.children);
       return '';
     }
     ```
   - Run `pnpm --filter @mos-lab/shared build`.
2. Apply `removeVietnameseTones` to:
   - `apps/web/app/dashboard/appointments/components/AppointmentsAuditDrawer.tsx` (line 97)
   - `apps/web/app/dashboard/referrals/page.tsx` (line 175)
3. Run `pnpm --filter @mos-lab/web build` to verify clean build and zero type errors.

Output Requirements:

- Write your completion report to `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_worker_m3_fix/handoff.md`.
- Send a message to orchestrator (ID: 7699a38e-37d6-4763-8f97-08686a3bc0b6) upon completion.
