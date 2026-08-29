import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-md text-center">
        <h1 className="m-0 text-2xl font-bold">Wings Lashes CRM</h1>
        <p className="mb-5 mt-2 opacity-70">Trang chủ đã sẵn sàng. Mở CRM để bắt đầu làm việc.</p>
        <Link href="/dashboard" className="font-semibold underline underline-offset-4">
          Mở CRM
        </Link>
      </section>
    </main>
  );
}
