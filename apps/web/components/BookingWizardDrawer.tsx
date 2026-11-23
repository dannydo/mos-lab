'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Button, theme, message } from 'antd';
import { CalendarOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api-client';
import { CustomerCampaignPromotionInfo } from '@mos-lab/shared';

// Shared modules
import { STORES, FALLBACK_SERVICES } from './booking/constants';
import { getCalculatedPrice } from './booking/comboUtils';
import { useBookingStaff } from './booking/useBookingStaff';
import { useSlotMatrix } from './booking/useSlotMatrix';
import { useCustomerInsights } from './booking/useCustomerInsights';
import { BookingTemplateManagerModal } from './booking/BookingTemplateManagerModal';
import CreateCustomerModal from './CreateCustomerModal';
import { AdaptiveDrawer } from './ui/AdaptiveOverlay';
import { notifyBookingMutation, toBookingCustomerId } from '../lib/booking-events';
import {
  buildValidatedBookingPayload,
  isCvDateDisabled,
  normalizeInitialBookingCustomer,
  resolveInitialStore,
} from './booking/wizard/bookingWizardHelpers';
import { useBookingWizardTemplates } from './booking/wizard/useBookingWizardTemplates';
import { useBookingWizardCustomerAndPromos } from './booking/wizard/useBookingWizardCustomerAndPromos';
import { BookingWizardCvAndBranchSection } from './booking/wizard/BookingWizardCvAndBranchSection';
import { BookingWizardCustomerSection } from './booking/wizard/BookingWizardCustomerSection';
import { BookingWizardServiceSection } from './booking/wizard/BookingWizardServiceSection';
import { BookingWizardPromotionsAndNoteSection } from './booking/wizard/BookingWizardPromotionsAndNoteSection';
import { BookingWizardSlotSection } from './booking/wizard/BookingWizardSlotSection';
import {
  BookingWizardConfirmationCard,
  BookingWizardLateSlotModal,
} from './booking/wizard/BookingWizardMessageAndModals';

interface BookingWizardDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: SafeAny;
  /**
   * Campaign context supplied when booking starts from a campaign customer row.
   * It is an immediate UI hint only; the API still re-checks membership, status,
   * date window, service scope, and final price before saving.
   */
  initialCampaignPromotions?: CustomerCampaignPromotionInfo[];
  initialCV?: SafeAny;
  initialBranch?: SafeAny;
  initialDate?: dayjs.Dayjs | string;
  initialSlot?: string;
  initialIsOverbook?: boolean;
}

