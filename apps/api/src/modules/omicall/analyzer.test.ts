import assert from 'node:assert/strict';
import test from 'node:test';
import { FastifyInstance } from 'fastify';
import { claimPendingAnalysis, detectAudioMimeType } from './analyzer.js';

interface ClaimArgs {
  where: {
    id: number;
    analysisStatus: string;
    analysisRetryCount: { lt: number };
  };
  data: { analysisStatus: string };
}

test('claimPendingAnalysis lets only one concurrent worker claim a pending log', async () => {
  let analysisStatus = 'PENDING';
  const updateMany = async ({ where, data }: ClaimArgs) => {
    if (where.id !== 42 || analysisStatus !== where.analysisStatus) {
      return { count: 0 };
    }

    analysisStatus = data.analysisStatus;
    return { count: 1 };
  };

  const fastify = {
    prisma: {
      crm: {
        crmOmicallLog: { updateMany },
      },
    },
  } as unknown as FastifyInstance;

  const claims = await Promise.all([
    claimPendingAnalysis(fastify, 42),
    claimPendingAnalysis(fastify, 42),
    claimPendingAnalysis(fastify, 42),
  ]);

  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(analysisStatus, 'PROCESSING');
});

test('detectAudioMimeType inspects magic bytes before content-type or extension', () => {
  const id3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);
  const riffHeader = Buffer.from('RIFF\x24\x00\x00\x00WAVE', 'ascii');
  const oggHeader = Buffer.from('OggS\x00\x02\x00\x00', 'ascii');

  // Extensionless OmiCall recording_file_url with application/octet-stream
  assert.equal(
    detectAudioMimeType(
      'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=abc&code=123',
      'application/octet-stream',
      id3Header
    ),
    'audio/mp3'
  );
  // Misnamed .wav URL that is actually MP3 (e.g. test_double.wav)
  assert.equal(detectAudioMimeType('http://75.119.148.205:8500/test_double.wav', 'audio/mpeg', id3Header), 'audio/mp3');
  assert.equal(detectAudioMimeType('https://example.com/clip', 'application/octet-stream', riffHeader), 'audio/wav');
  assert.equal(detectAudioMimeType('https://example.com/clip', 'application/octet-stream', oggHeader), 'audio/ogg');

  // Fallbacks when buffer is absent
  assert.equal(detectAudioMimeType('https://example.com/clip', 'audio/wav'), 'audio/wav');
  assert.equal(detectAudioMimeType('https://example.com/clip.wav'), 'audio/wav');
  assert.equal(detectAudioMimeType('https://example.com/clip'), 'audio/mp3');
});
