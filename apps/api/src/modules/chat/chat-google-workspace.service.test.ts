import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  ChatGoogleWorkspaceService,
  parseCanvaEmbedHtmlToStructured,
  parseGoogleDocHtmlToStructured,
  setGoogleWorkspaceTestOverrides,
} from './chat-google-workspace.service.js';

function createEphemeralTestCredentials() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 1024,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return {
    client_email: 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com',
    private_key: privateKey,
    token_uri: 'https://oauth2.googleapis.com/token',
  };
}

describe('ChatGoogleWorkspaceService', () => {
  afterEach(() => {
    setGoogleWorkspaceTestOverrides(undefined);
  });

  it('reads PUBLIC_LINK spreadsheet without Service Account and highlights range=D17', async () => {
    const htmlView = `
      <html><head><title>Kho Đề Thám - Google Sheets</title></head><body>
      <script>
        items.push({name: "NVL", pageUrl: "...", gid: "1001"});
        items.push({name: "Mi", pageUrl: "...", gid: "516151439"});
      </script></body></html>
    `;
    const csvRows = Array.from({ length: 20 }, (_, i) => {
      const r = i + 1;
      if (r === 1) return 'Mã VT,Tên sản phẩm,ĐVT,Tồn kho,Trạng thái';
      if (r === 17) return 'MI-017,Mi Classic 0.07 J-Curl,Hộp,3,Sắp hết hàng';
      return `MI-${String(r).padStart(3, '0')},Mi Volume ${r},Hộp,${r * 2},Đủ`;
    }).join('\n');

    setGoogleWorkspaceTestOverrides({
      credentials: null,
      clearCache: true,
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('/gviz/tq?tqx=out:csv')) {
          return new Response(csvRows, {
            status: 200,
            headers: { 'content-type': 'text/csv; charset=utf-8' },
          });
        }
        if (url.includes('/htmlview')) {
          return new Response(htmlView, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        }
        return new Response('Not Found', { status: 404 });
      }) as typeof fetch,
    });

    const res = await ChatGoogleWorkspaceService.previewLink({
      url: 'https://docs.google.com/spreadsheets/d/1_T_X3L12RWMs1LRjAROBKSbQiN-hUCJwCOmtC8uULFQ/edit?gid=516151439#gid=516151439&range=D17',
      viewer: { id: 99, role: 'cv', displayName: 'Thảo Ly' },
    });

    assert.equal(res.success, true);
    assert.equal(res.accessStatus, 'PUBLIC_LINK');
    assert.equal(res.title, 'Kho Đề Thám');
    assert.equal(res.tabs?.length, 2);
    assert.equal(res.activeTab?.title, 'Mi');
    assert.equal(res.activeTab?.gid, '516151439');
    assert.equal(res.requestedRange, 'D17');
    assert.equal(res.parsedRange?.startRow, 17);
    assert.equal(res.parsedRange?.startCol, 3);
    assert.ok(res.activeTab?.snippetRows?.some((r) => r.rowNumber === 17 && r.cells.includes('3')));
  });

  it('enforces Service Account role guard (allows Admin sender/viewer, blocks non-privileged snooping)', async () => {
    const creds = createEphemeralTestCredentials();

    setGoogleWorkspaceTestOverrides({
      credentials: creds,
      clearCache: true,
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), { status: 200 });
        }
        if (url.startsWith('https://www.googleapis.com/drive/v3/files/')) {
          return new Response(
            JSON.stringify({
              id: '1PrivateSheetId123456',
              name: 'Bảng Lương Bảo Mật',
              modifiedTime: '2026-11-15T06:00:00Z',
              permissions: [{ type: 'user', role: 'reader' }],
            }),
            { status: 200 }
          );
        }
        if (url.startsWith('https://sheets.googleapis.com/v4/spreadsheets/1PrivateSheetId123456/values/')) {
          return new Response(
            JSON.stringify({
              values: [
                ['Nhân sự', 'Chi nhánh', 'Lương cứng'],
                ['Nguyễn A', 'Đề Thám', '15,000,000'],
              ],
            }),
            { status: 200 }
          );
        }
        if (url.startsWith('https://sheets.googleapis.com/v4/spreadsheets/1PrivateSheetId123456')) {
          return new Response(
            JSON.stringify({
              properties: { title: 'Bảng Lương Bảo Mật' },
              sheets: [{ properties: { sheetId: 0, title: 'NVL', gridProperties: { rowCount: 50, columnCount: 10 } } }],
            }),
            { status: 200 }
          );
        }
        // Unauthenticated public probe returns 302 login redirect
        return new Response('', { status: 302, headers: { location: 'https://accounts.google.com/ServiceLogin' } });
      }) as typeof fetch,
    });

    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1PrivateSheetId123456/edit#gid=0';

    // 1. Standard CV viewing a file sent by another standard CV -> RESTRICTED_ROLE!
    const blocked = await ChatGoogleWorkspaceService.previewLink({
      url: sheetUrl,
      viewer: { id: 20, role: 'cv', displayName: 'CV A' },
      sender: { id: 21, role: 'cv', displayName: 'CV B' },
    });
    assert.equal(blocked.success, false);
    assert.equal(blocked.accessStatus, 'RESTRICTED_ROLE');
    assert.equal(blocked.activeTab, undefined);

    // 2. Standard CV viewing a file posted by Admin (e.g., Bảo Hân in group chat) -> ALLOWED!
    const allowedViaAdminSender = await ChatGoogleWorkspaceService.previewLink({
      url: sheetUrl,
      viewer: { id: 20, role: 'cv', displayName: 'CV A' },
      sender: { id: 13, role: 'Admin', displayName: 'Bảo Hân' },
    });
    assert.equal(allowedViaAdminSender.success, true);
    assert.equal(allowedViaAdminSender.accessStatus, 'SERVICE_ACCOUNT');
    assert.equal(allowedViaAdminSender.activeTab?.rows[1][2], '15,000,000');

    // 3. Manager/Admin viewing directly -> ALLOWED!
    const allowedViaManager = await ChatGoogleWorkspaceService.previewLink({
      url: sheetUrl,
      viewer: { id: 5, role: 'manager', displayName: 'Quản lý' },
    });
    assert.equal(allowedViaManager.success, true);
    assert.equal(allowedViaManager.accessStatus, 'SERVICE_ACCOUNT');
  });

  it('returns NEEDS_SHARE with Service Account email when private file is not shared', async () => {
    const creds = createEphemeralTestCredentials();

    setGoogleWorkspaceTestOverrides({
      credentials: creds,
      clearCache: true,
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), { status: 200 });
        }
        if (url.includes('googleapis.com')) {
          return new Response(JSON.stringify({ error: { code: 404, message: 'Not Found' } }), { status: 404 });
        }
        return new Response('', { status: 302, headers: { location: 'https://accounts.google.com/ServiceLogin' } });
      }) as typeof fetch,
    });

    const res = await ChatGoogleWorkspaceService.previewLink({
      url: 'https://docs.google.com/spreadsheets/d/1UnsharedSheetId999999/edit#gid=0',
      viewer: { id: 1, role: 'super_admin' },
    });

    assert.equal(res.success, false);
    assert.equal(res.accessStatus, 'NEEDS_SHARE');
    assert.equal(res.serviceAccountEmail, 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com');
  });

  it('reads Google Docs via Drive API export (never docs.googleapis.com) and parses headings/tables', async () => {
    const creds = createEphemeralTestCredentials();
    const calledUrls: string[] = [];
    const sampleDocHtml = `
      <html>
        <head><title>Quy Trình Kho Đề Thám</title></head>
        <body>
          <h1>1. Mục tiêu kiểm kho</h1>
          <p>Kiểm tra tồn kho hàng ngày trước 18:00.</p>
          <ul><li>Quét mã vạch NVL</li><li>Đối chiếu số liệu Mi</li></ul>
          <h2>2. Định mức tồn an toàn</h2>
          <table>
            <tr><th>Nhóm hàng</th><th>Mức tối thiểu</th></tr>
            <tr><td>Mi Classic</td><td>10 hộp</td></tr>
          </table>
        </body>
      </html>
    `;

    setGoogleWorkspaceTestOverrides({
      credentials: creds,
      clearCache: true,
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        calledUrls.push(url);
        if (url === 'https://oauth2.googleapis.com/token') {
          return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), { status: 200 });
        }
        if (url.includes('drive/v3/files/1DocSample123456/export')) {
          return new Response(sampleDocHtml, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        if (url.includes('drive/v3/files/1DocSample123456')) {
          return new Response(
            JSON.stringify({
              id: '1DocSample123456',
              name: 'Quy Trình Kho Đề Thám',
              permissions: [{ type: 'anyone', role: 'reader' }],
            }),
            { status: 200 }
          );
        }
        return new Response('', { status: 404 });
      }) as typeof fetch,
    });

    const res = await ChatGoogleWorkspaceService.previewLink({
      url: 'https://docs.google.com/document/d/1DocSample123456/edit',
      viewer: { id: 10, role: 'cv' },
    });

    assert.equal(res.success, true);
    assert.equal(res.kind, 'document');
    assert.equal(res.accessStatus, 'PUBLIC_LINK');
    assert.equal(res.title, 'Quy Trình Kho Đề Thám');
    assert.equal(res.headings?.length, 2);
    assert.ok(res.sections?.some((s) => s.type === 'table' && s.rows?.[1]?.[0] === 'Mi Classic'));
    assert.ok(calledUrls.every((u) => !u.includes('docs.googleapis.com')));

    const parsed = parseGoogleDocHtmlToStructured(sampleDocHtml);
    assert.equal(parsed.headings[0].text, '1. Mục tiêu kiểm kho');
  });

  it('builds AI context & Mission snapshot covering multiple tabs (NVL & Mi)', async () => {
    const creds = createEphemeralTestCredentials();

    setGoogleWorkspaceTestOverrides({
      credentials: creds,
      clearCache: true,
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return new Response(JSON.stringify({ access_token: 'mock-sa-token', expires_in: 3600 }), { status: 200 });
        }
        if (url.includes('drive/v3/files/1MultiTabSheet123')) {
          return new Response(
            JSON.stringify({
              id: '1MultiTabSheet123',
              name: 'Kho Đề Thám EP',
              permissions: [{ type: 'anyone', role: 'reader' }],
            }),
            { status: 200 }
          );
        }
        if (url.includes('/values/') && decodeURIComponent(url).includes('NVL')) {
          return new Response(
            JSON.stringify({
              values: [
                ['Mã NVL', 'Tên', 'Tồn'],
                ['KEO-01', 'Keo nối mi', '12'],
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes('/values/') && decodeURIComponent(url).includes('Mi')) {
          return new Response(
            JSON.stringify({
              values: [
                ['Mã Mi', 'Loại', 'Tồn'],
                ['MI-01', 'Volume 0.05', '5'],
              ],
            }),
            { status: 200 }
          );
        }
        if (url.includes('sheets.googleapis.com/v4/spreadsheets/1MultiTabSheet123')) {
          return new Response(
            JSON.stringify({
              properties: { title: 'Kho Đề Thám EP' },
              sheets: [
                { properties: { sheetId: 111, title: 'NVL', gridProperties: { rowCount: 40, columnCount: 8 } } },
                { properties: { sheetId: 516151439, title: 'Mi', gridProperties: { rowCount: 40, columnCount: 8 } } },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response('', { status: 404 });
      }) as typeof fetch,
    });

    const msgText =
      '@AI đọc giúp em link https://docs.google.com/spreadsheets/d/1MultiTabSheet123/edit?gid=516151439#gid=516151439&range=C2';
    const aiCtx = await ChatGoogleWorkspaceService.buildAiContextForText({
      text: msgText,
      viewer: { id: 1, role: 'super_admin' },
    });
    assert.match(aiCtx, /Kho Đề Thám EP/);
    assert.match(aiCtx, /NVL/);
    assert.match(aiCtx, /Keo nối mi/);
    assert.match(aiCtx, /Volume 0\.05/);

    const missionMd = await ChatGoogleWorkspaceService.buildMissionSnapshotMarkdown({
      text: msgText,
      viewer: { id: 1, role: 'super_admin' },
    });
    assert.match(missionMd, /Dữ liệu Google Workspace đính kèm/);
    assert.match(missionMd, /NVL/);
    assert.match(missionMd, /Mi/);
  });

  it('resolves Canva shortlinks, extracts Whiteboard bootstrap text, and feeds @AI & Mission context', async () => {
    const sampleBoot = {
      page: {
        C: {
          D: { A: { D: 'TỔNG QUAN' } },
          F: { displayName: 'Wings Lashes studio' },
        },
        nodes: [
          {
            'A?': 'K',
            A: -1076,
            B: -1118,
            a: { C: { A: ['TỔNG QUAN\n'], C: [{ G: '32px', I: 'bold' }] } },
          },
          {
            'A?': 'K',
            A: 866,
            B: -1122,
            a: { C: { A: ['VỀ QUY TRÌNH\n'], C: [{ G: '32px', I: 'bold' }] } },
          },
          {
            'A?': 'K',
            A: 866,
            B: -253,
            a: {
              C: {
                A: ['Giao diện kiểm kho trên App Hàng New đã được check 694/1308\n'],
                C: [{ G: '20px', I: 'bold' }],
              },
            },
          },
        ],
      },
    };
    const escapedBootJson = JSON.stringify(sampleBoot).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const sampleEmbedHtml = `<!DOCTYPE html><html><head><title>TỔNG QUAN</title><meta name="description" content="Check out this Whiteboard designed by Wings Lashes studio."/></head><body><script>window['bootstrap'] = JSON.parse('${escapedBootJson}');</script></body></html>`;

    const parsedDirect = parseCanvaEmbedHtmlToStructured(sampleEmbedHtml);
    assert.equal(parsedDirect.title, 'TỔNG QUAN');
    assert.equal(parsedDirect.designType, 'Whiteboard');
    assert.equal(parsedDirect.authorName, 'Wings Lashes studio');
    assert.equal(parsedDirect.headings.length, 2);
    assert.match(parsedDirect.plainText, /694\/1308/);

    setGoogleWorkspaceTestOverrides({
      credentials: null,
      clearCache: true,
      fetchImpl: (async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://canva.link/leea2jxg31jg7hy') {
          return new Response('', {
            status: 302,
            headers: {
              location: 'https://www.canva.com/design/DAHbDO6HA6o/BJIbSltALDzXJWELsU_BsQ/edit?utm_content=DAHbDO6HA6o',
            },
          });
        }
        if (url.startsWith('https://www.canva.com/_oembed?')) {
          return new Response(
            JSON.stringify({
              title: 'TỔNG QUAN',
              author_name: 'Wings Lashes studio',
              width: 1920,
              height: 1080,
              html: '<iframe src="https://www.canva.com/design/DAHbDO6HA6o/BJIbSltALDzXJWELsU_BsQ/view?embed&amp;meta"></iframe>',
            }),
            { status: 200 }
          );
        }
        if (url === 'https://www.canva.com/design/DAHbDO6HA6o/BJIbSltALDzXJWELsU_BsQ/view?embed') {
          return new Response(sampleEmbedHtml, { status: 200 });
        }
        return new Response('', { status: 404 });
      }) as typeof fetch,
    });

    const preview = await ChatGoogleWorkspaceService.previewLink({
      url: 'https://canva.link/leea2jxg31jg7hy',
      viewer: { id: 1, role: 'super_admin' },
    });
    assert.equal(preview.success, true);
    assert.equal(preview.kind, 'canva');
    assert.equal(preview.accessStatus, 'PUBLIC_LINK');
    assert.equal(preview.fileId, 'DAHbDO6HA6o');
    assert.equal(preview.title, 'TỔNG QUAN');
    assert.equal(preview.authorName, 'Wings Lashes studio');
    assert.equal(preview.designType, 'Whiteboard');
    assert.equal(preview.embedUrl, 'https://www.canva.com/design/DAHbDO6HA6o/BJIbSltALDzXJWELsU_BsQ/view?embed&meta');
    assert.ok(preview.sections?.some((s) => (s.text || '').includes('694/1308')));

    const aiCtx = await ChatGoogleWorkspaceService.buildAiContextForText({
      text: '@AI Đọc bảng Canva này https://canva.link/leea2jxg31jg7hy',
      viewer: { id: 1, role: 'super_admin' },
    });
    assert.match(aiCtx, /Thiết kế Canva \(Whiteboard\): TỔNG QUAN/);
    assert.match(aiCtx, /694\/1308/);
  });

  it('returns NEEDS_SHARE guidance when a Canva link is private', async () => {
    setGoogleWorkspaceTestOverrides({
      credentials: null,
      clearCache: true,
      fetchImpl: (async () => new Response('Forbidden', { status: 403 })) as typeof fetch,
    });

    const preview = await ChatGoogleWorkspaceService.previewLink({
      url: 'https://www.canva.com/design/DAHbPrivate123/secretToken/view',
      viewer: { id: 1, role: 'admin' },
    });

    assert.equal(preview.success, false);
    assert.equal(preview.kind, 'canva');
    assert.equal(preview.accessStatus, 'NEEDS_SHARE');
    assert.match(preview.statusMessage || '', /Bất kỳ ai có liên kết/);
  });
});
