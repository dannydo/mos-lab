import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeAndValidateChatFile, sanitizeChatAttachments, saveChatVideoBuffer } from './chat-file.service.js';
import type { MosChatImageAttachment } from '@mos-lab/shared';

describe('mOS Chat File Upload & PDF Document Invariants (MOS-BUG-147)', () => {
  describe('decodeAndValidateChatFile', () => {
    it('successfully validates and decodes a valid PDF file (e.g. order kho tháng mới)', async () => {
      const validPdfHeader = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
      const base64Data = Buffer.from(validPdfHeader, 'utf-8').toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: `data:application/pdf;base64,${base64Data}`,
        mimeType: 'application/pdf' as any,
        fileName: 'order_kho_thang_10.pdf',
      });

      assert.equal(result.ext, 'pdf');
      assert.equal(result.finalMimeType, 'application/pdf');
      assert.ok(result.buffer.length > 0);
      assert.equal(result.buffer.subarray(0, 5).toString('ascii'), '%PDF-');
    });

    it('infers PDF MIME type from file extension if MIME is generic application/octet-stream', async () => {
      const validPdfHeader = '%PDF-1.7 order kho';
      const base64Data = Buffer.from(validPdfHeader, 'utf-8').toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: base64Data,
        mimeType: 'application/octet-stream' as any,
        fileName: 'bang-ke-kho-vật-tư.pdf',
      });

      assert.equal(result.ext, 'pdf');
      assert.equal(result.finalMimeType, 'application/pdf');
    });

    it('rejects corrupted PDF file that lacks %PDF- magic header', async () => {
      const corruptedHeader = 'NOT_A_REAL_PDF_CONTENT';
      const base64Data = Buffer.from(corruptedHeader, 'utf-8').toString('base64');

      await assert.rejects(
        async () => {
          await decodeAndValidateChatFile({
            dataBase64: base64Data,
            mimeType: 'application/pdf' as any,
            fileName: 'corrupted.pdf',
          });
        },
        {
          name: 'Error',
          message: 'Nội dung tệp không phải định dạng PDF hợp lệ.',
        }
      );
    });

    it('successfully validates Excel spreadsheet documents (.xlsx, .xls)', async () => {
      const dummyExcelContent = 'PK\x03\x04mock_excel_openxml_content';
      const base64Data = Buffer.from(dummyExcelContent, 'utf-8').toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: base64Data,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as any,
        fileName: 'ton_kho_wings_2026.xlsx',
      });

      assert.equal(result.ext, 'xlsx');
      assert.equal(result.finalMimeType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('successfully validates Word documents (.docx)', async () => {
      const dummyWordContent = 'PK\x03\x04mock_word_content';
      const base64Data = Buffer.from(dummyWordContent, 'utf-8').toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: base64Data,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as any,
        fileName: 'hop_dong_kho.docx',
      });

      assert.equal(result.ext, 'docx');
      assert.equal(result.finalMimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('rejects unsupported executable or dangerous extensions (.exe, .sh, .bin)', async () => {
      const base64Data = Buffer.from('MZ_EXECUTABLE_BINARY', 'utf-8').toString('base64');

      await assert.rejects(
        async () => {
          await decodeAndValidateChatFile({
            dataBase64: base64Data,
            mimeType: 'application/x-msdownload' as any,
            fileName: 'malicious.exe',
          });
        },
        {
          name: 'Error',
          message:
            'Định dạng tệp không được hỗ trợ (hệ thống hỗ trợ Video MP4/WebM/MOV, PDF, Excel, Word, PowerPoint, TXT, CSV, ZIP và hình ảnh).',
        }
      );
    });

    it('rejects files exceeding 25MB size limit', async () => {
      // 26MB of dummy bytes simulated
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024);
      const base64Data = largeBuffer.toString('base64');

      await assert.rejects(
        async () => {
          await decodeAndValidateChatFile({
            dataBase64: base64Data,
            mimeType: 'application/pdf' as any,
            fileName: 'giant_order_kho.pdf',
          });
        },
        (err: Error) => {
          return err.message.includes('Tệp quá lớn');
        }
      );
    });

    it('successfully validates and decodes an MP4 video (MOS-CHAT-VIDEO)', async () => {
      // MP4 ISO BMFF mock: 4 bytes length + 'ftyp' + 4 bytes brand
      const mp4Header = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from('ftypmp42', 'ascii'),
        Buffer.alloc(100),
      ]);
      const base64Data = mp4Header.toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: base64Data,
        mimeType: 'video/mp4' as any,
        fileName: 'screen_record_bug_subthread.mp4',
        isVideo: true,
      });

      assert.equal(result.ext, 'mp4');
      assert.equal(result.finalMimeType, 'video/mp4');
      assert.ok(result.buffer.length > 0);
    });

    it('successfully validates and decodes a WebM video (MOS-CHAT-VIDEO)', async () => {
      // WebM EBML ID header: 0x1A, 0x45, 0xDF, 0xA3
      const webmHeader = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);
      const base64Data = webmHeader.toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: base64Data,
        mimeType: 'video/webm' as any,
        fileName: 'demo_huong_dan_subthread.webm',
        isVideo: true,
      });

      assert.equal(result.ext, 'webm');
      assert.equal(result.finalMimeType, 'video/webm');
      assert.ok(result.buffer.length > 0);
    });

    it('successfully validates QuickTime MOV video (MOS-CHAT-VIDEO)', async () => {
      const movHeader = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x14]),
        Buffer.from('ftypqt  ', 'ascii'),
        Buffer.alloc(64),
      ]);
      const base64Data = movHeader.toString('base64');

      const result = await decodeAndValidateChatFile({
        dataBase64: base64Data,
        mimeType: 'video/quicktime' as any,
        fileName: 'iphone_screen_record.mov',
      });

      assert.equal(result.ext, 'mov');
      assert.equal(result.finalMimeType, 'video/quicktime');
    });

    it('rejects corrupted WebM video lacking EBML header', async () => {
      const corruptedData = Buffer.from('NOT_A_WEBM_VIDEO_BINARY').toString('base64');

      await assert.rejects(
        async () => {
          await decodeAndValidateChatFile({
            dataBase64: corruptedData,
            mimeType: 'video/webm' as any,
            fileName: 'broken.webm',
          });
        },
        {
          name: 'Error',
          message: 'Nội dung tệp không phải định dạng WebM hợp lệ.',
        }
      );
    });
  });

  describe('sanitizeChatAttachments', () => {
    it('preserves valid PDF attachments with metadata (name, sizeBytes, fileExt)', () => {
      const raw: MosChatImageAttachment[] = [
        {
          id: 'att-1',
          url: '/api/chat/media/12345678-1234-1234-1234-1234567890ab.pdf',
          name: 'order_kho_thang_10.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1048576,
          fileExt: 'pdf',
        },
      ];

      const sanitized = sanitizeChatAttachments(raw);
      assert.equal(sanitized.length, 1);
      assert.equal(sanitized[0].url, '/api/chat/media/12345678-1234-1234-1234-1234567890ab.pdf');
      assert.equal(sanitized[0].name, 'order_kho_thang_10.pdf');
      assert.equal(sanitized[0].sizeBytes, 1048576);
      assert.equal(sanitized[0].fileExt, 'pdf');
    });

    it('preserves video attachment metadata including durationSec, posterUrl, isVideo (MOS-CHAT-VIDEO)', () => {
      const raw: MosChatImageAttachment[] = [
        {
          id: 'att-video-1',
          url: '/api/chat/media/12345678-1234-1234-1234-1234567890ab.mp4',
          name: 'demo_subthread.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 15000000,
          durationSec: 45,
          posterUrl: '/api/chat/media/abcdef12-3456-7890-abcd-ef1234567890.jpg',
          isVideo: true,
          fileExt: 'mp4',
        },
      ];

      const sanitized = sanitizeChatAttachments(raw);
      assert.equal(sanitized.length, 1);
      assert.equal(sanitized[0].url, '/api/chat/media/12345678-1234-1234-1234-1234567890ab.mp4');
      assert.equal(sanitized[0].name, 'demo_subthread.mp4');
      assert.equal(sanitized[0].isVideo, true);
      assert.equal(sanitized[0].durationSec, 45);
      assert.equal(sanitized[0].posterUrl, '/api/chat/media/abcdef12-3456-7890-abcd-ef1234567890.jpg');
    });

    it('filters out data: URI attachments to protect database from bloat', () => {
      const raw: MosChatImageAttachment[] = [
        {
          id: 'att-inline',
          url: 'data:application/pdf;base64,JVBERi0xLjQK...',
          name: 'inline.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
        },
        {
          id: 'att-valid',
          url: '/api/chat/media/abcdef12-3456-7890-abcd-ef1234567890.pdf',
          name: 'valid.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 200,
        },
      ];

      const sanitized = sanitizeChatAttachments(raw);
      assert.equal(sanitized.length, 1);
      assert.equal(sanitized[0].name, 'valid.pdf');
    });

    it('limits attachments to a maximum of 12 items per message', () => {
      const raw: MosChatImageAttachment[] = Array.from({ length: 15 }, (_, i) => ({
        id: `item-${i}`,
        url: `/api/chat/media/item-${i}.pdf`,
        name: `file-${i}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      }));

      const sanitized = sanitizeChatAttachments(raw);
      assert.equal(sanitized.length, 12);
    });
  });

  describe('saveChatVideoBuffer', () => {
    it('successfully saves valid MP4 video buffer to disk and returns filename and mime', async () => {
      const dummyVideo = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from('ftypmp42', 'ascii'),
        Buffer.alloc(100),
      ]);
      const res = await saveChatVideoBuffer(dummyVideo, 'test_subthread_clip.mp4', 'video/mp4');
      assert.equal(res.ext, 'mp4');
      assert.equal(res.mimeType, 'video/mp4');
      assert.match(res.fileName, /^[a-f0-9-]{36}\.mp4$/);
    });

    it('rejects video buffer exceeding 50MB limit', async () => {
      const hugeBuffer = Buffer.alloc(51 * 1024 * 1024);
      await assert.rejects(
        async () => {
          await saveChatVideoBuffer(hugeBuffer, 'huge.mp4', 'video/mp4');
        },
        {
          name: 'Error',
          message: 'Video quá lớn (tối đa 50MB).',
        }
      );
    });
  });
});
