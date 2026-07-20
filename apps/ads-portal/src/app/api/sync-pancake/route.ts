import { NextResponse } from 'next/server';
import { runPythonScript } from '../../../lib/executor';

export async function POST() {
  console.log('API Request: sync-pancake');
  const result = await runPythonScript('auto_sync_pancake.py');

  if (result.status === 'error') {
    return NextResponse.json(
      {
        status: 'error',
        message: result.message || 'Lỗi khi chạy đồng bộ',
        details: result.stderr,
      },
      { status: 500 }
    );
  }

  try {
    const syncResult = JSON.parse(result.stdout || '{}');
    return NextResponse.json(syncResult);
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Script output is not valid JSON',
        stdout: result.stdout,
        stderr: result.stderr,
      },
      { status: 500 }
    );
  }
}
