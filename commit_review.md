---
request_feedback: true
target: production
---

# Production Commit Review

## Scope

- Branch: `main`
- Candidate tracked changes: 192 files, 13,737 additions / 5,690 deletions.
- Candidate untracked source and QA assets: included below.
- Explicitly excluded generated cache: `apps/web/.next-qa/` (940 MB, 8,120 files). It is now ignored by `.gitignore`; no local files were deleted.

## Change summary

- Establishes the responsive dashboard system: shared breakpoints/density tokens, reusable UI primitives, responsive table and toolbar conventions, plus visual/a11y/input/performance QA tooling.
- Refactors operational dashboards and responsive mobile layouts across Catalog, Schedule, LoCa, NYC, CC/CV/BK, customers, appointments, and supporting drawers/modals.
- Makes Schedule Calendar branch badges use the canonical `crm_stores.code` returned by the API rather than inferring branch codes in the browser.
- Extends KPI/API/shared DTO handling for customer and staff detail presentation, active-team behavior, tip reporting, and avatar data.
- Adds responsive baselines and supporting QA artifacts. The visual baseline set is approximately 2.7 MB.

## Production migration plan

- CRM schema changes: **None**.
- Pending production data migrations in `apps/api/src/scripts/data-migrations/`: **None**.
- `bash scripts/deploy/migration-plan.sh origin/main`: reports no schema or data migrations.
- `pnpm --filter @mos-lab/api data-migrations:validate`: passed; validated 0 production migrations.
- Expected production data effect: no schema or data migration will run. The guarded deploy script may still validate the existing schema and migration registry.

## Proposed commit

```
feat(web): ship responsive dashboard operations pass

- Standardize responsive UI primitives, density, and dashboard layouts.
- Improve catalog, schedule, campaign, and KPI operational flows.
- Use canonical branch codes from the CRM catalog in schedule data.

AI-assisted. Reviewed and verified.
```

## Approval requested

This is a broad production release. Approve this exact commit scope and message to proceed with staging and pushing to `main`. After CI passes, a separate confirmation will be required before the VPS deployment.

## Diff inventory

