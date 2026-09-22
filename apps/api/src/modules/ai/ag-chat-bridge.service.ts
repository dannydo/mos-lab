import { randomUUID } from 'node:crypto';
import { execFile as execFileCallback, execSync } from 'node:child_process';
import { get as httpGet } from 'node:http';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { extractThinkingAndAction, type ParsedAiResponse } from './ai.service.js';

const execFile = promisify(execFileCallback);
const AGENTAPI_TIMEOUT_MS = 60_000;
const AG_RESPONSE_TIMEOUT_MS = 45_000;

export interface AgChatBridgeJob {
  id: string;
  conversationId?: string;
  prompt: string;
  title?: string;
  createdAt: number;
}

interface PendingBridgeJobEntry {
  job: AgChatBridgeJob;
  resolve: (res: { conversationId: string; response: ParsedAiResponse }) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class AgChatBridgeService {
  // Pending jobs queue for remote bridge (VPS -> Danny's Mac)
  private static pendingBridgeJobs = new Map<string, PendingBridgeJobEntry>();
  private static waitingLongPollers: Array<(job: AgChatBridgeJob | null) => void> = [];

  /**
   * Resolve path to agentapi binary
   */
  static resolveAgentApiCommand(env: NodeJS.ProcessEnv = process.env): string | null {
    const configured = env.MOS_AG_AGENTAPI_COMMAND?.trim();
    const candidates = [
      configured,
      resolve(homedir(), '.gemini/antigravity/bin/agentapi'),
      '/Applications/Antigravity.app/Contents/Resources/bin/language_server',
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // try next
      }
    }
    return null;
  }

