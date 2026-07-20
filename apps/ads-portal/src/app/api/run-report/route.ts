import { NextResponse } from 'next/server';
import { runPythonScript } from '../../../lib/executor';

export async function POST() {
  console.log('API Request: run-report');
  const result = await runPythonScript('generate_weekly_dashboard.py');

  if (result.status === 'error') {
    return NextResponse.json(
      {
        status: 'error',
        message: result.message || 'Lỗi khi chạy báo cáo',
        details: result.stderr,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'success',
    message: 'Báo cáo đã được cập nhật thành công!',
    stdout: result.stdout,
  });
}