```
 .gitignore                                         |    3 +-
 apps/api/src/modules/customers/routes.ts           |   89 +-
 apps/api/src/modules/kpi/routes.ts                 |  183 +-
 apps/api/src/modules/kpi/routes/bk.routes.ts       |   38 +-
 apps/api/src/modules/kpi/routes/cc-tip.routes.ts   |    4 +
 apps/api/src/modules/kpi/routes/cv-tip.routes.ts   |  117 +-
 .../src/modules/kpi/services/bk-salary.service.ts  |   12 +
 .../api/src/modules/kpi/services/cc-kpi.service.ts |    6 +-
 .../appointments/components/AppointmentColumns.tsx |  161 +-
 .../appointments/components/DoneSummaryStrip.tsx   |    2 +-
 .../appointments/components/MissedSummaryCards.tsx |    2 +-
 apps/web/app/dashboard/appointments/page.tsx       |   91 +-
 apps/web/app/dashboard/architecture/page.tsx       |    6 +-
 .../app/dashboard/bk/components/BkBookingTab.tsx   |   14 +-
 .../app/dashboard/bk/components/BkConfigDrawer.tsx |    2 +-
 apps/web/app/dashboard/bk/components/BkDoneTab.tsx |   62 +-
 .../dashboard/bk/components/BkLeaderboardCard.tsx  |  111 +-
 .../app/dashboard/bk/components/BkRevenueTab.tsx   |   16 +-
 .../app/dashboard/bk/components/BkThuNhapTab.tsx   |   66 +-
 apps/web/app/dashboard/bk/components/BkTipTab.tsx  |   16 +-
 apps/web/app/dashboard/bk/page.tsx                 |  110 +-
 apps/web/app/dashboard/calls/page.tsx              |    2 +-
 .../catalog/components/CatalogBranchTab.tsx        |    2 +-
 .../catalog/components/CatalogComboLiveTab.tsx     |  713 ++-
 .../catalog/components/CatalogItemDetailPanel.tsx  |   18 +-
 .../catalog/components/CatalogLeaderboardCard.tsx  |   13 +-
 .../catalog/components/CatalogReportHeader.tsx     |   16 +-
 .../components/ServiceDeactivateConfirmModal.tsx   |    8 +-
 apps/web/app/dashboard/catalog/page.tsx            |  288 +-
 .../app/dashboard/cc/components/CcConfigDrawer.tsx |    2 +-
 .../cc/components/CcDiamondDetailModal.tsx         |    4 +-
 .../app/dashboard/cc/components/CcDiamondTab.tsx   |  365 +-
 .../dashboard/cc/components/CcLeaderboardCard.tsx  |  161 +-
 .../app/dashboard/cc/components/CcThuNhapTab.tsx   |  470 +-
 .../cc/components/CcThuongConfigModal.tsx          |  158 +-
 .../app/dashboard/cc/components/CcThuongTab.tsx    |  352 +-
 .../cc/components/CcThuongTransactionsModal.tsx    |   22 +-
 apps/web/app/dashboard/cc/components/CcTipTab.tsx  |  452 +-
 apps/web/app/dashboard/cc/components/CcXoayTab.tsx |  154 +-
 apps/web/app/dashboard/cc/page.tsx                 |  299 +-
 .../app/dashboard/cs/components/CampaignTab.tsx    |    2 +-
 .../app/dashboard/cs/components/CsDashboardTab.tsx |    6 +-
 .../app/dashboard/cs/components/HappyCallTab.tsx   |    4 +-
 apps/web/app/dashboard/cs/components/TicketTab.tsx |    4 +-
 apps/web/app/dashboard/cs/page.tsx                 |    2 +-
 .../components/AssignmentHistoryDrawer.tsx         |   14 +-
 .../customers/components/CustomerBulkActions.tsx   |  253 +-
 .../customers/components/CustomerFilters.tsx       |   81 +-
 .../components/CustomerRandomSelectorModal.tsx     |    9 +-
 .../customers/components/CustomerTable.tsx         |  293 +-
 .../customers/components/RetainDataButton.tsx      |   36 +-
 .../customers/components/RevokeAssignmentModal.tsx |   23 +-
 .../customers/components/UndoReasonModal.tsx       |   13 +-
 .../components/filters/SaveFilterModal.tsx         |    9 +-
 apps/web/app/dashboard/customers/page.tsx          |  166 +-
 .../app/dashboard/cv/components/CvConfigDrawer.tsx |    2 +-
 .../app/dashboard/cv/components/CvThuNhapTab.tsx   |  125 +-
 apps/web/app/dashboard/cv/components/CvTipTab.tsx  |  449 +-
 apps/web/app/dashboard/cv/components/CvXoayTab.tsx |  150 +-
 .../cv/components/cv-speed/CvSpeedDetailModal.tsx  |    2 +-
 .../components/cv-speed/CvSpeedMatrixSection.tsx   |  137 +-
 .../components/cv-speed/CvSpeedRankingSection.tsx  |  107 +-
 .../cv/components/cv-speed/CvSpeedTab.tsx          |    2 +-
 apps/web/app/dashboard/cv/page.tsx                 |  220 +-
 apps/web/app/dashboard/design-system/page.tsx      |  569 ++-
 apps/web/app/dashboard/diagrams/page.tsx           |    7 +-
 apps/web/app/dashboard/fal/page.tsx                |  234 +-
 .../kpi/components/AppointmentsAuditDrawer.tsx     |   18 +-
 .../kpi/components/BookingAuditLogReportTab.tsx    |    4 +-
 .../app/dashboard/kpi/components/KpiColumns.tsx    |   28 +-
 .../dashboard/kpi/components/KpiTrendsChart.tsx    |   51 +-
 .../kpi/components/LeaderboardSummary.tsx          |   26 +-
 .../dashboard/kpi/components/PackageAuditTab.tsx   |    2 +-
 .../components/cv-speed/CvSpeedMatrixSection.tsx   |    4 +-
 apps/web/app/dashboard/kpi/hooks/useKpiData.ts     |   10 +-
 apps/web/app/dashboard/kpi/page.tsx                |  238 +-
 apps/web/app/dashboard/layout.tsx                  |  470 +-
 .../app/dashboard/loca/components/LocaColumns.tsx  |  112 +-
 .../loca/components/LocaStaffActivityTab.tsx       |    6 +-
 .../loca/components/LocaTouchpointCell.tsx         |   72 +-
 apps/web/app/dashboard/loca/page.tsx               |   46 +-
 .../app/dashboard/nyc/campaigns/[slug]/page.tsx    |  345 +-
 apps/web/app/dashboard/nyc/campaigns/page.tsx      |    7 +-
 .../app/dashboard/nyc/components/NycColumns.tsx    |    4 +-
 apps/web/app/dashboard/nyc/page.tsx                |   43 +-
 apps/web/app/dashboard/omicall/page.tsx            |    2 +-
 apps/web/app/dashboard/page.tsx                    |  523 ++-
 apps/web/app/dashboard/plans/page.tsx              |    7 +-
 .../qa-shop/components/ComplianceAnalyticsTab.tsx  |    2 +-
 .../dashboard/qa-shop/components/DailyAuditTab.tsx |    4 +-
 .../components/FullBranchAuditReportTab.tsx        |    6 +-
 apps/web/app/dashboard/qa-shop/page.tsx            |   94 +-
 apps/web/app/dashboard/qa-shop/qa-shop.module.css  |  127 +-
 apps/web/app/dashboard/referrals/page.tsx          |    6 +-
 .../components/CvScheduleDrawer.tsx                |   16 +-
 .../components/FullCalendarGrid.tsx                |    2 +-
 .../components/MultiDayColumnView.tsx              |   74 +-
 .../components/ScheduleListView.tsx                |   62 +-
 .../components/cv-drawer/CvHeaderToolbar.tsx       |    9 +-
 .../components/cv-drawer/CvOffStaffCard.tsx        |    2 +-
 .../components/cv-drawer/CvTimePickerDrawer.tsx    |   10 +-
 .../components/cv-drawer/CvWorkingStaffCard.tsx    |    2 +-
 .../components/cv-drawer/cvDrawerUtils.ts          |    2 +
 apps/web/app/dashboard/schedule-calendar/page.tsx  |  413 +-
 .../dashboard/staff/components/StaffColumns.tsx    |    8 +-
 apps/web/app/dashboard/staff/page.tsx              |    6 +-
 apps/web/app/dashboard/staff/teams/page.tsx        | 1071 ++---
 .../today/components/RevenueDetailModal.tsx        |    4 +-
 .../today/components/RevenueHourlyChart.tsx        |    2 +-
 .../dashboard/today/components/RevenueKpiCards.tsx |    4 +-
 .../today/components/TodayBookingsTable.tsx        |   72 +-
 .../today/components/TodayCalendarSummary.tsx      |    6 +-
 .../today/components/TodayComingTable.tsx          |   75 +-
 .../today/components/TodayStaffAttendance.tsx      |   67 +-
 .../app/dashboard/today/components/TodayStats.tsx  |   24 +-
 apps/web/app/dashboard/today/page.tsx              |  291 +-
 apps/web/app/globals.css                           | 4541 +++++++++++++++++++-
 apps/web/app/login/page.tsx                        |    8 +-
 apps/web/app/page.tsx                              |   28 +-
 apps/web/components/BookingWizardDrawer.tsx        |   34 +-
 apps/web/components/CallLogModal.tsx               |   15 +-
 apps/web/components/CustomerDetailDrawer.tsx       |  103 +-
 apps/web/components/DailyCallsDrawer.tsx           |   53 +-
 apps/web/components/DailyCallsTable.tsx            |  119 +-
 apps/web/components/DeferredLucideIcon.tsx         |   59 +-
 apps/web/components/IconPickerModal.tsx            |   82 +-
 apps/web/components/OmiCallWidget.tsx              |   28 +-
 apps/web/components/QAPlayerDrawer.tsx             |    7 +-
 apps/web/components/RescheduleBookingModal.tsx     |   37 +-
 apps/web/components/TableConfigDrawer.tsx          |   57 +-
 apps/web/components/TelesalesDashboardModal.tsx    |   32 +-
 apps/web/components/UpdateBookingModal.tsx         |   14 +-
 .../allocation/AllocationAuditDashboard.tsx        |   21 +-
 .../allocation/AllocationHistoryScreen.tsx         |   64 +-
 .../components/allocation/DeclineReasonModal.tsx   |   10 +-
 .../allocation/PendingAllocationModal.tsx          |   29 +-
 .../components/booking/BookingAuditLogDrawer.tsx   |   10 +-
 .../booking/BookingTemplateManagerModal.tsx        |   47 +-
 apps/web/components/booking/CancelBookingModal.tsx |   17 +-
 apps/web/components/booking/TechnicianSelector.tsx |   24 +-
 .../web/components/campaign/AddToCampaignModal.tsx |   15 +-
 .../components/campaign/TouchpointIconPicker.tsx   |   52 +-
 .../components/BookingHabitsCard.tsx               |   19 +-
 .../customer-detail/components/BookingsTab.tsx     |   17 +-
 .../components/ComboBalancesCard.tsx               |   15 +-
 .../components/ComboHistoryModal.tsx               |   11 +-
 .../customer-detail/components/CopyComboModal.tsx  |    7 +-
 .../customer-detail/components/CreateNoteModal.tsx |   10 +-
 .../components/CustomerAssignmentTimeline.tsx      |    2 +-
 .../components/EditCustomerModal.tsx               |   14 +-
 .../customer-detail/components/GemHistoryModal.tsx |    9 +-
 .../customer-detail/components/KpiStatsCard.tsx    |   11 +-
 .../components/ProfileDetailsCard.tsx              |   21 +-
 .../customer-detail/components/ReferralCard.tsx    |   15 +-
 .../components/RevenueHistoryModal.tsx             |    9 +-
 .../customer-detail/components/TipHistoryModal.tsx |    9 +-
 .../customer-detail/hooks/useCustomerDetail.ts     |   14 +-
 apps/web/components/filters/RangeFilterField.tsx   |    4 +
 apps/web/components/layout/HeaderLeftToolbar.tsx   |   52 +-
 apps/web/components/layout/SidebarNav.tsx          |    9 +-
 .../omicall-widget/components/WidgetMinimized.tsx  |    6 +-
 .../components/omicall-widget/useWidgetPosition.ts |   26 +-
 .../telesales/components/TelesalesBackFace.tsx     |   16 +-
 .../telesales/components/TelesalesFrontFace.tsx    |   18 +-
 apps/web/components/ui/ContentSurface.tsx          |    7 +-
 apps/web/components/ui/DataTable.tsx               |  234 +-
 apps/web/components/ui/DensityContainer.tsx        |   35 +-
 apps/web/components/ui/PageHeader.tsx              |   16 +-
 apps/web/components/ui/PageToolbar.tsx             |   22 +-
 apps/web/components/ui/SectionCard.tsx             |   11 +-
 apps/web/components/ui/StatCard.tsx                |    9 +-
 apps/web/components/ui/StatePanel.tsx              |   31 +-
 .../components/ui/__tests__/ui-primitives.test.tsx |  422 +-
 apps/web/components/ui/index.ts                    |   76 +-
 apps/web/config/sidebar.config.tsx                 |   18 +-
 apps/web/context/ThemeContext.tsx                  |   75 +-
 apps/web/eslint.config.mjs                         |    2 +
 apps/web/hooks/useResizableModal.ts                |    6 +-
 apps/web/hooks/useTableConfig.ts                   |   89 +-
 apps/web/lib/api-client.ts                         |   19 +-
 apps/web/lib/format-utils.ts                       |   18 +-
 apps/web/next.config.ts                            |   23 +-
 package.json                                       |   15 +
 packages/shared/src/index.ts                       |    2 +
 packages/shared/src/theme/tokens.ts                |  273 +-
 packages/shared/src/types/cc-tip.ts                |    2 +
 packages/shared/src/types/cc-xoay.ts               |    2 +
 packages/shared/src/types/customer.ts              |    4 +
 packages/shared/src/types/cv.ts                    |   28 +
 packages/shared/src/types/index.ts                 |    2 +
 pnpm-lock.yaml                                     |   32 +
 scripts/check-ui-contract.ts                       |  126 +-
 192 files changed, 13737 insertions(+), 5690 deletions(-)

---TRACKED_NAME_STATUS---
M	.gitignore
M	apps/api/src/modules/customers/routes.ts
M	apps/api/src/modules/kpi/routes.ts
M	apps/api/src/modules/kpi/routes/bk.routes.ts
M	apps/api/src/modules/kpi/routes/cc-tip.routes.ts
M	apps/api/src/modules/kpi/routes/cv-tip.routes.ts
M	apps/api/src/modules/kpi/services/bk-salary.service.ts
M	apps/api/src/modules/kpi/services/cc-kpi.service.ts
M	apps/web/app/dashboard/appointments/components/AppointmentColumns.tsx
M	apps/web/app/dashboard/appointments/components/DoneSummaryStrip.tsx
M	apps/web/app/dashboard/appointments/components/MissedSummaryCards.tsx
M	apps/web/app/dashboard/appointments/page.tsx
M	apps/web/app/dashboard/architecture/page.tsx
M	apps/web/app/dashboard/bk/components/BkBookingTab.tsx
M	apps/web/app/dashboard/bk/components/BkConfigDrawer.tsx
M	apps/web/app/dashboard/bk/components/BkDoneTab.tsx
M	apps/web/app/dashboard/bk/components/BkLeaderboardCard.tsx
M	apps/web/app/dashboard/bk/components/BkRevenueTab.tsx
M	apps/web/app/dashboard/bk/components/BkThuNhapTab.tsx
M	apps/web/app/dashboard/bk/components/BkTipTab.tsx
M	apps/web/app/dashboard/bk/page.tsx
M	apps/web/app/dashboard/calls/page.tsx
M	apps/web/app/dashboard/catalog/components/CatalogBranchTab.tsx
M	apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.tsx
M	apps/web/app/dashboard/catalog/components/CatalogItemDetailPanel.tsx
M	apps/web/app/dashboard/catalog/components/CatalogLeaderboardCard.tsx
M	apps/web/app/dashboard/catalog/components/CatalogReportHeader.tsx
M	apps/web/app/dashboard/catalog/components/ServiceDeactivateConfirmModal.tsx
M	apps/web/app/dashboard/catalog/page.tsx
M	apps/web/app/dashboard/cc/components/CcConfigDrawer.tsx
M	apps/web/app/dashboard/cc/components/CcDiamondDetailModal.tsx
M	apps/web/app/dashboard/cc/components/CcDiamondTab.tsx
M	apps/web/app/dashboard/cc/components/CcLeaderboardCard.tsx
M	apps/web/app/dashboard/cc/components/CcThuNhapTab.tsx
M	apps/web/app/dashboard/cc/components/CcThuongConfigModal.tsx
M	apps/web/app/dashboard/cc/components/CcThuongTab.tsx
M	apps/web/app/dashboard/cc/components/CcThuongTransactionsModal.tsx
M	apps/web/app/dashboard/cc/components/CcTipTab.tsx
M	apps/web/app/dashboard/cc/components/CcXoayTab.tsx
M	apps/web/app/dashboard/cc/page.tsx
M	apps/web/app/dashboard/cs/components/CampaignTab.tsx
M	apps/web/app/dashboard/cs/components/CsDashboardTab.tsx
M	apps/web/app/dashboard/cs/components/HappyCallTab.tsx
M	apps/web/app/dashboard/cs/components/TicketTab.tsx
M	apps/web/app/dashboard/cs/page.tsx
M	apps/web/app/dashboard/customers/components/AssignmentHistoryDrawer.tsx
M	apps/web/app/dashboard/customers/components/CustomerBulkActions.tsx
M	apps/web/app/dashboard/customers/components/CustomerFilters.tsx
M	apps/web/app/dashboard/customers/components/CustomerRandomSelectorModal.tsx
M	apps/web/app/dashboard/customers/components/CustomerTable.tsx
M	apps/web/app/dashboard/customers/components/RetainDataButton.tsx
M	apps/web/app/dashboard/customers/components/RevokeAssignmentModal.tsx
M	apps/web/app/dashboard/customers/components/UndoReasonModal.tsx
M	apps/web/app/dashboard/customers/components/filters/SaveFilterModal.tsx
M	apps/web/app/dashboard/customers/page.tsx
M	apps/web/app/dashboard/cv/components/CvConfigDrawer.tsx
M	apps/web/app/dashboard/cv/components/CvThuNhapTab.tsx
M	apps/web/app/dashboard/cv/components/CvTipTab.tsx
M	apps/web/app/dashboard/cv/components/CvXoayTab.tsx
M	apps/web/app/dashboard/cv/components/cv-speed/CvSpeedDetailModal.tsx
M	apps/web/app/dashboard/cv/components/cv-speed/CvSpeedMatrixSection.tsx
M	apps/web/app/dashboard/cv/components/cv-speed/CvSpeedRankingSection.tsx
M	apps/web/app/dashboard/cv/components/cv-speed/CvSpeedTab.tsx
M	apps/web/app/dashboard/cv/page.tsx
M	apps/web/app/dashboard/design-system/page.tsx
M	apps/web/app/dashboard/diagrams/page.tsx
M	apps/web/app/dashboard/fal/page.tsx
M	apps/web/app/dashboard/kpi/components/AppointmentsAuditDrawer.tsx
M	apps/web/app/dashboard/kpi/components/BookingAuditLogReportTab.tsx
M	apps/web/app/dashboard/kpi/components/KpiColumns.tsx
M	apps/web/app/dashboard/kpi/components/KpiTrendsChart.tsx
M	apps/web/app/dashboard/kpi/components/LeaderboardSummary.tsx
M	apps/web/app/dashboard/kpi/components/PackageAuditTab.tsx
M	apps/web/app/dashboard/kpi/components/cv-speed/CvSpeedMatrixSection.tsx
M	apps/web/app/dashboard/kpi/hooks/useKpiData.ts
M	apps/web/app/dashboard/kpi/page.tsx
M	apps/web/app/dashboard/layout.tsx
M	apps/web/app/dashboard/loca/components/LocaColumns.tsx
M	apps/web/app/dashboard/loca/components/LocaStaffActivityTab.tsx
M	apps/web/app/dashboard/loca/components/LocaTouchpointCell.tsx
M	apps/web/app/dashboard/loca/page.tsx
M	apps/web/app/dashboard/nyc/campaigns/[slug]/page.tsx
M	apps/web/app/dashboard/nyc/campaigns/page.tsx
M	apps/web/app/dashboard/nyc/components/NycColumns.tsx
M	apps/web/app/dashboard/nyc/page.tsx
M	apps/web/app/dashboard/omicall/page.tsx
M	apps/web/app/dashboard/page.tsx
M	apps/web/app/dashboard/plans/page.tsx
M	apps/web/app/dashboard/qa-shop/components/ComplianceAnalyticsTab.tsx
M	apps/web/app/dashboard/qa-shop/components/DailyAuditTab.tsx
M	apps/web/app/dashboard/qa-shop/components/FullBranchAuditReportTab.tsx
M	apps/web/app/dashboard/qa-shop/page.tsx
M	apps/web/app/dashboard/qa-shop/qa-shop.module.css
M	apps/web/app/dashboard/referrals/page.tsx
M	apps/web/app/dashboard/schedule-calendar/components/CvScheduleDrawer.tsx
M	apps/web/app/dashboard/schedule-calendar/components/FullCalendarGrid.tsx
M	apps/web/app/dashboard/schedule-calendar/components/MultiDayColumnView.tsx
M	apps/web/app/dashboard/schedule-calendar/components/ScheduleListView.tsx
M	apps/web/app/dashboard/schedule-calendar/components/cv-drawer/CvHeaderToolbar.tsx
M	apps/web/app/dashboard/schedule-calendar/components/cv-drawer/CvOffStaffCard.tsx
M	apps/web/app/dashboard/schedule-calendar/components/cv-drawer/CvTimePickerDrawer.tsx
M	apps/web/app/dashboard/schedule-calendar/components/cv-drawer/CvWorkingStaffCard.tsx
M	apps/web/app/dashboard/schedule-calendar/components/cv-drawer/cvDrawerUtils.ts
M	apps/web/app/dashboard/schedule-calendar/page.tsx
M	apps/web/app/dashboard/staff/components/StaffColumns.tsx
M	apps/web/app/dashboard/staff/page.tsx
M	apps/web/app/dashboard/staff/teams/page.tsx
M	apps/web/app/dashboard/today/components/RevenueDetailModal.tsx
M	apps/web/app/dashboard/today/components/RevenueHourlyChart.tsx
M	apps/web/app/dashboard/today/components/RevenueKpiCards.tsx
M	apps/web/app/dashboard/today/components/TodayBookingsTable.tsx
M	apps/web/app/dashboard/today/components/TodayCalendarSummary.tsx
M	apps/web/app/dashboard/today/components/TodayComingTable.tsx
M	apps/web/app/dashboard/today/components/TodayStaffAttendance.tsx
M	apps/web/app/dashboard/today/components/TodayStats.tsx
M	apps/web/app/dashboard/today/page.tsx
M	apps/web/app/globals.css
M	apps/web/app/login/page.tsx
M	apps/web/app/page.tsx
M	apps/web/components/BookingWizardDrawer.tsx
M	apps/web/components/CallLogModal.tsx
M	apps/web/components/CustomerDetailDrawer.tsx
M	apps/web/components/DailyCallsDrawer.tsx
M	apps/web/components/DailyCallsTable.tsx
M	apps/web/components/DeferredLucideIcon.tsx
M	apps/web/components/IconPickerModal.tsx
M	apps/web/components/OmiCallWidget.tsx
M	apps/web/components/QAPlayerDrawer.tsx
M	apps/web/components/RescheduleBookingModal.tsx
M	apps/web/components/TableConfigDrawer.tsx
M	apps/web/components/TelesalesDashboardModal.tsx
M	apps/web/components/UpdateBookingModal.tsx
M	apps/web/components/allocation/AllocationAuditDashboard.tsx
M	apps/web/components/allocation/AllocationHistoryScreen.tsx
M	apps/web/components/allocation/DeclineReasonModal.tsx
M	apps/web/components/allocation/PendingAllocationModal.tsx
M	apps/web/components/booking/BookingAuditLogDrawer.tsx
M	apps/web/components/booking/BookingTemplateManagerModal.tsx
M	apps/web/components/booking/CancelBookingModal.tsx
M	apps/web/components/booking/TechnicianSelector.tsx
M	apps/web/components/campaign/AddToCampaignModal.tsx
M	apps/web/components/campaign/TouchpointIconPicker.tsx
M	apps/web/components/customer-detail/components/BookingHabitsCard.tsx
M	apps/web/components/customer-detail/components/BookingsTab.tsx
M	apps/web/components/customer-detail/components/ComboBalancesCard.tsx
M	apps/web/components/customer-detail/components/ComboHistoryModal.tsx
M	apps/web/components/customer-detail/components/CopyComboModal.tsx
M	apps/web/components/customer-detail/components/CreateNoteModal.tsx
M	apps/web/components/customer-detail/components/CustomerAssignmentTimeline.tsx
M	apps/web/components/customer-detail/components/EditCustomerModal.tsx
M	apps/web/components/customer-detail/components/GemHistoryModal.tsx
M	apps/web/components/customer-detail/components/KpiStatsCard.tsx
M	apps/web/components/customer-detail/components/ProfileDetailsCard.tsx
M	apps/web/components/customer-detail/components/ReferralCard.tsx
M	apps/web/components/customer-detail/components/RevenueHistoryModal.tsx
M	apps/web/components/customer-detail/components/TipHistoryModal.tsx
M	apps/web/components/customer-detail/hooks/useCustomerDetail.ts
M	apps/web/components/filters/RangeFilterField.tsx
M	apps/web/components/layout/HeaderLeftToolbar.tsx
M	apps/web/components/layout/SidebarNav.tsx
M	apps/web/components/omicall-widget/components/WidgetMinimized.tsx
M	apps/web/components/omicall-widget/useWidgetPosition.ts
M	apps/web/components/telesales/components/TelesalesBackFace.tsx
M	apps/web/components/telesales/components/TelesalesFrontFace.tsx
M	apps/web/components/ui/ContentSurface.tsx
M	apps/web/components/ui/DataTable.tsx
M	apps/web/components/ui/DensityContainer.tsx
M	apps/web/components/ui/PageHeader.tsx
M	apps/web/components/ui/PageToolbar.tsx
M	apps/web/components/ui/SectionCard.tsx
M	apps/web/components/ui/StatCard.tsx
M	apps/web/components/ui/StatePanel.tsx
M	apps/web/components/ui/__tests__/ui-primitives.test.tsx
M	apps/web/components/ui/index.ts
M	apps/web/config/sidebar.config.tsx
M	apps/web/context/ThemeContext.tsx
M	apps/web/eslint.config.mjs
M	apps/web/hooks/useResizableModal.ts
M	apps/web/hooks/useTableConfig.ts
M	apps/web/lib/api-client.ts
M	apps/web/lib/format-utils.ts
M	apps/web/next.config.ts
M	package.json
M	packages/shared/src/index.ts
M	packages/shared/src/theme/tokens.ts
M	packages/shared/src/types/cc-tip.ts
M	packages/shared/src/types/cc-xoay.ts
M	packages/shared/src/types/customer.ts
M	packages/shared/src/types/cv.ts
M	packages/shared/src/types/index.ts
M	pnpm-lock.yaml
M	scripts/check-ui-contract.ts

---UNTRACKED_SOURCE---
apps/api/src/modules/kpi/services/bk-salary.service.test.ts
apps/web/app/dashboard/catalog/catalog.module.css
apps/web/app/dashboard/catalog/components/CatalogComboLiveTab.module.css
apps/web/app/dashboard/fal/fal.module.css
apps/web/app/dashboard/loca/components/LocaTouchpointCell.module.css
apps/web/app/dashboard/schedule-calendar/components/OffDayRescheduleWarningModal.tsx
apps/web/app/dashboard/staff/teams/teams.module.css
apps/web/components/design-system/DensityStandards.tsx
apps/web/components/design-system/ReadyKitsTab.tsx
apps/web/components/design-system/catalog.manifest.ts
apps/web/components/ui/ASSEMBLY-KIT.md
apps/web/components/ui/AdaptiveOverlay.tsx
apps/web/components/ui/AppIcon.tsx
apps/web/components/ui/DataSection.tsx
apps/web/components/ui/EntityForm.tsx
apps/web/components/ui/EntityFormDrawer.tsx
apps/web/components/ui/FeaturePage.tsx
apps/web/components/ui/FeatureToolbar.tsx
apps/web/components/ui/HeaderActionIndicator.tsx
apps/web/components/ui/HeaderIconButton.tsx
apps/web/components/ui/IconButton.tsx
apps/web/components/ui/MetricGrid.tsx
apps/web/components/ui/MobileRecordList.tsx
apps/web/components/ui/ReportPage.tsx
apps/web/components/ui/ReportPeriodNavigator.tsx
apps/web/components/ui/ResourceListPage.tsx
apps/web/components/ui/ResponsiveFormGrid.tsx
apps/web/components/ui/SearchField.tsx
apps/web/components/ui/TableStandards.tsx
apps/web/components/ui/ToolbarFilterDisclosure.tsx
apps/web/components/ui/ToolbarToggle.tsx
apps/web/context/__tests__/ThemeContext.test.tsx
apps/web/hooks/__tests__/useResponsiveTier.test.tsx
apps/web/hooks/useResponsiveTier.ts
apps/web/lib/color-utils.ts
docs/responsive-baseline-report-2026-08-13.md
docs/responsive-defect-register-2026-08-13.md
docs/responsive-implementation-plan-2026.md
docs/responsive-qa-inventory-2026-08-13.md
packages/shared/src/types/api.ts
packages/shared/src/types/dashboard.ts
scripts/responsive/accessibility-audit.mjs
scripts/responsive/browser-utils.mjs
scripts/responsive/capture-baseline.mjs
scripts/responsive/capture-states.mjs
scripts/responsive/input-matrix.mjs
scripts/responsive/performance-audit.mjs
scripts/responsive/viewport-presets.mjs
scripts/responsive/visual-baselines/catalog-default/fhd/dark.png
scripts/responsive/visual-baselines/catalog-default/fhd/light.png
scripts/responsive/visual-baselines/catalog-default/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/catalog-default/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/customers-booking-wizard/fhd/dark.png
scripts/responsive/visual-baselines/customers-booking-wizard/fhd/light.png
scripts/responsive/visual-baselines/customers-booking-wizard/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/customers-booking-wizard/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/customers-default/fhd/dark.png
scripts/responsive/visual-baselines/customers-default/fhd/light.png
scripts/responsive/visual-baselines/customers-default/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/customers-default/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/customers-detail-drawer/fhd/dark.png
scripts/responsive/visual-baselines/customers-detail-drawer/fhd/light.png
scripts/responsive/visual-baselines/customers-detail-drawer/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/customers-detail-drawer/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/customers-empty-state/fhd/dark.png
scripts/responsive/visual-baselines/customers-empty-state/fhd/light.png
scripts/responsive/visual-baselines/customers-empty-state/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/customers-empty-state/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/customers-filter-drawer/fhd/dark.png
scripts/responsive/visual-baselines/customers-filter-drawer/fhd/light.png
scripts/responsive/visual-baselines/customers-filter-drawer/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/customers-filter-drawer/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/dashboard-default/fhd/dark.png
scripts/responsive/visual-baselines/dashboard-default/fhd/light.png
scripts/responsive/visual-baselines/dashboard-default/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/dashboard-default/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/manifest.json
scripts/responsive/visual-baselines/qa-shop-default/fhd/dark.png
scripts/responsive/visual-baselines/qa-shop-default/fhd/light.png
scripts/responsive/visual-baselines/qa-shop-default/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/qa-shop-default/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/schedule-default/fhd/dark.png
scripts/responsive/visual-baselines/schedule-default/fhd/light.png
scripts/responsive/visual-baselines/schedule-default/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/schedule-default/iphone-12-portrait/light.png
scripts/responsive/visual-baselines/today-default/fhd/dark.png
scripts/responsive/visual-baselines/today-default/fhd/light.png
scripts/responsive/visual-baselines/today-default/iphone-12-portrait/dark.png
scripts/responsive/visual-baselines/today-default/iphone-12-portrait/light.png
scripts/responsive/visual-regression.mjs
scripts/ui-legacy-exceptions.ts

---SHORTSTAT---
 192 files changed, 13737 insertions(+), 5690 deletions(-)

```
