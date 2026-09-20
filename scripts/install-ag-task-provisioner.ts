import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { runtimeConfigPath } from './ag-task-provisioner.js';

export const AG_PROVISIONER_LABEL = 'com.antigravity.inbox-provisioner';

function cleanPath(value: string): string {
  const resolved = resolve(value);
  if (!resolved.startsWith('/')) throw new Error('Provisioner install requires an absolute repository path.');
  return resolved;
}

function isGitRepository(path: string): boolean {
  try {
    return (
      execFileSync('git', ['-C', path, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' }).trim() === 'true'
    );
  } catch {
    return false;
  }
}

export function defaultConfigText(repository: string): string {
  const root = resolve(homedir(), '.antigravity/worktrees/ag-provisioned');
  return [
    `MOS_AG_PROVISIONER_REPOSITORY=${repository}`,
    `MOS_AG_PROVISIONER_WORKTREE_ROOT=${root}`,
    'MOS_AG_PROVISIONER_API_URL=https://api.lab.masteros.app/api',
    'MOS_AG_PROVISIONER_ID=danny-antigravity-desktop',
    '',
  ].join('\n');
}

export function renderLaunchAgentPlist(repository: string, pnpm: string): string {
  const logDir = resolve(homedir(), '.gemini/antigravity/logs');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${AG_PROVISIONER_LABEL}</string>
<key>ProgramArguments</key><array><string>${pnpm}</string><string>ag-task-provisioner:daemon</string></array>
<key>WorkingDirectory</key><string>${repository}</string>
<key>EnvironmentVariables</key><dict>
<key>PATH</key><string>/Users/dannydo/.gemini/antigravity/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key><string>${resolve(logDir, 'inbox-provisioner.log')}</string>
<key>StandardErrorPath</key><string>${resolve(logDir, 'inbox-provisioner.error.log')}</string>
</dict></plist>\n`;
}

export function installAgManagedRuntime(repositoryInput = process.cwd()): { plistPath: string; configPath: string } {
  const repository = cleanPath(repositoryInput);
  if (!isGitRepository(repository)) throw new Error('Provisioner install must run from a Git worktree.');
  const configPath = runtimeConfigPath();
  const secretsDir = resolve(homedir(), '.gemini/antigravity/secrets');
  const logsDir = resolve(homedir(), '.gemini/antigravity/logs');
  const worktreeDir = resolve(homedir(), '.antigravity/worktrees/ag-provisioned');

  mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
  mkdirSync(logsDir, { recursive: true, mode: 0o700 });
  mkdirSync(worktreeDir, { recursive: true, mode: 0o700 });

  if (!existsSync(configPath)) {
    writeFileSync(configPath, defaultConfigText(repository), { mode: 0o600 });
  }
  chmodSync(configPath, 0o600);

  const pnpm = process.env.PNPM_PATH || '/opt/homebrew/bin/pnpm';
  const launchAgents = resolve(homedir(), 'Library/LaunchAgents');
  const plistPath = resolve(launchAgents, `${AG_PROVISIONER_LABEL}.plist`);
  mkdirSync(launchAgents, { recursive: true, mode: 0o700 });
  writeFileSync(plistPath, renderLaunchAgentPlist(repository, pnpm), { mode: 0o600 });
  chmodSync(plistPath, 0o600);

  const domain = `gui/${process.getuid()}`;
  try {
    execFileSync('launchctl', ['bootout', `${domain}/${AG_PROVISIONER_LABEL}`], { stdio: 'ignore' });
  } catch {
    // Ignore if not previously loaded
  }
  execFileSync('launchctl', ['bootstrap', domain, plistPath]);

  return { plistPath, configPath };
}

function main() {
  const result = installAgManagedRuntime();
  process.stdout.write(
    `Antigravity inbox provisioner installed as ${AG_PROVISIONER_LABEL}.\nPlist: ${result.plistPath}\nConfig: ${result.configPath}\n`
  );
}

if (process.argv[1] && basename(process.argv[1]) === 'install-ag-task-provisioner.ts') {
  main();
}
