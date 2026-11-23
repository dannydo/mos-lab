'use client';

import React from 'react';
import { Button } from 'antd';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '~/context/ThemeContext';
import AcademyWorkshopRegistrationHero from '../../components/AcademyWorkshopRegistrationHero';
import styles from './AcademyWorkshopRegistration.module.css';
import { useWorkshopRegistrationState } from './academy-workshop-registration-page/useWorkshopRegistrationState';
import { WorkshopExperienceTimeline } from './academy-workshop-registration-page/WorkshopExperienceTimeline';
import { WorkshopRegistrationSidebar } from './academy-workshop-registration-page/WorkshopRegistrationSidebar';

export type {
  RegistrationFormValues,
  SelectionSheetKind,
  WorkshopDesignItem,
  WorkshopEquipmentPackage,
  WorkshopMenuSelectionSummary,
  WorkshopPublicDetail,
  WorkshopRegistrationDraft,
} from './academy-workshop-registration-page/registrationTypes';

export default function AcademyWorkshopRegistrationPage() {
  const { themeMode, toggleTheme } = useTheme();
  const state = useWorkshopRegistrationState();

  if (state.loading) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${styles.stateScreen}`}>
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
        <span className="ml-3">Đang mở workshop…</span>
      </main>
    );
  }

  if (state.error && !state.info) {
    return (
      <main className={`flex min-h-screen items-center justify-center p-6 ${styles.stateScreen}`}>
        <div className="flex max-w-md flex-col items-center text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400" aria-hidden="true" />
          <h1 className="mb-0 mt-4 text-xl font-semibold">Không thể mở workshop</h1>
          <p className="mb-0 mt-2 text-sm opacity-80">{state.error}</p>
          <div className="mt-5">
            <Button onClick={() => void state.load()}>Thử lại</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!state.info) return null;
  const { workshop } = state.info;

  return (
    <main className={`min-h-[100svh] p-3 sm:p-6 lg:p-8 ${styles.shell}`}>
      <div className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-6">
        <section className={`min-w-0 overflow-hidden rounded-[28px] sm:rounded-[32px] ${styles.primarySurface}`}>
          <AcademyWorkshopRegistrationHero
            workshop={workshop}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            registrationHref="#workshop-registration"
          />

          <WorkshopExperienceTimeline
            startsAt={workshop.startsAt}
            menuSelectionDeadline={workshop.menuSelectionDeadline}
            equipmentSelectionDeadline={workshop.equipmentSelectionDeadline}
            designSelectionDeadline={workshop.designSelectionDeadline}
            agenda={workshop.agenda}
            menuCategoriesCount={workshop.menu.categories.length}
            selectedEquipmentPackage={state.selectedEquipmentPackage}
            selectedDesign={state.selectedDesign}
            selectedMenuItems={state.selectedMenuItems}
            onOpenSelectionSheet={state.openSelectionSheet}
          />
        </section>

        <WorkshopRegistrationSidebar
          code={state.code}
          info={state.info}
          form={state.form}
          submitting={state.submitting}
          error={state.error}
          receipt={state.receipt}
          googleCredential={state.googleCredential}
          zaloTicket={state.zaloTicket}
          activeSelectionSheet={state.activeSelectionSheet}
          selectedEquipmentPackageId={state.selectedEquipmentPackageId}
          selectedDesignItemId={state.selectedDesignItemId}
          selectedEquipmentPackage={state.selectedEquipmentPackage}
          selectedDesign={state.selectedDesign}
          selectedMenuCount={state.selectedMenuCount}
          menuIncomplete={state.menuIncomplete}
          onDismissError={() => state.setError(null)}
          onReload={() => void state.load()}
          onStartAnotherRegistration={state.startAnotherRegistration}
          onClearGoogle={() => state.setGoogleCredential(null)}
          onClearZalo={() => state.setZaloTicket(null)}
          onGoogleCredential={state.receiveGoogleCredential}
          onPersistDraft={state.persistDraft}
          onOpenSelectionSheet={state.openSelectionSheet}
          onCloseSelectionSheet={state.closeSelectionSheet}
          onSubmit={state.submit}
        />
      </div>
    </main>
  );
}
