import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { runtimeConfigPath } from './ide-task-provisioner.js';

const label = 'com.masteros.ide-task-provisioner';

function cleanPath(value: string) {
  const resolved = resolve(value);
  if (!resolved.startsWith('/')) throw new Error('IDE provisioner install requires an absolute repository path.');
  return resolved;
}

function isGitRepository(path: string) {
  try {
    return (
      execFileSync('git', ['-C', path, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' }).trim() === 'true'
    );
  } catch {
    return false;
  }
}

function configText(repository: string) {
  const root = resolve(homedir(), '.codex/worktrees/ide-provisioned');
  return [
    `MOS_IDE_PROVISIONER_REPOSITORY=${repository}`,
    `MOS_IDE_PROVISIONER_WORKTREE_ROOT=${root}`,
    'MOS_IDE_PROVISIONER_API_URL=https://api.lab.masteros.app/api',
    'MOS_IDE_PROVISIONER_ID=danny-codex-desktop',
    '',
  ].join('\n');
}

export function renderLaunchAgentPlist(repository: string, pnpm: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${pnpm}</string><string>ide-task-provisioner:service</string></array>
<key>WorkingDirectory</key><string>${repository}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>/Applications/ChatGPT.app/Contents/Resources:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key><string>${resolve(homedir(), 'Library/Logs/masteros-ide-task-provisioner.log')}</string>
<key>StandardErrorPath</key><string>${resolve(homedir(), 'Library/Logs/masteros-ide-task-provisioner.error.log')}</string>
</dict></plist>\n`;
}

export function installManagedRuntime(repositoryInput = process.cwd()) {
  const repository = cleanPath(repositoryInput);
  if (!isGitRepository(repository)) throw new Error('IDE provisioner install must run from a Git worktree.');
  const configPath = runtimeConfigPath();
  mkdirSync(resolve(homedir(), '.codex/secrets'), { recursive: true, mode: 0o700 });
  if (!existsSync(configPath)) writeFileSync(configPath, configText(repository), { mode: 0o600 });
  chmodSync(configPath, 0o600);

  const pnpm = process.env.PNPM_PATH || '/opt/homebrew/bin/pnpm';
  const launchAgents = resolve(homedir(), 'Library/LaunchAgents');
  const plistPath = resolve(launchAgents, `${label}.plist`);
  mkdirSync(launchAgents, { recursive: true, mode: 0o700 });
  writeFileSync(plistPath, renderLaunchAgentPlist(repository, pnpm), { mode: 0o600 });
  chmodSync(plistPath, 0o600);
  const domain = `gui/${process.getuid()}`;
  try {
    execFileSync('launchctl', ['bootout', `${domain}/${label}`], { stdio: 'ignore' });
  } catch {
    // First install has no existing agent to unload.
  }
  execFileSync('launchctl', ['bootstrap', domain, plistPath], { stdio: 'ignore' });
  return { configPath, plistPath, repository };
}

function main() {
  const installed = installManagedRuntime();
  process.stdout.write(`IDE task provisioner managed runtime installed at ${installed.plistPath}.\n`);
}

if (process.argv[1]?.endsWith('install-ide-task-provisioner.ts')) main();
