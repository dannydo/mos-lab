import type { FastifyInstance } from 'fastify';
import type {
  TelesaleTvEdginessLevel,
  TelesaleTvEventLog,
  TelesaleTvJournalOverview,
  TelesaleTvPersonaDto,
  TelesaleTvQuoteItem,
  TelesaleTvQuotesConfig,
  TelesaleTvQuotesOverviewResponse,
} from '@mos-lab/shared';
import {
  type CelebrationEventType,
  type CelebrationQuoteOptions,
  TV_CELEBRATION_PERSONAS,
  formatCurrencyForSpeech,
  resolveCelebrationPersona,
} from './telesale-tv-celebration-service/tv-personas.js';
import {
  CRM_CONFIG_CELEBRATION_QUOTES_KEY,
  getDefaultCelebrationQuotes,
} from './telesale-tv-celebration-service/tv-default-quotes.js';
import {
  getCelebrationQuotesConfig,
  getCelebrationQuotesOverview,
  resetCelebrationQuotesConfig,
  saveCelebrationQuotesConfig,
} from './telesale-tv-celebration-service/tv-quotes-config.js';
import {
  getFallbackCelebrationQuote,
  getFallbackCelebrationQuoteWithPersona,
} from './telesale-tv-celebration-service/tv-fallback-quotes.js';
import { generateLiveCelebrationQuote } from './telesale-tv-celebration-service/tv-live-quote.js';
import { synthesizeCelebrationAudio } from './telesale-tv-celebration-service/tv-audio-synthesizer.js';
import { getTvJournal, recordTvJournalSync } from './telesale-tv-celebration-service/tv-journal.js';

export {
  type CelebrationEventType,
  type CelebrationQuoteOptions,
  TV_CELEBRATION_PERSONAS,
  CRM_CONFIG_CELEBRATION_QUOTES_KEY,
  formatCurrencyForSpeech,
  resolveCelebrationPersona,
  getDefaultCelebrationQuotes,
  getCelebrationQuotesConfig,
  saveCelebrationQuotesConfig,
  resetCelebrationQuotesConfig,
  getCelebrationQuotesOverview,
  getFallbackCelebrationQuoteWithPersona,
  getFallbackCelebrationQuote,
  generateLiveCelebrationQuote,
  synthesizeCelebrationAudio,
  recordTvJournalSync,
  getTvJournal,
};

export class TelesaleTvCelebrationService {
  static formatCurrencyForSpeech(amount?: number | null): string {
    return formatCurrencyForSpeech(amount);
  }

  // 5 Distinct Personas for TV Live Celebration
  static readonly TV_CELEBRATION_PERSONAS: Record<string, TelesaleTvPersonaDto> = TV_CELEBRATION_PERSONAS;

  static readonly CRM_CONFIG_CELEBRATION_QUOTES_KEY = CRM_CONFIG_CELEBRATION_QUOTES_KEY;

  static getDefaultCelebrationQuotes(): TelesaleTvQuoteItem[] {
    return getDefaultCelebrationQuotes();
  }

  static async getCelebrationQuotesConfig(fastify: FastifyInstance): Promise<TelesaleTvQuotesConfig> {
    return getCelebrationQuotesConfig(fastify);
  }

  static async saveCelebrationQuotesConfig(
    fastify: FastifyInstance,
    quotes: TelesaleTvQuoteItem[],
    updatedBy = 'user'
  ): Promise<TelesaleTvQuotesConfig> {
    return saveCelebrationQuotesConfig(fastify, quotes, updatedBy);
  }

  static async resetCelebrationQuotesConfig(
    fastify: FastifyInstance,
    personaKey?: string
  ): Promise<TelesaleTvQuotesConfig> {
    return resetCelebrationQuotesConfig(fastify, personaKey);
  }

  static async getCelebrationQuotesOverview(fastify: FastifyInstance): Promise<TelesaleTvQuotesOverviewResponse> {
    return getCelebrationQuotesOverview(fastify);
  }

  static resolveCelebrationPersona(requestedKey?: string): TelesaleTvPersonaDto {
    return resolveCelebrationPersona(requestedKey);
  }

  static getFallbackCelebrationQuoteWithPersona(
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: TelesaleTvEdginessLevel;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ): { quote: string; persona: TelesaleTvPersonaDto } {
    return getFallbackCelebrationQuoteWithPersona(type, staffName, options);
  }

  static getFallbackCelebrationQuote(
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      ccStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: TelesaleTvEdginessLevel;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ): string {
    return getFallbackCelebrationQuote(type, staffName, options);
  }

  static async generateLiveCelebrationQuote(
    fastify: FastifyInstance,
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      ccStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: TelesaleTvEdginessLevel;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ): Promise<{ quote: string; source: 'gemini' | 'fallback'; persona: TelesaleTvPersonaDto }> {
    return generateLiveCelebrationQuote(fastify, type, staffName, options);
  }

  static async synthesizeCelebrationAudio(
    text: string,
    voice = 'vi-VN-HoaiMyNeural',
    rate = '+0%',
    pitch = '+0Hz'
  ): Promise<Buffer> {
    return synthesizeCelebrationAudio(text, voice, rate, pitch);
  }

  static recordTvJournalSync(records: TelesaleTvEventLog[]): { success: boolean; count: number } {
    return recordTvJournalSync(records);
  }

  static async getTvJournal(fastify: FastifyInstance, dateParam?: string): Promise<TelesaleTvJournalOverview> {
    return getTvJournal(fastify, dateParam);
  }
}
