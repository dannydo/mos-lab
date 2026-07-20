import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

interface RunResult {
  status: 'success' | 'error';
  message: string;
  stdout?: string;
  stderr?: string;
}

export function runPythonScript(scriptName: string, args: string[] = []): Promise<RunResult> {
  return new Promise((resolve) => {
    const rootDir = process.cwd();
    const scriptPath = path.join(rootDir, 'scripts', scriptName);

    // Obfuscating the path construction to prevent Next.js compile-time static analysis
    const parts = ['..', '.venv-ads-portal', 'bin', 'python'];
    const venvPython = path.join(rootDir, ...parts);

    const pythonExecutable = fs.existsSync(venvPython) ? venvPython : 'python3';

    if (!fs.existsSync(scriptPath)) {
      return resolve({
        status: 'error',
        message: `Script not found: ${scriptPath}`,
      });
    }

    const command = `"${pythonExecutable}" "${scriptPath}" ${args.map((a) => `"${a}"`).join(' ')}`;

    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
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
