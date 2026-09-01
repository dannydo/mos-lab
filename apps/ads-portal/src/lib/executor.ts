import { execFile, type ExecFileException } from 'child_process';

interface RunResult {
  status: 'success' | 'error';
  message: string;
  stdout?: string;
  stderr?: string;
}

export function runPythonScript(scriptName: string, args: string[] = []): Promise<RunResult> {
  return new Promise((resolve) => {
    const rootDir = process.cwd();
    const handleResult = (error: ExecFileException | null, stdout: string, stderr: string) => {
      if (error) {
        return resolve({
          status: 'error',
          message: `Execution failed: ${error.message}`,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      }

      resolve({
        status: 'success',
        message: 'Executed successfully',
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    };

    if (scriptName === 'auto_sync_pancake.py') {
      execFile('python3', ['scripts/auto_sync_pancake.py', ...args], { cwd: rootDir }, handleResult);
      return;
    }

    if (scriptName === 'generate_weekly_dashboard.py') {
      execFile('python3', ['scripts/generate_weekly_dashboard.py', ...args], { cwd: rootDir }, handleResult);
      return;
    }

    resolve({
      status: 'error',
      message: 'Invalid script name',
    });
  });
}
