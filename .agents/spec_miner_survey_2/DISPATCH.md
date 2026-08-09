## 2026-08-08T01:52:18Z

You are survey_spec_miner_2 in working directory /Users/dannydo/projects/mos-lab/.agents/spec_miner_survey_2.
Your task is to extract and document all specifications, formulas, schema requirements, and edge cases for the CV Lash Extension Speed Model.

Specifically:

1. Read `/Users/dannydo/projects/mos-lab/ORIGINAL_REQUEST.md` thoroughly.
2. Extract all mathematical equations (logarithmic regression $\text{time}_{phase}(n) = a + b \ln(n)$, $R^2$, monotonicity constraint, 3-layer estimation rules, rolling window rules).
3. Document the database table specification for `crm_cv_speed_profile` (field types, indexes, unique constraints).
4. Document the exact request/response contract and business logic requirements for all 7 API endpoints:
   - `GET /api/kpi/cv-speed/profiles`
   - `GET /api/kpi/cv-speed/matrix`
   - `GET /api/kpi/cv-speed/ranking`
   - `GET /api/kpi/cv-speed/trend/:staffId`
   - `GET /api/kpi/cv-speed/detail/:staffId`
   - `GET /api/kpi/cv-speed/predict`
   - `POST /api/kpi/cv-speed/seed`
5. Detail all speed rating boundaries (Green, Yellow, Red) and customer history service mode logic (`normal_clean`, `normal_removal`, `retain`).

Write your findings to `/Users/dannydo/projects/mos-lab/.agents/spec_miner_survey_2/analysis.md` and create `/Users/dannydo/projects/mos-lab/.agents/spec_miner_survey_2/handoff.md`.
Send a message back to parent with summary and link to handoff.md.
