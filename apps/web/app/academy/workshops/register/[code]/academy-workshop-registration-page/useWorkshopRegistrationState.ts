'use client';

import React from 'react';
import { Form } from 'antd';
import { useParams } from 'next/navigation';
import type {
  AcademyWorkshopMenuCategory,
  AcademyWorkshopPublicRegistrationInfo,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  REGISTRATION_DRAFT_VERSION,
  type RegistrationFormValues,
  type SelectionSheetKind,
  type WorkshopMenuSelectionSummary,
} from './registrationTypes';
import {
  draftSelectionId,
  failureMessage,
  googleProfile,
  hasRegistrationDraftContent,
  readRegistrationDraft,
  registrationDraft,
  zaloProfile,
} from './registrationUtils';

export function useWorkshopRegistrationState() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code || '')).trim();
  const [form] = Form.useForm<RegistrationFormValues>();
  const selectedMenuChoices = Form.useWatch('menuSelections', form);
  const selectedEquipmentPackageId = Form.useWatch('equipmentPackageId', form);
  const selectedDesignItemId = Form.useWatch('designItemId', form);
  const selectionPersistenceReadyRef = React.useRef(false);

  const [info, setInfo] = React.useState<AcademyWorkshopPublicRegistrationInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<string | null>(null);
  const [googleCredential, setGoogleCredential] = React.useState<string | null>(null);
  const [zaloTicket, setZaloTicket] = React.useState<string | null>(null);
  const [activeSelectionSheet, setActiveSelectionSheet] = React.useState<SelectionSheetKind | null>(null);
  const [draftRestored, setDraftRestored] = React.useState(false);

  const openSelectionSheet = React.useCallback((selection: SelectionSheetKind) => {
    setActiveSelectionSheet(selection);
  }, []);
  const closeSelectionSheet = React.useCallback(() => {
    setActiveSelectionSheet(null);
  }, []);

  const receiptStorageKey = React.useMemo(
    () => (code ? `academy-workshop-registration-receipt:${code}` : null),
    [code]
  );
  const draftStorageKey = React.useMemo(
    () => (code ? `academy-workshop-registration-draft:v${REGISTRATION_DRAFT_VERSION}:${code}` : null),
    [code]
  );

  const clearDraft = React.useCallback(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // Browsers can disable local storage; the registration flow must still work.
    }
  }, [draftStorageKey]);

  const persistDraft = React.useCallback(
    (values: RegistrationFormValues) => {
      if (!draftStorageKey || !draftRestored || receipt) return;

      try {
        const draft = registrationDraft(values);
        if (hasRegistrationDraftContent(draft)) {
          window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        } else {
          window.localStorage.removeItem(draftStorageKey);
        }
      } catch {
        // Browsers can disable local storage; registration remains available without a local draft.
      }
    },
    [draftRestored, draftStorageKey, receipt]
  );

  const rememberReceipt = React.useCallback(
    (message: string) => {
      setReceipt(message);
      if (receiptStorageKey) window.sessionStorage.setItem(receiptStorageKey, message);
    },
    [receiptStorageKey]
  );

  const load = React.useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      setInfo(await apiClient.academyWorkshopsPublic.getRegistrationInfo(code));
    } catch (cause) {
      setInfo(null);
      setError(failureMessage(cause, 'Không thể mở link đăng ký workshop.'));
    } finally {
      setLoading(false);
    }
  }, [code]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!receiptStorageKey) {
      setReceipt(null);
      return;
    }
    const storedReceipt = window.sessionStorage.getItem(receiptStorageKey);
    setReceipt(storedReceipt);
    if (storedReceipt) clearDraft();
  }, [clearDraft, receiptStorageKey]);

  React.useEffect(() => {
    setDraftRestored(false);
    selectionPersistenceReadyRef.current = false;
    form.resetFields();

    if (draftStorageKey) {
      try {
        const draft = readRegistrationDraft(window.localStorage.getItem(draftStorageKey));
        if (draft) form.setFieldsValue(draft);
      } catch {
        // Browsers can disable local storage; the registration flow must still work.
      }
    }

    setDraftRestored(true);
  }, [draftStorageKey, form]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      selectionPersistenceReadyRef.current = true;
    }, 100);
    return () => window.clearTimeout(timer);
  }, [draftStorageKey]);

  React.useEffect(() => {
    if (!draftRestored || !selectionPersistenceReadyRef.current) return;
    persistDraft({
      ...(form.getFieldsValue(true) as RegistrationFormValues),
      equipmentPackageId: draftSelectionId(selectedEquipmentPackageId),
      designItemId: draftSelectionId(selectedDesignItemId),
      menuSelections: (selectedMenuChoices || {}) as Partial<Record<AcademyWorkshopMenuCategory, number>>,
    });
  }, [draftRestored, form, persistDraft, selectedDesignItemId, selectedEquipmentPackageId, selectedMenuChoices]);

  React.useEffect(() => {
    const persistBeforeLeaving = () => {
      persistDraft({
        ...(form.getFieldsValue(true) as RegistrationFormValues),
        equipmentPackageId: draftSelectionId(selectedEquipmentPackageId),
        designItemId: draftSelectionId(selectedDesignItemId),
        menuSelections: (selectedMenuChoices || {}) as Partial<Record<AcademyWorkshopMenuCategory, number>>,
      });
    };

    window.addEventListener('beforeunload', persistBeforeLeaving);
    window.addEventListener('pagehide', persistBeforeLeaving);
    return () => {
      window.removeEventListener('beforeunload', persistBeforeLeaving);
      window.removeEventListener('pagehide', persistBeforeLeaving);
    };
  }, [form, persistDraft, selectedDesignItemId, selectedEquipmentPackageId, selectedMenuChoices]);

  React.useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const ticket = hash.get('zalo_ticket');
    const zaloError = hash.get('zalo_error');
    if (!ticket && !zaloError) return;

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (ticket) {
      const profile = zaloProfile(ticket);
      setZaloTicket(ticket);
      setGoogleCredential(null);
      setError(null);
      if (profile.name) {
        const values = { ...form.getFieldsValue(true), name: profile.name } as RegistrationFormValues;
        form.setFieldsValue(values);
        persistDraft(values);
      }
      void apiClient.academyWorkshopsPublic
        .findRegistrationWithZalo(code, { ticket })
        .then((existingRegistration) => {
          if (existingRegistration) rememberReceipt(existingRegistration.message);
        })
        .catch(() => undefined);
      return;
    }
    setError('Bạn chưa hoàn tất đăng nhập Zalo. Vui lòng thử lại.');
  }, [code, form, persistDraft, rememberReceipt]);

  const submit = React.useCallback(async () => {
    try {
      const values = await form.validateFields();
      const menuSelections = (info?.workshop.menu.categories || []).flatMap((category) => {
        const menuItemId = Number(values.menuSelections?.[category.category]);
        return Number.isInteger(menuItemId) && menuItemId > 0 ? [{ category: category.category, menuItemId }] : [];
      });
      const registration = { ...values, menuSelections };
      setSubmitting(true);
      const result = googleCredential
        ? await apiClient.academyWorkshopsPublic.registerWithGoogle(code, {
            credential: googleCredential,
            phone: registration.phone,
            goal: registration.goal,
            referrer: registration.referrer,
            menuSelections: registration.menuSelections,
            equipmentPackageId: registration.equipmentPackageId,
            designItemId: registration.designItemId,
          } satisfies RegisterAcademyWorkshopWithGoogleRequest)
        : zaloTicket
          ? await apiClient.academyWorkshopsPublic.registerWithZalo(code, {
              ticket: zaloTicket,
              phone: registration.phone,
              email: registration.email,
              goal: registration.goal,
              referrer: registration.referrer,
              menuSelections: registration.menuSelections,
              equipmentPackageId: registration.equipmentPackageId,
              designItemId: registration.designItemId,
            } satisfies RegisterAcademyWorkshopWithZaloRequest)
          : await apiClient.academyWorkshopsPublic.register(code, registration);
      clearDraft();
      rememberReceipt(result.message);
      await load();
    } catch (cause) {
      const errorFields = (cause as { errorFields?: Array<{ name?: Array<string | number> }> })?.errorFields;
      if (errorFields) {
        const firstInvalidField = errorFields[0]?.name?.[0];
        if (firstInvalidField === 'equipmentPackageId') setActiveSelectionSheet('equipment');
        if (firstInvalidField === 'designItemId') setActiveSelectionSheet('design');
        if (firstInvalidField === 'menuSelections') setActiveSelectionSheet('menu');
        return;
      }
      setError(failureMessage(cause, 'Không thể gửi đăng ký. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }, [clearDraft, code, form, googleCredential, info, load, rememberReceipt, zaloTicket]);

  const startAnotherRegistration = React.useCallback(() => {
    if (receiptStorageKey) window.sessionStorage.removeItem(receiptStorageKey);
    clearDraft();
    setReceipt(null);
    setGoogleCredential(null);
    setZaloTicket(null);
    setActiveSelectionSheet(null);
    setError(null);
    form.resetFields();
  }, [clearDraft, form, receiptStorageKey]);

  const receiveGoogleCredential = React.useCallback(
    async (credential: string) => {
      const profile = googleProfile(credential);
      setGoogleCredential(credential);
      setZaloTicket(null);
      setError(null);
      const values = {
        ...form.getFieldsValue(true),
        name: profile.name || form.getFieldValue('name'),
        email: profile.email || form.getFieldValue('email'),
      } as RegistrationFormValues;
      form.setFieldsValue(values);
      persistDraft(values);
      try {
        const existingRegistration = await apiClient.academyWorkshopsPublic.findRegistrationWithGoogle(code, {
          credential,
        });
        if (existingRegistration) rememberReceipt(existingRegistration.message);
      } catch {
        // A status lookup must not block a learner from completing a new registration.
      }
    },
    [code, form, persistDraft, rememberReceipt]
  );

  const selectedEquipmentPackage = info?.workshop.equipment.packages.find(
    (item) => item.id === Number(selectedEquipmentPackageId)
  );
  const selectedDesign = info?.workshop.design.items.find((item) => item.id === Number(selectedDesignItemId));
  const selectedMenuItems: WorkshopMenuSelectionSummary[] = (info?.workshop.menu.categories || []).flatMap(
    (category) => {
      const selectedItem = category.items.find((item) => item.id === Number(selectedMenuChoices?.[category.category]));
      return selectedItem
        ? [
            {
              id: selectedItem.id,
              category: category.category,
              label: category.label,
              name: selectedItem.name,
              imageUrl: selectedItem.imageUrl,
            },
          ]
        : [];
    }
  );
  const menuIncomplete = Boolean(
    info?.workshop.menu.required && info.workshop.menu.categories.some((category) => !category.items.length)
  );

  return {
    code,
    form,
    info,
    loading,
    submitting,
    error,
    setError,
    receipt,
    googleCredential,
    setGoogleCredential,
    zaloTicket,
    setZaloTicket,
    activeSelectionSheet,
    openSelectionSheet,
    closeSelectionSheet,
    selectedEquipmentPackageId,
    selectedDesignItemId,
    selectedEquipmentPackage,
    selectedDesign,
    selectedMenuItems,
    selectedMenuCount: selectedMenuItems.length,
    menuIncomplete,
    load,
    submit,
    persistDraft,
    startAnotherRegistration,
    receiveGoogleCredential,
  };
}
