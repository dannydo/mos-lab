import assert from 'node:assert/strict';
import test from 'node:test';
import { generateOnboardingEmailHtml } from '../../templates/onboarding-email.template.js';
import { mailService } from '../../services/mail.service.js';

test('generateOnboardingEmailHtml renders branded HTML with staff name and Google Sign-in steps', () => {
  const html = generateOnboardingEmailHtml({
    displayName: 'Phương Nhi',
    email: 'phuongnhi@wingslashes.com',
    roleName: 'Chuyên Viên',
    loginUrl: 'https://lab.masteros.app/login',
  });

  assert.ok(html.includes('WINGS LASHES'), 'Should contain WINGS LASHES header');
  assert.ok(html.includes('Phương Nhi'), 'Should contain recipient display name');
  assert.ok(html.includes('phuongnhi@wingslashes.com'), 'Should contain recipient email');
  assert.ok(html.includes('Chuyên Viên'), 'Should contain recipient role');
  assert.ok(html.includes('Đăng nhập bằng Google'), 'Should contain Google Sign-In guidance');
  assert.ok(html.includes('https://lab.masteros.app/login'), 'Should contain login URL');
  assert.ok(html.includes('Thêm vào Màn hình chính'), 'Should contain PWA mobile tips');
});

test('mailService handles fallback in development environment gracefully', async () => {
  const result = await mailService.sendOnboardingEmail('test@wingslashes.com', {
    displayName: 'Test Staff',
    email: 'test@wingslashes.com',
    roleName: 'Telesales',
  });

  assert.equal(result.success, true, 'Should succeed in mock or SMTP mode');
  assert.ok(result.messageId, 'Should return a valid messageId');
});
