import { describe, it, expect } from 'vitest';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import {
  buildMosChatAiSessionPath,
  buildMosChatAiSessionPermalink,
  isValidMosChatSessionId,
  readMosChatSessionId,
  syncAiSessionIntoUrl,
  syncConversationIntoUrl,
} from './mos-chat-permalink';

const SESSION = '3f2b8c1e-9d4a-4e0b-8a57-1c2d3e4f5a6b';

describe('mOS Chat session permalink helpers', () => {
  it('builds a stable relative and absolute AI session permalink', () => {
    expect(buildMosChatAiSessionPath(SESSION)).toBe(`/chat?convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`);
    expect(buildMosChatAiSessionPermalink(SESSION, 'https://lab.masteros.app/')).toBe(
      `https://lab.masteros.app/chat?convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`
    );
  });

  it('only accepts safe session ids', () => {
    expect(isValidMosChatSessionId(SESSION)).toBe(true);
    expect(isValidMosChatSessionId('')).toBe(false);
    expect(isValidMosChatSessionId('short')).toBe(false);
    expect(isValidMosChatSessionId('../../etc/passwd')).toBe(false);
    expect(isValidMosChatSessionId('abc def ghi jkl')).toBe(false);
    expect(isValidMosChatSessionId(undefined)).toBe(false);
  });

  it('reads sessionId, chatSessionId or aiSessionId from query params', () => {
    const make = (q: string) => {
      const p = new URLSearchParams(q);
      return (k: string) => p.get(k);
    };
    expect(readMosChatSessionId(make(`sessionId=${SESSION}`))).toBe(SESSION);
    expect(readMosChatSessionId(make(`chatSessionId=${SESSION}`))).toBe(SESSION);
    expect(readMosChatSessionId(make(`aiSessionId=${SESSION}`))).toBe(SESSION);
    expect(readMosChatSessionId(make('sessionId=bad%20id'))).toBeUndefined();
    expect(readMosChatSessionId(make('tab=chat'))).toBeUndefined();
  });

  it('mirrors the active session into the URL without touching unrelated params', () => {
    const next = syncAiSessionIntoUrl('http://x/chat?tab=chat&msgId=m1&convId=other', SESSION);
    expect(next).toBe(`/chat?tab=chat&convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`);
  });

  it('prefers convId over legacy aliases and drops stale message params', () => {
    const next = syncAiSessionIntoUrl(`http://x/chat?chatConvId=old&chatMsgId=m9&threadId=t1&tab=tasks`, SESSION);
    expect(next).toBe(`/chat?tab=tasks&convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`);
  });

  it('returns null when the URL already points to the session', () => {
    const href = `http://x/chat?convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`;
    expect(syncAiSessionIntoUrl(href, SESSION)).toBeNull();
  });

  it('keeps the AI conversation but removes the session when none is active', () => {
    const href = `http://x/chat?convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`;
    expect(syncAiSessionIntoUrl(href, null)).toBe(`/chat?convId=${AI_COPILOT_CONV_ID}`);
  });

  it('never keeps a session id on a regular conversation permalink', () => {
    const href = `http://x/chat?convId=${AI_COPILOT_CONV_ID}&sessionId=${SESSION}`;
    expect(syncConversationIntoUrl(href, 'space-123', SESSION)).toBe('/chat?convId=space-123');
    expect(syncConversationIntoUrl('http://x/chat?convId=space-123', 'space-123')).toBeNull();
  });
});
