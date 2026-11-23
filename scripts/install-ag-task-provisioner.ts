import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { runtimeConfigPath } from './ag-task-provisioner.js';

export const AG_PROVISIONER_LABEL = 'com.antigravity.inbox-provisioner';
export const AG_SYSTEMD_SERVICE = 'mos-ag-task-provisioner.service';

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

export function defaultConfigText(repository: string, platform: NodeJS.Platform = process.platform): string {
  const root = resolve(homedir(), '.antigravity/worktrees/ag-provisioned');
  const provisionerId = platform === 'linux' ? 'danny-win-ag' : 'danny-antigravity-desktop';
  return [
    `MOS_AG_PROVISIONER_REPOSITORY=${repository}`,
    `MOS_AG_PROVISIONER_WORKTREE_ROOT=${root}`,
    'MOS_AG_PROVISIONER_API_URL=https://api.lab.masteros.app/api',
    `MOS_AG_PROVISIONER_ID=${provisionerId}`,
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

export function renderSystemdUnit(repository: string, pnpm: string): string {
  const logDir = resolve(homedir(), '.gemini/antigravity/logs');
  const pathEnv = [
    process.env.PATH || '',
    '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    resolve(homedir(), '.local/bin'),
  ]
    .filter(Boolean)
    .join(':');
  return `[Unit]
Description=mOS Antigravity Inbox Provisioner & AutoPlan Daemon (Win AG)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${repository}
ExecStart=${pnpm} ag-task-provisioner:daemon
Restart=always
RestartSec=5
Environment="PATH=${pathEnv}"
StandardOutput=append:${resolve(logDir, 'inbox-provisioner.log')}
StandardError=append:${resolve(logDir, 'inbox-provisioner.error.log')}

[Install]
WantedBy=default.target
`;
}

function resolvePnpmBinary(): string {
  if (process.env.PNPM_PATH && existsSync(process.env.PNPM_PATH)) return process.env.PNPM_PATH;
  try {
    const resolved = execFileSync('which', ['pnpm'], { encoding: 'utf8' }).trim();
    if (resolved) return resolved;
  } catch {
    // fallback
  }
  return process.platform === 'darwin' ? '/opt/homebrew/bin/pnpm' : '/usr/bin/pnpm';
}

export function installAgManagedRuntime(repositoryInput = process.cwd()): {
  plistPath: string;
  configPath: string;
  serviceType: 'launchd' | 'systemd';
} {
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

  const pnpm = resolvePnpmBinary();
  if (process.platform === 'linux') {
    const systemdDir = resolve(homedir(), '.config/systemd/user');
    const unitPath = resolve(systemdDir, AG_SYSTEMD_SERVICE);
    mkdirSync(systemdDir, { recursive: true, mode: 0o755 });
    writeFileSync(unitPath, renderSystemdUnit(repository, pnpm), { mode: 0o644 });
    chmodSync(unitPath, 0o644);

    execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'inherit' });
    execFileSync('systemctl', ['--user', 'enable', '--now', AG_SYSTEMD_SERVICE], { stdio: 'inherit' });
    execFileSync('systemctl', ['--user', 'restart', AG_SYSTEMD_SERVICE], { stdio: 'inherit' });
    try {
      execFileSync('loginctl', ['enable-linger', process.env.USER || 'danny'], { stdio: 'ignore' });
    } catch {
      // Best-effort linger in WSL2
    }
    return { plistPath: unitPath, configPath, serviceType: 'systemd' };
  }

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

  return { plistPath, configPath, serviceType: 'launchd' };
}

function main() {
  const result = installAgManagedRuntime();
  process.stdout.write(
    `Antigravity inbox provisioner installed (${result.serviceType}).\nUnit/Plist: ${result.plistPath}\nConfig: ${result.configPath}\n`
  );
}

if (process.argv[1] && basename(process.argv[1]) === 'install-ag-task-provisioner.ts') {
  main();
}
