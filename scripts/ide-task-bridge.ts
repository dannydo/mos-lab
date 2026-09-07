import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const secretFile = resolve(homedir(), '.codex/secrets/mos-ide-task-bridge.env');
const token =
  readFileSync(secretFile, 'utf8')
    .match(/^MOS_IDE_TASK_BRIDGE_TOKEN=(.+)$/m)?.[1]
    ?.trim() || '';
if (token.length < 32) throw new Error('IDE task bridge token is unavailable.');
const [command, ...args] = process.argv.slice(2);
const taskId = args[args.indexOf('--task-id') + 1];
const outputPath = args[args.indexOf('--out') + 1];
if (command !== 'receive' || !taskId || !outputPath)
  throw new Error('Usage: ide-task-bridge receive --task-id <id> --out <path>');
const apiUrl = String(process.env.MOS_API_URL || 'https://api.masteros.app/api').replace(/\/$/, '');
const response = await fetch(`${apiUrl}/ide-task-bridge/tasks/${encodeURIComponent(taskId)}/handoff`, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
});
if (!response.ok) throw new Error(`IDE task handoff unavailable (${response.status}).`);
const payload = await response.json();
mkdirSync(dirname(resolve(outputPath)), { recursive: true, mode: 0o700 });
writeFileSync(resolve(outputPath), `${JSON.stringify(payload.data)}\n`, { mode: 0o600 });
chmodSync(resolve(outputPath), 0o600);
process.stdout.write('IDE handoff delivered to the requested private file.\n');
