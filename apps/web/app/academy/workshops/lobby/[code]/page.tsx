'use client';

import React from 'react';
import { Avatar, Button, Empty, Input, Modal, Result, Spin } from 'antd';
import { ArrowRight, MapPin, Phone, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { useParams } from 'next/navigation';
import {
  removeVietnameseTones,
  type AcademyWorkshopPublicSession,
  type AcademyWorkshopSharedJoinInfo,
  type AcademyWorkshopSharedJoinParticipant,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import { workshopInitials } from '../../../../../lib/academy-workshop-live';
import AcademyWorkshopPlayer from '../../components/AcademyWorkshopPlayer';
import GoogleWorkshopJoinButton from '../../components/GoogleWorkshopJoinButton';

function errorMessage(cause: any, fallback: string): string {
  return cause?.response?.data?.message || cause?.message || fallback;
}

export default function AcademyWorkshopSharedLobbyPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code || ''))
    .trim()
    .toUpperCase();
  const sessionKey = `academy-workshop-shared-session:${code}`;
  const [info, setInfo] = React.useState<AcademyWorkshopSharedJoinInfo | null>(null);
  const [session, setSession] = React.useState<AcademyWorkshopPublicSession | null>(null);
  const [selected, setSelected] = React.useState<AcademyWorkshopSharedJoinParticipant | null>(null);
  const [phone, setPhone] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [selecting, setSelecting] = React.useState(false);
  const [googleJoining, setGoogleJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [googleError, setGoogleError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const nextInfo = await apiClient.academyWorkshopsPublic.getSharedJoinInfo(code);
      setInfo(nextInfo);
      const cached = JSON.parse(
        window.localStorage.getItem(sessionKey) || 'null'
      ) as AcademyWorkshopPublicSession | null;
      if (cached && new Date(cached.expiresAt) > new Date() && cached.workshop.id === nextInfo.workshop.id) {
        setSession(cached);
      } else {
        window.localStorage.removeItem(sessionKey);
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Không thể mở danh sách học viên workshop.'));
    } finally {
      setLoading(false);
    }
  }, [code, sessionKey]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const enterAs = React.useCallback(
    async (participant: AcademyWorkshopSharedJoinParticipant, verifiedPhone?: string) => {
      setSelecting(true);
      setPhoneError(null);
      try {
        const nextSession = await apiClient.academyWorkshopsPublic.selectParticipant({
          displayCode: code,
          participantId: participant.id,
          phone: verifiedPhone?.trim() || undefined,
        });
        window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
        setSession(nextSession);
        setSelected(null);
        setPhone('');
      } catch (cause) {
        const nextError = errorMessage(cause, 'Không thể xác minh học viên.');
        if (participant.requiresPhone) setPhoneError(nextError);
        else setError(nextError);
      } finally {
        setSelecting(false);
      }
    },
    [code, sessionKey]
  );

  const choose = React.useCallback(
    (participant: AcademyWorkshopSharedJoinParticipant) => {
      if (!participant.requiresPhone) {
        void enterAs(participant);
        return;
      }
      setSelected(participant);
      setPhone('');
      setPhoneError(null);
    },
    [enterAs]
  );

  const exitPlayer = React.useCallback(() => {
    window.localStorage.removeItem(sessionKey);
    setSession(null);
    setSelected(null);
    setPhone('');
    setPhoneError(null);
    setGoogleError(null);
  }, [sessionKey]);

  const joinWithGoogle = React.useCallback(
    async (credential: string) => {
      setGoogleJoining(true);
      setGoogleError(null);
      try {
        const nextSession = await apiClient.academyWorkshopsPublic.joinWithGoogle({
          displayCode: code,
          credential,
        });
        window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
        setSession(nextSession);
      } catch (cause) {
        setGoogleError(errorMessage(cause, 'Không thể đăng nhập Google để vào workshop.'));
      } finally {
        setGoogleJoining(false);
      }
    },
    [code, sessionKey]
  );

  const filteredParticipants = React.useMemo(() => {
    const needle = removeVietnameseTones(search);
    return (info?.participants || []).filter(
      (participant) => !needle || removeVietnameseTones(participant.name).includes(needle)
    );
  }, [info?.participants, search]);

  if (session) return <AcademyWorkshopPlayer session={session} onExit={exitPlayer} />;
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071a2c] text-white">
        <Spin size="large" />
        <span className="ml-3">Đang mở danh sách học viên…</span>
      </main>
    );
  }
  if (error || !info) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071a2c] p-6">
        <Result
          status="warning"
          title="Không thể vào workshop"
          subTitle={error || 'Mã workshop không hợp lệ.'}
          extra={<Button onClick={() => void load()}>Thử lại</Button>}
        />
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top,#154a67_0%,#071a2c_48%,#04101c_100%)] p-3 text-white sm:p-6">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl backdrop-blur-xl sm:p-7">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Wings Academy · Workshop</div>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:mt-3 sm:text-4xl">{info.workshop.name}</h1>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/60 sm:mt-3">
            <MapPin size={16} /> {info.workshop.location}
          </div>
          <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/25 sm:mt-5 sm:h-16 sm:w-16">
            <UsersRound size={30} className="sm:h-[34px] sm:w-[34px]" />
          </div>
          <h2 className="mt-3 text-lg font-bold sm:mt-4 sm:text-xl">Bạn là ai?</h2>
          <p className="mt-1 text-sm text-white/60">
            Có tên trong danh sách thì chọn hồ sơ; chưa có thì đăng nhập Google.
          </p>
        </header>

        <section className="mt-3 rounded-3xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-xl sm:mt-4 sm:p-6">
          <Input
            size="large"
            allowClear
            value={search}
            prefix={<Search size={18} />}
            placeholder="Tìm tên học viên không dấu…"
            aria-label="Tìm tên học viên"
            onChange={(event) => setSearch(event.target.value)}
          />

          {filteredParticipants.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredParticipants.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  disabled={selecting}
                  onClick={() => choose(participant)}
                  className="flex min-h-20 touch-manipulation items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10 active:scale-[0.99] disabled:opacity-50"
                >
                  <Avatar size={52} src={participant.avatarUrl || undefined} className="shrink-0 bg-cyan-600 font-bold">
                    {workshopInitials(participant.name)}
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-base">{participant.name}</strong>
                    <span className="mt-1 flex items-center gap-1 text-xs text-white/50">
                      {participant.requiresPhone ? (
                        <>
                          <ShieldCheck size={13} /> Xác minh SĐT
                        </>
                      ) : (
                        'Vào thẳng'
                      )}
                    </span>
                  </span>
                  <ArrowRight size={19} className="shrink-0 text-cyan-300" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-white/5 py-6 sm:mt-6 sm:py-8">
              <Empty description={<span className="text-white/55">Không tìm thấy học viên phù hợp</span>} />
            </div>
          )}

          <div className="my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35 sm:my-6 sm:text-xs sm:tracking-[0.16em]">
            <span className="h-px flex-1 bg-white/10" />
            Chưa có tên trong danh sách?
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3 text-center sm:p-5">
            <div className="text-sm font-bold sm:text-base">Dùng Gmail để vào</div>
            <p className="mx-auto mt-1 text-xs leading-5 text-white/55 sm:text-sm">
              Dùng Gmail để tạo hồ sơ và vào workshop.
            </p>
            <div className="mx-auto mt-3 w-full max-w-[320px]">
              <GoogleWorkshopJoinButton disabled={googleJoining || selecting} onCredential={joinWithGoogle} />
            </div>
            {googleJoining ? <div className="mt-3 text-sm text-cyan-200">Đang tạo hồ sơ và check-in…</div> : null}
            {googleError ? <div className="mt-3 text-sm text-rose-300">{googleError}</div> : null}
          </div>
        </section>

        <footer className="py-5 text-center text-xs text-white/35">
          Academy Workshop OS · Xác minh danh tính và tự check-in
        </footer>
      </div>

      <Modal
        open={Boolean(selected)}
        title="Xác minh số điện thoại"
        okText="Vào phòng"
        cancelText="Chọn lại"
        confirmLoading={selecting}
        okButtonProps={{ disabled: !phone.trim() }}
        onOk={() => selected && void enterAs(selected, phone)}
        onCancel={() => {
          setSelected(null);
          setPhone('');
          setPhoneError(null);
        }}
        destroyOnHidden
      >
        {selected ? (
          <div className="py-2 text-center">
            <Avatar size={68} src={selected.avatarUrl || undefined} className="bg-cyan-600 text-xl font-bold">
              {workshopInitials(selected.name)}
            </Avatar>
            <div className="mt-3 text-lg font-bold">{selected.name}</div>
            <p className="mt-2 text-sm opacity-65">
              Nhập đầy đủ số điện thoại đã lưu trong hồ sơ để xác nhận đây là bạn.
            </p>
            <Input
              autoFocus
              size="large"
              value={phone}
              status={phoneError ? 'error' : undefined}
              prefix={<Phone size={18} />}
              inputMode="tel"
              autoComplete="tel"
              placeholder="Số điện thoại"
              aria-label="Số điện thoại xác minh"
              onChange={(event) => {
                setPhone(event.target.value);
                setPhoneError(null);
              }}
              onPressEnter={() => phone.trim() && selected && void enterAs(selected, phone)}
            />
            {phoneError ? <div className="mt-2 text-left text-sm text-red-500">{phoneError}</div> : null}
          </div>
        ) : null}
      </Modal>
    </main>
  );
}
