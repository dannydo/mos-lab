'use client';

import React from 'react';
import { Alert, Button, Card, Divider, Form, Input, Result, Spin, Tag, Typography } from 'antd';
import { CalendarDays, CheckCircle2, Clock3, MapPin, MessageCircle, Sparkles, UsersRound } from 'lucide-react';
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import type {
  AcademyWorkshopPublicRegistrationInfo,
  RegisterAcademyWorkshopRequest,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import GoogleWorkshopJoinButton from '../../components/GoogleWorkshopJoinButton';

type RegistrationFormValues = RegisterAcademyWorkshopRequest;

function failureMessage(cause: unknown, fallback: string) {
  return (
    (cause as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
    (cause as Error)?.message ||
    fallback
  );
}

function formatFee(feeVnd: number) {
  return feeVnd > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(feeVnd))} đ` : 'Miễn phí';
}

function googleProfile(credential: string): { name: string; email: string } {
  try {
    const segment = credential.split('.')[1];
    if (!segment) return { name: '', email: '' };
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { name?: unknown; email?: unknown };
    return {
      name: String(payload.name || '').trim(),
      email: String(payload.email || '')
        .trim()
        .toLowerCase(),
    };
  } catch {
    return { name: '', email: '' };
  }
}

function zaloProfile(ticket: string): { name: string } {
  try {
    const segment = ticket.split('.')[1];
    if (!segment) return { name: '' };
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { name?: unknown };
    return { name: String(payload.name || '').trim() };
  } catch {
    return { name: '' };
  }
}

function phaseCopy(info: AcademyWorkshopPublicRegistrationInfo) {
  switch (info.phase) {
    case 'CHECKIN':
      return {
        type: 'success' as const,
        title: 'Workshop đã mở check-in',
        description: 'Nếu bạn đã đăng ký, hãy vào lobby để xác minh và bắt đầu trải nghiệm workshop.',
        action: 'Vào check-in',
      };
    case 'LIVE':
      return {
        type: 'info' as const,
        title: 'Workshop đang diễn ra',
        description: 'Bạn có thể vào lobby để xác minh danh tính và theo dõi nội dung đang diễn ra.',
        action: 'Vào workshop',
      };
    case 'COMPLETED':
      return {
        type: 'success' as const,
        title: 'Workshop đã hoàn thành',
        description: 'Cảm ơn bạn đã quan tâm. Academy sẽ liên hệ về các buổi học tiếp theo.',
        action: null,
      };
    default:
      return {
        type: 'warning' as const,
        title: 'Đăng ký hiện đang đóng',
        description: 'Vui lòng liên hệ Academy nếu bạn cần được hỗ trợ thêm.',
        action: null,
      };
  }
}

export default function AcademyWorkshopRegistrationPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code || '')).trim();
  const [form] = Form.useForm<RegistrationFormValues>();
  const [info, setInfo] = React.useState<AcademyWorkshopPublicRegistrationInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<string | null>(null);
  const [googleCredential, setGoogleCredential] = React.useState<string | null>(null);
  const [zaloTicket, setZaloTicket] = React.useState<string | null>(null);
  const receiptStorageKey = React.useMemo(
    () => (code ? `academy-workshop-registration-receipt:${code}` : null),
    [code]
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
    setReceipt(window.sessionStorage.getItem(receiptStorageKey));
  }, [receiptStorageKey]);

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
      if (profile.name) form.setFieldValue('name', profile.name);
      void apiClient.academyWorkshopsPublic
        .findRegistrationWithZalo(code, { ticket })
        .then((existingRegistration) => {
          if (existingRegistration) rememberReceipt(existingRegistration.message);
        })
        .catch(() => undefined);
      return;
    }
    setError('Bạn chưa hoàn tất đăng nhập Zalo. Vui lòng thử lại.');
  }, [code, form, rememberReceipt]);

  const submit = React.useCallback(async () => {
    try {
      const isExternalIdentity = Boolean(googleCredential || zaloTicket);
      const values = await form.validateFields(isExternalIdentity ? ['phone', 'email', 'goal', 'referrer'] : undefined);
      setSubmitting(true);
      const result = googleCredential
        ? await apiClient.academyWorkshopsPublic.registerWithGoogle(code, {
            credential: googleCredential,
            phone: values.phone,
            goal: values.goal,
            referrer: values.referrer,
          } satisfies RegisterAcademyWorkshopWithGoogleRequest)
        : zaloTicket
          ? await apiClient.academyWorkshopsPublic.registerWithZalo(code, {
              ticket: zaloTicket,
              phone: values.phone,
              email: values.email,
              goal: values.goal,
              referrer: values.referrer,
            } satisfies RegisterAcademyWorkshopWithZaloRequest)
          : await apiClient.academyWorkshopsPublic.register(code, values);
      rememberReceipt(result.message);
      await load();
    } catch (cause) {
      if ((cause as { errorFields?: unknown[] })?.errorFields) return;
      setError(failureMessage(cause, 'Không thể gửi đăng ký. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }, [code, form, googleCredential, load, rememberReceipt, zaloTicket]);

  const startAnotherRegistration = React.useCallback(() => {
    if (receiptStorageKey) window.sessionStorage.removeItem(receiptStorageKey);
    setReceipt(null);
    setGoogleCredential(null);
    setZaloTicket(null);
    setError(null);
    form.resetFields();
  }, [form, receiptStorageKey]);

  const receiveGoogleCredential = React.useCallback(
    async (credential: string) => {
      const profile = googleProfile(credential);
      setGoogleCredential(credential);
      setZaloTicket(null);
      setError(null);
      form.setFieldsValue({
        name: profile.name || form.getFieldValue('name'),
        email: profile.email || form.getFieldValue('email'),
      });
      try {
        const existingRegistration = await apiClient.academyWorkshopsPublic.findRegistrationWithGoogle(code, {
          credential,
        });
        if (existingRegistration) rememberReceipt(existingRegistration.message);
      } catch {
        // A status lookup must not block a learner from completing a new registration.
      }
    },
    [code, form, rememberReceipt]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Spin size="large" />
        <span className="ml-3">Đang mở workshop…</span>
      </main>
    );
  }

  if (error && !info) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <Result
          status="warning"
          title="Không thể mở workshop"
          subTitle={error}
          extra={<Button onClick={() => void load()}>Thử lại</Button>}
        />
      </main>
    );
  }

  if (!info) return null;
  const { workshop } = info;
  const nonRegistrationPhase = info.phase !== 'REGISTRATION';
  const status = nonRegistrationPhase ? phaseCopy(info) : null;

  return (
    <main className="min-h-[100svh] bg-slate-950 px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="bg-slate-900 px-5 py-7 text-white sm:px-8 sm:py-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              <Sparkles size={15} aria-hidden="true" /> Wings Academy Workshop
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{workshop.name}</h1>
            {workshop.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{workshop.description}</p>
            ) : null}
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-slate-200">
                <CalendarDays size={18} className="text-amber-300" aria-hidden="true" />
                <span>{dayjs(workshop.startsAt).format('dddd, DD/MM/YYYY · HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <MapPin size={18} className="text-amber-300" aria-hidden="true" />
                <span>{workshop.location}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Tag color="gold" className="!m-0 !px-3 !py-1 !text-sm">
                {formatFee(workshop.feeVnd)}
              </Tag>
              <Tag color={workshop.remainingSeats > 0 ? 'green' : 'red'} className="!m-0 !px-3 !py-1 !text-sm">
                Còn {workshop.remainingSeats}/{workshop.capacity} chỗ
              </Tag>
            </div>
          </header>

          <div className="p-5 sm:p-8">
            <div className="flex items-center gap-2">
              <Clock3 size={19} className="text-amber-600" aria-hidden="true" />
              <h2 className="text-lg font-extrabold">Bạn sẽ trải nghiệm gì?</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Agenda được Academy chuẩn bị cho buổi workshop này.</p>
            <ol className="mt-5 space-y-3">
              {workshop.agenda.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 p-3 sm:p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                    {item.sortOrder}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">{item.title}</div>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                    ) : null}
                    <span className="mt-2 inline-block text-xs font-semibold text-slate-400">
                      {Math.round(item.plannedDurationSeconds / 60)} phút
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="self-start lg:sticky lg:top-6">
          <Card className="overflow-hidden !rounded-3xl !border-0 shadow-2xl" bodyStyle={{ padding: 0 }}>
            <div className="bg-amber-400 px-5 py-4 text-slate-950">
              <div className="flex items-center gap-2 font-black">
                <UsersRound size={20} aria-hidden="true" /> Hành trình tham dự
              </div>
              <p className="mt-1 text-sm opacity-75">Đăng ký → Academy xác nhận → Check-in → Workshop live</p>
            </div>
            <div className="p-5 sm:p-6">
              {error ? (
                <Alert
                  type="error"
                  showIcon
                  closable
                  message="Chưa thể xử lý"
                  description={error}
                  onClose={() => setError(null)}
                  className="mb-4"
                />
              ) : null}
              {receipt ? (
                <Result
                  status="success"
                  icon={<CheckCircle2 className="mx-auto text-emerald-500" size={48} aria-hidden="true" />}
                  title="Đăng ký đã hoàn tất"
                  subTitle={receipt}
                  extra={
                    <Button type="link" onClick={startAnotherRegistration}>
                      Đăng ký người khác
                    </Button>
                  }
                />
              ) : nonRegistrationPhase && status ? (
                <>
                  <Alert type={status.type} showIcon message={status.title} description={status.description} />
                  {status.action && workshop.joinUrl ? (
                    <Button type="primary" size="large" block className="mt-5" href={workshop.joinUrl}>
                      {status.action}
                    </Button>
                  ) : null}
                </>
              ) : info.canRegister ? (
                <>
                  <Typography.Title level={3} className="!mb-1 !text-xl">
                    Đăng ký giữ chỗ
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" className="!mb-5">
                    Dùng Google hoặc Zalo để xác minh nhanh; Academy vẫn cần số điện thoại để xác nhận và gửi hướng dẫn
                    trước buổi học.
                  </Typography.Paragraph>
                  {googleCredential ? (
                    <Alert
                      className="mb-4"
                      type="success"
                      showIcon
                      message="Google đã xác minh"
                      description="Tên và email lấy từ Google. Hoàn tất số điện thoại để gửi đăng ký."
                      action={
                        <Button type="link" size="small" onClick={() => setGoogleCredential(null)}>
                          Dùng form
                        </Button>
                      }
                    />
                  ) : zaloTicket ? (
                    <Alert
                      className="mb-4"
                      type="success"
                      showIcon
                      message="Zalo đã xác minh"
                      description="Tên lấy từ Zalo. Hoàn tất số điện thoại để Academy liên hệ và xác nhận chỗ tham dự."
                      action={
                        <Button type="link" size="small" onClick={() => setZaloTicket(null)}>
                          Dùng form
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                        <div className="text-sm font-bold text-slate-800">Đăng ký bằng Google</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Tên và email của bạn được xác minh trực tiếp bởi Google.
                        </p>
                        <div className="mx-auto mt-3 w-full max-w-[320px]">
                          <GoogleWorkshopJoinButton disabled={submitting} onCredential={receiveGoogleCredential} />
                        </div>
                      </div>
                      <Divider plain className="!my-4 !text-xs !text-slate-400">
                        hoặc
                      </Divider>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                        <div className="text-sm font-bold text-slate-800">Đăng ký bằng Zalo</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Xác minh tài khoản Zalo, sau đó quay lại để hoàn tất số điện thoại.
                        </p>
                        <Button
                          className={
                            info.zaloAuthAvailable
                              ? 'mt-3'
                              : 'mt-3 !border-slate-300 !bg-slate-50 !text-slate-600 !opacity-100'
                          }
                          size="large"
                          block
                          icon={<MessageCircle size={18} aria-hidden="true" />}
                          disabled={!info.zaloAuthAvailable || submitting}
                          href={
                            info.zaloAuthAvailable ? apiClient.academyWorkshopsPublic.zaloAuthorizeUrl(code) : undefined
                          }
                        >
                          Tiếp tục với Zalo
                        </Button>
                        {!info.zaloAuthAvailable ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Zalo đang chờ API Academy được cấu hình bảo mật.
                          </p>
                        ) : null}
                      </div>
                      <Divider plain className="!my-5 !text-xs !text-slate-400">
                        hoặc điền trực tiếp
                      </Divider>
                    </>
                  )}
                  <Form form={form} layout="vertical" requiredMark="optional">
                    <Form.Item
                      label="Họ và tên"
                      name="name"
                      rules={
                        googleCredential || zaloTicket ? [] : [{ required: true, message: 'Vui lòng nhập họ và tên.' }]
                      }
                    >
                      <Input
                        size="large"
                        autoComplete="name"
                        placeholder="Tên của bạn"
                        disabled={Boolean(googleCredential || zaloTicket)}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Số điện thoại"
                      name="phone"
                      rules={[
                        { required: true, message: 'Vui lòng nhập số điện thoại.' },
                        { pattern: /^\+?[0-9\s.()-]{8,20}$/, message: 'Số điện thoại không hợp lệ.' },
                      ]}
                    >
                      <Input size="large" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0901 234 567" />
                    </Form.Item>
                    <Form.Item
                      label={googleCredential ? 'Email Google' : 'Email (tùy chọn)'}
                      name="email"
                      rules={[{ type: 'email', message: 'Email chưa đúng định dạng.' }]}
                    >
                      <Input
                        size="large"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        disabled={Boolean(googleCredential)}
                      />
                    </Form.Item>
                    <Form.Item label="Bạn mong chờ điều gì? (tùy chọn)" name="goal">
                      <Input.TextArea
                        rows={3}
                        maxLength={2000}
                        placeholder="Mục tiêu học, vấn đề bạn muốn được giải đáp…"
                      />
                    </Form.Item>
                    <Form.Item label="Ai giới thiệu bạn? (tùy chọn)" name="referrer">
                      <Input placeholder="Tên hoặc số điện thoại người giới thiệu" />
                    </Form.Item>
                    <Button type="primary" size="large" block loading={submitting} onClick={() => void submit()}>
                      Gửi đăng ký workshop
                    </Button>
                  </Form>
                </>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Workshop đã đủ chỗ"
                  description="Vui lòng liên hệ Academy để được hỗ trợ vào danh sách chờ."
                />
              )}
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
