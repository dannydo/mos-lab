import { execFile } from 'child_process';
import path from 'path';

interface RunResult {
  status: 'success' | 'error';
  message: string;
  stdout?: string;
  stderr?: string;
}

const scriptPaths = {
  'auto_sync_pancake.py': path.join(process.cwd(), 'scripts', 'auto_sync_pancake.py'),
  'generate_weekly_dashboard.py': path.join(process.cwd(), 'scripts', 'generate_weekly_dashboard.py'),
} as const;

export function runPythonScript(scriptName: string, args: string[] = []): Promise<RunResult> {
  return new Promise((resolve) => {
    const rootDir = process.cwd();
    const scriptPath = scriptPaths[scriptName as keyof typeof scriptPaths];
    if (!scriptPath) {
      return resolve({
        status: 'error',
        message: 'Invalid script name',
      });
    }

    const configuredPython = process.env.ADS_PORTAL_PYTHON?.trim();
    const pythonExecutable = configuredPython || 'python3';

    execFile(pythonExecutable, [scriptPath, ...args], { cwd: rootDir }, (error, stdout, stderr) => {
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
    });
  });
}