  /**
   * Probe whether a local port is an Antigravity language server
   */
  static probeIsAntigravityPort(port: number): Promise<{ ok: boolean; csrfToken?: string } | null> {
    return new Promise((res) => {
      const req = httpGet({ host: '127.0.0.1', port, path: '/' }, (resp) => {
        let body = '';
        resp.on('data', (chunk) => {
          body += chunk;
          if (body.length > 4096) {
            req.destroy();
          }
        });
        const check = () => {
          if (body.includes('__APP_CONFIG__') || body.includes('productName":"antigravity"')) {
            const match = body.match(/"csrfToken"\s*:\s*"([^"]+)"/i);
            res({ ok: true, csrfToken: match ? match[1] : undefined });
          } else {
            res(null);
          }
        };
        resp.on('end', check);
        resp.on('close', check);
      });
      req.on('error', () => res(null));
      req.setTimeout(500, () => {
        req.destroy();
        res(null);
      });
    });
  }

  /**
   * Detect Antigravity project ID
   */
  static detectAntigravityProjectId(): string {
    if (process.env.ANTIGRAVITY_PROJECT_ID) return process.env.ANTIGRAVITY_PROJECT_ID;
    try {
      const glob = execSync(
        'ls -t ~/.gemini/antigravity/brain/*/.system_generated/terminals/*.env 2>/dev/null | head -n 1',
        { encoding: 'utf8', shell: '/bin/bash' }
      ).trim();
      if (glob && existsSync(glob)) {
        const content = readFileSync(glob, 'utf8');
        const m = content.match(/export ANTIGRAVITY_PROJECT_ID=([a-f0-9-]+)/);
        if (m && m[1]) return m[1];
      }
    } catch {
      // fallback
    }
    return 'd11eea1e-9cc3-4836-8438-73472d18e72f';
  }

  /**
   * Detect active Antigravity Language Server Environment (Address, CSRF Token, Project ID)
   */
  static async detectAntigravityLsEnv(): Promise<Record<string, string>> {
    const projectId = this.detectAntigravityProjectId();
    if (process.env.ANTIGRAVITY_LS_ADDRESS && process.env.ANTIGRAVITY_CSRF_TOKEN) {
      return {
        ANTIGRAVITY_LS_ADDRESS: process.env.ANTIGRAVITY_LS_ADDRESS,
        ANTIGRAVITY_CSRF_TOKEN: process.env.ANTIGRAVITY_CSRF_TOKEN,
        ANTIGRAVITY_PROJECT_ID: projectId,
      };
    }
    try {
      const ps = execSync('ps aux | grep "[l]anguage_server.*antigravity"', { encoding: 'utf8' });
      const matchPid = ps.match(/^\S+\s+(\d+)/);
      const matchCsrf = ps.match(/--csrf_token\s+([a-f0-9-]+)/i);
      if (!matchPid) return {};
      const pid = matchPid[1];
      let csrfToken = matchCsrf ? matchCsrf[1] : '';

      const lsofCmd = existsSync('/usr/sbin/lsof') ? '/usr/sbin/lsof' : 'lsof';
      const lsof = execSync(`${lsofCmd} -nP -p ${pid} | grep LISTEN`, {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${process.env.PATH || ''}:/usr/sbin:/sbin:/usr/bin:/bin` },
      });
      const ports: number[] = [];
      for (const line of lsof.split('\n')) {
        const m = line.match(/TCP\s+(?:127\.0\.0\.1|localhost|\*):(\d+)\s+\(LISTEN\)/);
        if (m) ports.push(parseInt(m[1], 10));
      }

      let activePort: number | null = null;
      for (const port of ports) {
        const detected = await this.probeIsAntigravityPort(port);
        if (detected) {
          activePort = port;
          if (detected.csrfToken && !csrfToken) {
            csrfToken = detected.csrfToken;
          }
          break;
        }
      }
      if (!activePort && ports.length > 0) {
        ports.sort((a, b) => a - b);
        activePort = ports[0];
      }
      if (activePort && csrfToken) {
        return {
          ANTIGRAVITY_LS_ADDRESS: `localhost:${activePort}`,
          ANTIGRAVITY_CSRF_TOKEN: csrfToken,
          ANTIGRAVITY_PROJECT_ID: projectId,
        };
      }
    } catch {
      // Best-effort
    }
    return {};
  }

  /**
   * Check whether Antigravity is accessible locally on this machine
   */
  static async isLocalAgAvailable(): Promise<boolean> {
    const cmd = this.resolveAgentApiCommand();
    if (!cmd) return false;
    const env = await this.detectAntigravityLsEnv();
    return Boolean(env.ANTIGRAVITY_LS_ADDRESS && env.ANTIGRAVITY_CSRF_TOKEN);
  }

  /**
   * Execute prompt directly on local Antigravity instance via agentapi
   */
  static async executeLocalAgPrompt(
    conversationId: string | undefined,
    prompt: string,
    title?: string
  ): Promise<{ conversationId: string; response: ParsedAiResponse }> {
    const command = this.resolveAgentApiCommand();
    if (!command) {
      throw new Error('agentapi command not available');
    }
    const detectedEnv = await this.detectAntigravityLsEnv();
    if (!detectedEnv.ANTIGRAVITY_LS_ADDRESS || !detectedEnv.ANTIGRAVITY_CSRF_TOKEN) {
      throw new Error('Antigravity Language Server is not running');
    }

    const env = {
      ...process.env,
      ...detectedEnv,
    };

    let targetConvId = conversationId;
    let initialLineCount = 0;

    const brainRoot = resolve(homedir(), '.gemini/antigravity/brain');

    // Check if existing conversation is valid
    if (targetConvId) {
      const convTranscriptPath = resolve(brainRoot, targetConvId, '.system_generated/logs/transcript.jsonl');
      if (existsSync(convTranscriptPath)) {
        try {
          const lines = readFileSync(convTranscriptPath, 'utf8').trim().split('\n').filter(Boolean);
          initialLineCount = lines.length;
        } catch {
          initialLineCount = 0;
        }
      } else {
        // Conversation folder doesn't exist anymore, spawn a new one
        targetConvId = undefined;
      }
    }

    if (targetConvId) {
      // Send message to existing conversation
      const titleArg = title ? [`--title=${title}`] : [];
      const args = command.endsWith('language_server')
        ? ['agentapi', 'send-message', ...titleArg, targetConvId, prompt]
        : ['send-message', ...titleArg, targetConvId, prompt];

      await execFile(command, args, { timeout: AGENTAPI_TIMEOUT_MS, env });
    } else {
      // Spawn new conversation
      const titleArg = title ? [`--title=${title}`] : ['--title=[mOS Copilot]'];
      const args = command.endsWith('language_server')
        ? ['agentapi', 'new-conversation', '--model=flash', ...titleArg, prompt]
        : ['new-conversation', '--model=flash', ...titleArg, prompt];

      const { stdout } = await execFile(command, args, { timeout: AGENTAPI_TIMEOUT_MS, env });
      try {
        const parsed = JSON.parse(stdout) as {
          response?: { newConversation?: { conversationId?: string } };
        };
        const id = parsed?.response?.newConversation?.conversationId;
        if (!id) {
          throw new Error(`agentapi did not return conversationId. Output: ${stdout.slice(0, 200)}`);
        }
        targetConvId = id;
        initialLineCount = 0;
      } catch (err) {
        throw new Error(
          `Failed to parse agentapi new-conversation: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err }
        );
      }
    }

    // Wait for Antigravity to write response to transcript.jsonl
    const response = await this.waitForAgResponse(targetConvId, initialLineCount, AG_RESPONSE_TIMEOUT_MS);
    return { conversationId: targetConvId, response };
  }

  /**
   * Poll transcript.jsonl until Antigravity writes the complete PLANNER_RESPONSE
   */
  static async waitForAgResponse(
    conversationId: string,
    initialLineCount: number,
    timeoutMs = AG_RESPONSE_TIMEOUT_MS
  ): Promise<ParsedAiResponse> {
    const transcriptPath = resolve(
      homedir(),
      '.gemini/antigravity/brain',
      conversationId,
      '.system_generated/logs/transcript.jsonl'
    );

    const startTime = Date.now();
    let accumulatedThinking = '';

    while (Date.now() - startTime < timeoutMs) {
      if (existsSync(transcriptPath)) {
        try {
          const content = readFileSync(transcriptPath, 'utf8');
          const lines = content.trim().split('\n').filter(Boolean);

          if (lines.length > initialLineCount) {
            const newLines = lines.slice(initialLineCount);

            // Parse all new steps
            for (let i = 0; i < newLines.length; i++) {
              try {
                const step = JSON.parse(newLines[i]);
                if (step.source === 'MODEL' && step.type === 'PLANNER_RESPONSE') {
                  if (step.thinking && typeof step.thinking === 'string') {
                    accumulatedThinking = step.thinking.trim();
                  }

                  // Check if this step is a terminal response with content
                  if (
                    step.status === 'DONE' &&
                    step.content &&
                    typeof step.content === 'string' &&
                    step.content.trim().length > 0 &&
                    (!step.tool_calls || step.tool_calls.length === 0)
                  ) {
                    const parsed = extractThinkingAndAction(step.content);
                    return {
                      content: parsed.content,
                      thinking: parsed.thinking || accumulatedThinking || null,
                      suggestedAction: parsed.suggestedAction,
                    };
                  }
                }
              } catch {
                // Ignore incomplete line parse during active writing
              }
            }
          }
        } catch {
          // File read retry
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    throw new Error(`Timed out waiting for Antigravity response in conversation ${conversationId}`);
  }

  /**
   * Enqueue a chat job when running on remote VPS and wait for Danny's Mac to process it
   */
  static enqueueRemoteChatJob(
    conversationId: string | undefined,
    prompt: string,
    title?: string,
    timeoutMs = 40_000
  ): Promise<{ conversationId: string; response: ParsedAiResponse }> {
    return new Promise((resolve, reject) => {
      const jobId = randomUUID();
      const job: AgChatBridgeJob = {
        id: jobId,
        conversationId,
        prompt,
        title,
        createdAt: Date.now(),
      };

      const timer = setTimeout(() => {
        this.pendingBridgeJobs.delete(jobId);
        reject(new Error(`Remote Antigravity bridge timeout for job ${jobId}`));
      }, timeoutMs);

      this.pendingBridgeJobs.set(jobId, {
        job,
        resolve,
        reject,
        timer,
      });

      // Notify any waiting long-poller immediately
      const poller = this.waitingLongPollers.shift();
      if (poller) {
        poller(job);
      }
    });
  }

  /**
   * Long-polling endpoint handler: Danny's Mac asks for next pending chat job
   */
  static async getNextRemoteChatJob(timeoutMs = 25_000): Promise<AgChatBridgeJob | null> {
    // 1. Check if there is already a pending job
    for (const entry of this.pendingBridgeJobs.values()) {
      return entry.job;
    }

    // 2. Wait up to timeoutMs for a new job to arrive
    return new Promise<AgChatBridgeJob | null>((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.waitingLongPollers.indexOf(resolver);
        if (idx !== -1) {
          this.waitingLongPollers.splice(idx, 1);
        }
        resolve(null);
      }, timeoutMs);

      const resolver = (job: AgChatBridgeJob | null) => {
        clearTimeout(timer);
        resolve(job);
      };

      this.waitingLongPollers.push(resolver);
    });
  }

  /**
   * Complete remote chat job: Danny's Mac posts the AG response back
   */
  static completeRemoteChatJob(jobId: string, result: { conversationId: string; response: ParsedAiResponse }): boolean {
    const entry = this.pendingBridgeJobs.get(jobId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pendingBridgeJobs.delete(jobId);
    entry.resolve(result);
    return true;
  }
}
