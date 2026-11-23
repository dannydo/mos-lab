import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const audioMemoryCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const audioInFlightPromises = new Map<string, Promise<Buffer>>();
const AUDIO_MEMORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AUDIO_MEMORY_CACHE_MAX_ENTRIES = 120;

function cacheAudioBuffer(hash: string, buffer: Buffer): void {
  if (audioMemoryCache.size >= AUDIO_MEMORY_CACHE_MAX_ENTRIES) {
    const oldestKey = audioMemoryCache.keys().next().value;
    if (oldestKey !== undefined) audioMemoryCache.delete(oldestKey);
  }
  audioMemoryCache.set(hash, {
    buffer,
    expiresAt: Date.now() + AUDIO_MEMORY_CACHE_TTL_MS,
  });
}

export async function synthesizeCelebrationAudio(
  text: string,
  voice = 'vi-VN-HoaiMyNeural',
  rate = '+0%',
  pitch = '+0Hz'
): Promise<Buffer> {
  const cleanText = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (!cleanText) throw new Error('Text is empty');

  const hash = createHash('md5').update(`${cleanText}_${voice}_${rate}_${pitch}`).digest('hex');
  const memCached = audioMemoryCache.get(hash);
  if (memCached && memCached.expiresAt > Date.now()) {
    return memCached.buffer;
  }

  const cacheDir = '/tmp/telesale_audio_cache';
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const cacheFile = `${cacheDir}/${hash}.mp3`;
  if (existsSync(cacheFile)) {
    const buf = readFileSync(cacheFile);
    if (buf.length > 500) {
      cacheAudioBuffer(hash, buf);
      return buf;
    }
  }

  const existingPromise = audioInFlightPromises.get(hash);
  if (existingPromise) {
    return existingPromise;
  }

  const synthPromise = (async (): Promise<Buffer> => {
    const pythonCandidates = [
      '/Users/dannydo/.gemini/antigravity/venv-f5tts/bin/python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'python3',
    ];

    let pythonBin = 'python3';
    for (const c of pythonCandidates) {
      if (existsSync(c)) {
        pythonBin = c;
        break;
      }
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempTextFile = `${cacheDir}/tmp_in_${uniqueId}.txt`;
    const tempFile = `${cacheDir}/tmp_${uniqueId}.mp3`;
    const execFileAsync = promisify(execFile);

    try {
      writeFileSync(tempTextFile, cleanText, 'utf8');

      const pyScript = `import sys, asyncio, edge_tts

text_file = sys.argv[1]
with open(text_file, 'r', encoding='utf-8') as f:
    text = f.read().strip()
voice = sys.argv[2]
raw_rate = sys.argv[3] if len(sys.argv) > 3 else None
rate = raw_rate if raw_rate not in ('', '+0%', 'None', None) else None
out_path = sys.argv[4]

async def synthesize():
    last_err = None
    for attempt in range(2):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate) if rate else edge_tts.Communicate(text, voice)
            await asyncio.wait_for(comm.save(out_path), timeout=10.0)
            return
        except Exception as e:
            last_err = e
            await asyncio.sleep(0.25)
    if last_err:
        raise last_err

asyncio.run(synthesize())`;

      try {
        await execFileAsync(pythonBin, ['-c', pyScript, tempTextFile, voice, rate, tempFile], { timeout: 14_000 });
      } catch {
        const fallbackPy = `import sys, asyncio, edge_tts
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    text = f.read().strip()
asyncio.run(asyncio.wait_for(edge_tts.Communicate(text, sys.argv[2]).save(sys.argv[3]), timeout=10.0))`;
        await execFileAsync(pythonBin, ['-c', fallbackPy, tempTextFile, voice, tempFile], { timeout: 12_000 });
      }

      if (existsSync(tempFile)) {
        const audioBuf = readFileSync(tempFile);
        if (audioBuf.length > 500) {
          cacheAudioBuffer(hash, audioBuf);
          try {
            writeFileSync(cacheFile, audioBuf);
            unlinkSync(tempFile);
          } catch {
            // cache write failure is non-fatal
          }
          return audioBuf;
        }
      }
    } catch (err: unknown) {
      if (existsSync(tempFile)) {
        try {
          unlinkSync(tempFile);
        } catch {
          // ignore cleanup failure
        }
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Edge TTS synthesis failed: ${errMsg}`, { cause: err });
    } finally {
      if (existsSync(tempTextFile)) {
        try {
          unlinkSync(tempTextFile);
        } catch {
          // ignore cleanup failure
        }
      }
    }

    throw new Error('No audio produced by Edge TTS');
  })().finally(() => {
    audioInFlightPromises.delete(hash);
  });

  audioInFlightPromises.set(hash, synthPromise);
  return synthPromise;
}
