import nodemailer, { type Transporter } from 'nodemailer';
import { generateOnboardingEmailHtml, OnboardingEmailData } from '../templates/onboarding-email.template.js';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  isMock?: boolean;
  error?: string;
}

export class MailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      this.transporter = null;
    }
  }

  public async sendOnboardingEmail(to: string, data: OnboardingEmailData): Promise<SendEmailResult> {
    const from = process.env.SMTP_FROM || 'Wings Lashes HR <admin.hr@wingslashes.com>';
    const subject = `[mOS] Hướng dẫn đăng nhập hệ thống Wings Lashes — ${data.displayName}`;
    const html = generateOnboardingEmailHtml(data);

    // If SMTP is not yet configured (e.g. local dev / test), mock send gracefully
    if (!this.isConfigured || !this.transporter) {
      console.warn(`[MailService:Mock] Simulating email sending to ${to}`);
      console.warn(`[MailService:Mock] Subject: ${subject}`);
      console.warn(`[MailService:Mock] Recipient: ${data.displayName} (${data.email})`);
      return {
        success: true,
        messageId: `mock-email-${Date.now()}`,
        isMock: true,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
        isMock: false,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[MailService] Failed to send email:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

export const mailService = new MailService();
