'use client';

import React from 'react';
import { AdaptiveDrawer } from '../../../../components/ui';
import { useTheme } from '../../../../context/ThemeContext';
import { TvQuoteFormModal } from './telesale-tv-quotes-drawer/TvQuoteFormModal';
import { TvQuotesList } from './telesale-tv-quotes-drawer/TvQuotesList';
import { TvQuotesToolbar } from './telesale-tv-quotes-drawer/TvQuotesToolbar';
import type { TelesaleTvQuotesDrawerProps } from './telesale-tv-quotes-drawer/tvQuotesTypes';
import { useTelesaleTvQuotes } from './telesale-tv-quotes-drawer/useTelesaleTvQuotes';
import { useTvQuoteAudioPreview } from './telesale-tv-quotes-drawer/useTvQuoteAudioPreview';

export type {
  TelesaleTvQuotesDrawerProps,
  TvPersonaOption,
  TvQuoteEventConfig,
  TvQuoteFormValues,
  TvQuoteVariableTag,
  TvTemplateSegment,
} from './telesale-tv-quotes-drawer/tvQuotesTypes';

export const TelesaleTvQuotesDrawer: React.FC<TelesaleTvQuotesDrawerProps> = ({
  open,
  onClose,
  zIndex = 100010,
  getContainer,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const { playingQuoteId, audioLoading, stopAudio, handlePlayPreview } = useTvQuoteAudioPreview();
  const {
    loading,
    saving,
    quotes,
    selectedPersona,
    setSelectedPersona,
    selectedEventType,
    setSelectedEventType,
    searchQuery,
    setSearchQuery,
    formModalOpen,
    setFormModalOpen,
    editingQuote,
    form,
    filteredQuotes,
    activeCount,
    customCount,
    handleToggleActive,
    handleDeleteQuote,
    handleResetToDefaults,
    handleOpenForm,
    handleInsertVariable,
    handleSaveForm,
  } = useTelesaleTvQuotes({ open, stopAudio });

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        width={780}
        zIndex={zIndex}
        getContainer={getContainer}
        closable={{ placement: 'end' }}
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-lg">📣</span>
            <div>
              <div className="text-base font-bold flex items-center gap-2">
                <span>Quản Lý Thông Điệp Cổ Vũ TV</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-semibold tabular-nums">
                  {quotes.length} câu
                </span>
              </div>
              <p className="text-xs font-normal text-zinc-400 dark:text-zinc-500 m-0">
                Tùy chỉnh kho câu chúc, gáy vang và phát loa tự động theo 5 nhân cách MC
              </p>
            </div>
          </div>
        }
        className={isDark ? 'dark-theme' : 'light-theme'}
      >
        <div className="flex flex-col gap-4">
          <TvQuotesToolbar
            isDark={isDark}
            zIndex={zIndex}
            saving={saving}
            quotes={quotes}
            filteredCount={filteredQuotes.length}
            activeCount={activeCount}
            customCount={customCount}
            selectedPersona={selectedPersona}
            onSelectPersona={setSelectedPersona}
            selectedEventType={selectedEventType}
            onSelectEventType={setSelectedEventType}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onResetToDefaults={handleResetToDefaults}
            onAddNew={() => handleOpenForm()}
          />

          <TvQuotesList
            loading={loading}
            quotes={filteredQuotes}
            isDark={isDark}
            zIndex={zIndex}
            playingQuoteId={playingQuoteId}
            audioLoading={audioLoading}
            onToggleActive={handleToggleActive}
            onPlayPreview={handlePlayPreview}
            onEdit={handleOpenForm}
            onDelete={handleDeleteQuote}
          />
        </div>
      </AdaptiveDrawer>

      <TvQuoteFormModal
        open={formModalOpen}
        saving={saving}
        isDark={isDark}
        zIndex={zIndex}
        getContainer={getContainer}
        editingQuote={editingQuote}
        form={form}
        onCancel={() => setFormModalOpen(false)}
        onSave={handleSaveForm}
        onInsertVariable={handleInsertVariable}
      />
    </>
  );
};