const BookingWizardDrawer: React.FC<BookingWizardDrawerProps> = ({
  open,
  onClose,
  onSuccess,
  initialCustomer,
  initialCampaignPromotions,
  initialCV,
  initialBranch,
  initialDate,
  initialSlot,
  initialIsOverbook,
}) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  // 1-Step UI Toggle States
  const [showCvCardSelector, setShowCvCardSelector] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  // Core Form States
  const [selectedCV, setSelectedCV] = useState<SafeAny>(null);
  const [selectedCN, setSelectedCN] = useState<SafeAny>(STORES[0]);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<SafeAny>(null);
  const [services, setServices] = useState<SafeAny[]>(FALLBACK_SERVICES);
  const [bookingChannel, setBookingChannel] = useState('FB');
  const [bookingNote, setBookingNote] = useState('');

  // 20:00 Late Slot Confirmation Modal States
  const [isLateSlotModalOpen, setIsLateSlotModalOpen] = useState<boolean>(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [pickerNonce, setPickerNonce] = useState<number>(0);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingCreationError, setBookingCreationError] = useState<string | null>(null);

  const customerPromos = useBookingWizardCustomerAndPromos({
    open,
    initialCampaignPromotions,
    selectedService,
  });

  const { favoriteTechs, comboBalances, suggestedServices, lastUsedServices, suggestedBranch, customerLastVisit } =
    useCustomerInsights(customerPromos.selectedCustomer, selectedCN, setSelectedCN);

  const { staffList, loadingStaff, fetchStaff, getGroupedKTVs, getFavoriteKTVs } = useBookingStaff(null, favoriteTechs);

  const {
    bookingDate: rawBookingDate,
    setBookingDate: setRawBookingDate,
    selectedSlot,
    setSelectedSlot,
    slotMatrix,
    loadingSlots,
    fetchSlots,
    getNextAvailableDate,
    getCategorizedSlots,
  } = useSlotMatrix(selectedCN, selectedCV);

  const handleSelectSlot = (slot: string | null) => {
    if (!slot) {
      setSelectedSlot(null);
      return;
    }
    if (slot === '20:00') {
      setPendingSlot(slot);
      setIsLateSlotModalOpen(true);
      return;
    }
    setSelectedSlot(slot);
  };

  const templates = useBookingWizardTemplates({
    open,
    isNewLead: customerPromos.isNewLead,
    leadName: customerPromos.leadName,
    selectedCustomer: customerPromos.selectedCustomer,
    selectedCN,
    selectedSlot,
    rawBookingDate,
    selectedCV,
    customerLastVisit,
  });

  const { morning, afternoon, night } = getCategorizedSlots();

  const isCVOff = useCallback((date: dayjs.Dayjs, cv: SafeAny) => isCvDateDisabled(date, cv, staffList), [staffList]);

  const setBookingDate = useCallback(
    (newDate: dayjs.Dayjs | null) => {
      if (!newDate) return;
      const adjusted = getNextAvailableDate(dayjs(newDate), selectedCV);
      setRawBookingDate(dayjs(adjusted));
      setPickerNonce((prev) => prev + 1);
    },
    [selectedCV, getNextAvailableDate, setRawBookingDate]
  );

  const bookingDate = rawBookingDate;

  useEffect(() => {
    if (rawBookingDate && (rawBookingDate.isBefore(dayjs().startOf('day')) || isCVOff(rawBookingDate, selectedCV))) {
      const adjusted = getNextAvailableDate(rawBookingDate.add(1, 'day'), selectedCV);
      setRawBookingDate(dayjs(adjusted));
      setPickerNonce((prev) => prev + 1);
    }
  }, [rawBookingDate, selectedCV, isCVOff, getNextAvailableDate, setRawBookingDate]);

  const safeBookingDate = useMemo(() => {
    const target = bookingDate || dayjs();
    return getNextAvailableDate(target, selectedCV);
  }, [bookingDate, selectedCV, getNextAvailableDate]);

  const fetchServices = async () => {
    try {
      const data = await apiClient.customers.getServices();
      setServices(data || FALLBACK_SERVICES);
      if (data && data.length > 0) {
        setSelectedService(data[0]);
      }
    } catch (err) {
      console.error('[BookingWizard] Failed to fetch services:', err);
      setServices(FALLBACK_SERVICES);
    }
  };

  const resetForm = () => {
    setShowCvCardSelector(false);
    setShowMessagePreview(false);
    setSelectedCV(initialCV || null);
    const resolvedBranch = initialBranch
      ? resolveInitialStore(initialBranch)
      : initialCV?.notes
        ? resolveInitialStore(initialCV.notes)
        : STORES[0];
    setSelectedCN(resolvedBranch);
    if (initialCustomer) {
      const normalizedCust = normalizeInitialBookingCustomer(initialCustomer);
      customerPromos.setSelectedCustomer(normalizedCust);
      customerPromos.setCustomerList([normalizedCust]);
      customerPromos.setIsNewLead(false);
    } else {
      customerPromos.setSelectedCustomer(null);
      customerPromos.setIsNewLead(false);
    }
    customerPromos.setLeadName('');
    customerPromos.setLeadPhone('');

    if (initialDate) {
      setRawBookingDate(dayjs(initialDate));
    } else {
      const checkCV =
        initialCV || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));
      const initialAvailable = getNextAvailableDate(dayjs(), checkCV);
      const safeInitial =
        initialAvailable.date() === 27 || initialAvailable.date() === 26 || initialAvailable.day() === 2
          ? getNextAvailableDate(dayjs(), checkCV)
          : initialAvailable;
      setRawBookingDate(safeInitial);
    }

    setSelectedSlot(initialSlot || null);
    setBookingChannel('FB');
    setBookingNote(initialIsOverbook ? '[⚠️ Ép lịch Overbook]' : '');
    setBookingCreationError(null);
    customerPromos.setSelectedPromotion(null);
    customerPromos.setCustomerCampaignPromotions(initialCampaignPromotions || []);
    customerPromos.setSelectedCampaignPromotion(null);
    customerPromos.setReferralPhone('');
  };

  useEffect(() => {
    if (open) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
      fetchServices();
      customerPromos.fetchPromotions();
      resetForm();
      void templates.fetchBookingTemplates().then((list) => templates.autoSelectTemplate(list));
    }
  }, [open]);

  // Re-fetch staff directory dynamically when selected booking date changes
  useEffect(() => {
    if (open && bookingDate) {
      fetchStaff(bookingDate.format('YYYY-MM-DD'));
    }
  }, [bookingDate, open]);

  // Fetch slot matrix when dependencies change
  useEffect(() => {
    if (open && selectedCN) {
      fetchSlots();
    }
  }, [selectedCN, bookingDate, selectedCV, open]);

  const selectCVOption = (cv: SafeAny) => {
    setSelectedCV(cv);
    setShowCvCardSelector(false);

    const checkCV =
      cv || (staffList || []).find((s: SafeAny) => (s.displayName || '').toLowerCase().includes('cẩm tiên'));

    if (cv && cv.notes) {
      const matchedStore = STORES.find((s) => s.name === cv.notes) || STORES[0];
      setSelectedCN(matchedStore);
    }

    const cvName = ((checkCV && checkCV.displayName) || 'cẩm tiên').trim().toLowerCase();
    const isCamTien = !checkCV || cvName.includes('cẩm tiên') || cvName.includes('cam tien') || cvName.includes('tiên');

    if (isCamTien || isCVOff(bookingDate, checkCV)) {
      const adjustedDate = getNextAvailableDate(bookingDate, checkCV);
      const finalDate =
        adjustedDate.date() === 27 || adjustedDate.date() === 26 || adjustedDate.day() === 2
          ? getNextAvailableDate(dayjs(), checkCV)
          : adjustedDate;
      setRawBookingDate(finalDate);
      setPickerNonce((prev) => prev + 1);
      message.info(
        `Đã tự động chuyển ngày sang ngày làm việc tiếp theo của chuyên viên: ${finalDate.format('DD/MM/YYYY')}`
      );
    }
  };

  const handleFinalCreateBooking = async () => {
    const validationResult = buildValidatedBookingPayload({
      selectedCN,
      selectedService,
      selectedSlot,
      selectedCustomer: customerPromos.selectedCustomer,
      isNewLead: customerPromos.isNewLead,
      leadName: customerPromos.leadName,
      leadPhone: customerPromos.leadPhone,
      selectedCV,
      rawBookingDate,
      bookingChannel,
      bookingNote,
      comboBalances,
      selectedPromotion: customerPromos.selectedPromotion,
      selectedCampaignPromotion: customerPromos.selectedCampaignPromotion,
      referralPhone: customerPromos.referralPhone,
      isForeignCustomer: customerPromos.isForeignCustomer,
    });

    if ('error' in validationResult) {
      message.error(validationResult.error);
      return;
    }

    setBookingCreationError(null);
    setCreatingBooking(true);
    try {
      await apiClient.customers.createBooking(validationResult.payload);
      message.success(
        `Đặt lịch thành công cho khách hàng ${
          customerPromos.isNewLead
            ? customerPromos.leadName
            : customerPromos.selectedCustomer.name || customerPromos.selectedCustomer.customerName
        }!`
      );
      notifyBookingMutation(
        {
          action: 'created',
          customerId: customerPromos.isNewLead
            ? null
            : toBookingCustomerId(customerPromos.selectedCustomer?.legacyUserId || customerPromos.selectedCustomer?.id),
        },
        { refreshCallLog: true }
      );

      onSuccess();
      onClose();
    } catch (err) {
      console.error('[BookingWizard] Failed to create booking:', err);
      const serverMsg =
        (err as SafeAny).response?.data?.message || (err as SafeAny).response?.data?.error || (err as Error).message;
      const userMessage = serverMsg || 'Có lỗi xảy ra khi tạo lịch đặt hẹn. Vui lòng kiểm tra lại.';
      setBookingCreationError(userMessage);
      message.error(userMessage);
    } finally {
      setCreatingBooking(false);
    }
  };

  const priceInfo = getCalculatedPrice(
    selectedService,
    customerPromos.selectedPromotion,
    customerPromos.selectedCampaignPromotion
  );

  const isSubmitDisabled =
    !selectedService ||
    (!customerPromos.isNewLead && !customerPromos.selectedCustomer) ||
    (customerPromos.isNewLead && (!customerPromos.leadName || !customerPromos.leadPhone)) ||
    !selectedSlot ||
    !selectedCN;

  return (
    <AdaptiveDrawer
      intent="form"
      className="booking-wizard-overlay"
      maskClosable={false}
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: themeMode === 'dark' ? '#D4A84B' : '#855b0e',
          }}
        >
          <CalendarOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontWeight: 'bold' }}>ĐẶT LỊCH HẸN KHÁCH HÀNG (1 BƯỚC)</span>
        </div>
      }
      placement="right"
      open={open}
      onClose={onClose}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <Button onClick={onClose}>Đóng</Button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              icon={<CopyOutlined />}
              onClick={templates.handleCopyMessage}
              style={{
                borderColor: '#fa8c16',
                color: themeMode === 'dark' ? '#ffa940' : '#d87a16',
              }}
            >
              Sao chép tin nhắn
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={creatingBooking}
              disabled={isSubmitDisabled}
              onClick={handleFinalCreateBooking}
              style={{
                backgroundColor: isSubmitDisabled ? undefined : '#52c41a',
                borderColor: isSubmitDisabled ? undefined : '#52c41a',
                fontWeight: 'bold',
              }}
            >
              Hoàn tất & Tạo Lịch
            </Button>
          </div>
        </div>
      }
      styles={{
        body: {
          background: themeMode === 'dark' ? '#141414' : '#f9fafb',
          padding: '20px 24px',
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {bookingCreationError && (
          <Alert
            type="error"
            showIcon
            closable
            message="Chưa thể tạo lịch"
            description={bookingCreationError}
            onClose={() => setBookingCreationError(null)}
          />
        )}

        <BookingWizardCvAndBranchSection
          themeMode={themeMode}
          selectedCV={selectedCV}
          selectedCN={selectedCN}
          onSelectCN={setSelectedCN}
          showCvCardSelector={showCvCardSelector}
          onToggleCvCardSelector={() => setShowCvCardSelector((prev) => !prev)}
          staffList={staffList}
          loadingStaff={loadingStaff}
          safeBookingDate={safeBookingDate}
          onSelectCVOption={selectCVOption}
          favoriteTechs={favoriteTechs}
          getFavoriteKTVs={getFavoriteKTVs}
          getGroupedKTVs={getGroupedKTVs}
          suggestedBranch={suggestedBranch}
        />

        <BookingWizardCustomerSection
          themeMode={themeMode}
          colorText={token.colorText}
          isNewLead={customerPromos.isNewLead}
          onChangeLeadMode={(isNew) => {
            customerPromos.setIsNewLead(isNew);
            customerPromos.setSelectedCustomer(null);
          }}
          onOpenCreateCustomerModal={() => setIsCreateCustomerModalOpen(true)}
          searchQuery={customerPromos.searchQuery}
          searchingCustomers={customerPromos.searchingCustomers}
          customerList={customerPromos.customerList}
          selectedCustomer={customerPromos.selectedCustomer}
          onSearchCustomers={customerPromos.handleSearchCustomers}
          onSelectCustomer={customerPromos.setSelectedCustomer}
          leadName={customerPromos.leadName}
          onChangeLeadName={customerPromos.setLeadName}
          leadPhone={customerPromos.leadPhone}
          onChangeLeadPhone={customerPromos.setLeadPhone}
          isForeignCustomer={customerPromos.isForeignCustomer}
          onChangeForeignCustomer={customerPromos.setIsForeignCustomer}
        />

        <BookingWizardServiceSection
          themeMode={themeMode}
          colorText={token.colorText}
          services={services}
          selectedService={selectedService}
          onSelectService={setSelectedService}
          suggestedServices={suggestedServices}
          lastUsedServices={lastUsedServices}
          comboBalances={comboBalances}
        />

        <BookingWizardPromotionsAndNoteSection
          themeMode={themeMode}
          colorText={token.colorText}
          customerCampaignPromotions={customerPromos.customerCampaignPromotions}
          visibleCustomerCampaignPromotions={customerPromos.visibleCustomerCampaignPromotions}
          selectedCampaignPromotion={customerPromos.selectedCampaignPromotion}
          onSelectCampaignPromotion={customerPromos.setSelectedCampaignPromotion}
          promotions={customerPromos.promotions}
          selectedPromotion={customerPromos.selectedPromotion}
          onSelectPromotion={customerPromos.setSelectedPromotion}
          fixedPriceEligibilityNotices={customerPromos.fixedPriceEligibilityNotices}
          referralPhone={customerPromos.referralPhone}
          onChangeReferralPhone={customerPromos.setReferralPhone}
          selectedService={selectedService}
          priceInfo={priceInfo}
          bookingChannel={bookingChannel}
          onChangeBookingChannel={setBookingChannel}
          bookingNote={bookingNote}
          onChangeBookingNote={setBookingNote}
        />

        <div style={{ height: '1px', background: themeMode === 'dark' ? '#334155' : '#e5e7eb', margin: '6px 0' }} />

        <BookingWizardSlotSection
          themeMode={themeMode}
          selectedCV={selectedCV}
          selectedCN={selectedCN}
          safeBookingDate={safeBookingDate}
          pickerNonce={pickerNonce}
          staffList={staffList}
          onChangeDate={(nextDate) => {
            setBookingDate(nextDate);
            setPickerNonce((prev) => prev + 1);
          }}
          slotMatrix={slotMatrix}
          loadingSlots={loadingSlots}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          morning={morning}
          afternoon={afternoon}
          night={night}
        />

        <BookingWizardConfirmationCard
          themeMode={themeMode}
          showMessagePreview={showMessagePreview}
          onToggleMessagePreview={() => setShowMessagePreview((prev) => !prev)}
          bookingTemplates={templates.bookingTemplates}
          selectedTemplateId={templates.selectedTemplateId}
          loadingTemplates={templates.loadingTemplates}
          savingTemplate={templates.savingTemplate}
          customMessage={templates.customMessage}
          previewMessage={templates.evaluateBookingTemplate(templates.customMessage)}
          customerDisplayName={
            customerPromos.isNewLead
              ? customerPromos.leadName
              : customerPromos.selectedCustomer?.name || customerPromos.selectedCustomer?.customerName || 'KHÁCH HÀNG'
          }
          onChangeTemplateId={(val, content) => {
            templates.setSelectedTemplateId(val);
            if (content !== undefined) templates.setCustomMessage(content);
          }}
          onChangeCustomMessage={templates.setCustomMessage}
          onAppendTag={(tag) => templates.setCustomMessage((prev) => prev + tag)}
          onOpenManagerModal={() => templates.setIsManagerModalOpen(true)}
          onSaveTemplate={templates.handleSaveTemplate}
          onCopyMessage={templates.handleCopyMessage}
        />

        <Button
          type="primary"
          size="large"
          icon={<CheckOutlined />}
          loading={creatingBooking}
          disabled={isSubmitDisabled}
          onClick={handleFinalCreateBooking}
          style={{
            width: '100%',
            backgroundColor: isSubmitDisabled ? undefined : '#52c41a',
            borderColor: isSubmitDisabled ? undefined : '#52c41a',
            fontWeight: 'bold',
          }}
        >
          Hoàn tất & Tạo Lịch
        </Button>
      </div>

      <CreateCustomerModal
        open={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onCreated={(customer) => {
          customerPromos.setSelectedCustomer(customer);
          customerPromos.setCustomerList([customer]);
          customerPromos.setIsNewLead(false);
          message.info('Đã chọn khách vừa thêm. Bạn có thể tiếp tục đặt lịch hoặc đóng luồng này.');
        }}
      />

      <BookingTemplateManagerModal
        open={templates.isManagerModalOpen}
        onClose={() => templates.setIsManagerModalOpen(false)}
        templates={templates.bookingTemplates}
        onTemplatesUpdated={(newList) => {
          templates.setBookingTemplates(newList);
          templates.autoSelectTemplate(newList);
        }}
      />

      <BookingWizardLateSlotModal
        themeMode={themeMode}
        open={isLateSlotModalOpen}
        onCancel={() => {
          setIsLateSlotModalOpen(false);
          setPendingSlot(null);
          message.warning('Vui lòng thông báo quy định 15 phút cho khách trước khi đặt khung 20:00!');
        }}
        onConfirm={() => {
          if (pendingSlot) {
            setSelectedSlot(pendingSlot);
          }
          setIsLateSlotModalOpen(false);
          setPendingSlot(null);
          message.success('Đã xác nhận thông báo quy định 20:15 với khách!');
        }}
      />
    </AdaptiveDrawer>
  );
};

export default BookingWizardDrawer;
