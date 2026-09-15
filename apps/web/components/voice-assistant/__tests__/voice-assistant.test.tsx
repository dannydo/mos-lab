import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { cleanMarkdownForSpeech } from '../speech-utils';
import { VoiceVisualizerOrb } from '../VoiceVisualizerOrb';
import { VoiceAssistantModal } from '../VoiceAssistantModal';

// Mock theme context
vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light' }),
}));

describe('Voice Assistant System Suite', () => {
  describe('1. Speech Markdown Cleaner (TTS Text Optimization)', () => {
    it('removes markdown formatting for smooth speech vocalization', () => {
      const input = `### Báo Cáo Quy Định Dặm Mi
Chào bạn, **thời hạn dặm mi** là *21 ngày* cho khách lẻ và 25 ngày cho khách [gói combo](https://example.com).
- Điểm 1: Quy tắc CC
- Điểm 2: Không trễ hạn
\`\`\`
code block should be stripped
\`\`\`
Giá dịch vụ: \`250.000đ\``;

      const output = cleanMarkdownForSpeech(input);

      expect(output).not.toContain('###');
      expect(output).not.toContain('**');
      expect(output).not.toContain('*21 ngày*');
      expect(output).not.toContain('https://example.com');
      expect(output).not.toContain('code block');
      expect(output).toContain('Chào bạn, thời hạn dặm mi là 21 ngày cho khách lẻ và 25 ngày cho khách gói combo.');
      expect(output).toContain('Giá dịch vụ: 250.000đ');
    });
  });

  describe('2. VoiceVisualizerOrb Component', () => {
    it('renders idle state with click handler', () => {
      const handleClick = vi.fn();
      const { container } = render(<VoiceVisualizerOrb status="idle" size="medium" onClick={handleClick} />);

      const orb = container.firstChild as HTMLElement;
      expect(orb).not.toBeNull();
      fireEvent.click(orb);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders listening state with ping pulse rings', () => {
      const { container } = render(<VoiceVisualizerOrb status="listening" size="large" />);
      const pingRing = container.querySelector('.bg-rose-500\\/30.animate-ping');
      expect(pingRing).not.toBeNull();
    });

    it('renders speaking state with audio frequency bars', () => {
      const { container } = render(<VoiceVisualizerOrb status="speaking" size="large" />);
      const pulseBars = container.querySelectorAll('.bg-white.rounded-full.animate-pulse');
      expect(pulseBars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. VoiceAssistantModal Component', () => {
    it('renders dialog when open and shows quick prompts', () => {
      const handleClose = vi.fn();
      const handleToggleMute = vi.fn();
      const handleToggleListening = vi.fn();
      const handleStopSpeaking = vi.fn();
      const handleReplayLastMessage = vi.fn();
      const handleSendMessage = vi.fn();

      render(
        <VoiceAssistantModal
          open={true}
          onClose={handleClose}
          status="idle"
          transcript=""
          messages={[]}
          isMuted={false}
          onToggleMute={handleToggleMute}
          onToggleListening={handleToggleListening}
          onStopSpeaking={handleStopSpeaking}
          onReplayLastMessage={handleReplayLastMessage}
          onSendMessage={handleSendMessage}
        />
      );

      expect(screen.getByText('mOS Voice Copilot')).toBeInTheDocument();
      expect(screen.getByText(/Bấm 2 lần bất kỳ đâu để nói/i)).toBeInTheDocument();
      expect(screen.getByText('Thời hạn dặm mi bao nhiêu ngày?')).toBeInTheDocument();
    });

    it('displays listening status tag and live transcript', () => {
      render(
        <VoiceAssistantModal
          open={true}
          onClose={vi.fn()}
          status="listening"
          transcript="Doanh thu hôm nay đạt bao nhiêu?"
          messages={[]}
          isMuted={false}
          onToggleMute={vi.fn()}
          onToggleListening={vi.fn()}
          onStopSpeaking={vi.fn()}
          onReplayLastMessage={vi.fn()}
          onSendMessage={vi.fn()}
        />
      );

      expect(screen.getByText('🔴 ĐANG NGHE...')).toBeInTheDocument();
      expect(screen.getByText(/Doanh thu hôm nay đạt bao nhiêu?/i)).toBeInTheDocument();
    });

    it('allows clicking quick prompt to send message', () => {
      const handleSendMessage = vi.fn();

      render(
        <VoiceAssistantModal
          open={true}
          onClose={vi.fn()}
          status="idle"
          transcript=""
          messages={[]}
          isMuted={false}
          onToggleMute={vi.fn()}
          onToggleListening={vi.fn()}
          onStopSpeaking={vi.fn()}
          onReplayLastMessage={vi.fn()}
          onSendMessage={handleSendMessage}
        />
      );

      const promptBtn = screen.getByText('Thời hạn dặm mi bao nhiêu ngày?');
      fireEvent.click(promptBtn);
      expect(handleSendMessage).toHaveBeenCalledWith('Thời hạn dặm mi bao nhiêu ngày?');
    });
  });
});
