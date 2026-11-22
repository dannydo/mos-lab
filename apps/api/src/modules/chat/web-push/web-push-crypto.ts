import crypto from 'node:crypto';

export interface StoredVapidKeyPair {
  publicKey: string;
  privateJwk: crypto.JsonWebKey;
  createdAt: string;
}

export function decodeBase64UrlOrBase64(input: string): Buffer {
  const normalized = String(input || '')
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

export function generateVapidKeyPair(): StoredVapidKeyPair {
  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const jwk = privateKey.export({ format: 'jwk' }) as crypto.JsonWebKey;
  const xBuf = decodeBase64UrlOrBase64(jwk.x || '');
  const yBuf = decodeBase64UrlOrBase64(jwk.y || '');
  const uncompressedPub = Buffer.concat([Buffer.from([0x04]), xBuf, yBuf]);

  return {
    publicKey: uncompressedPub.toString('base64url'),
    privateJwk: jwk,
    createdAt: new Date().toISOString(),
  };
}

export function createVapidJwtToken(params: {
  endpoint: string;
  privateJwk: crypto.JsonWebKey;
  subject?: string;
}): string {
  const url = new URL(params.endpoint);
  const audience = url.origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const sub = params.subject || process.env.VAPID_SUBJECT || 'mailto:admin@masteros.app';

  const headerB64 = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({ aud: audience, exp, sub })).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKeyObj = crypto.createPrivateKey({
    key: params.privateJwk,
    format: 'jwk',
  });

  const signature = crypto
    .sign('sha256', Buffer.from(signingInput, 'utf8'), {
      key: privateKeyObj,
      dsaEncoding: 'ieee-p1363',
    })
    .toString('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * RFC 8291 (Web Push Message Encryption) + RFC 8188 (aes128gcm Content-Encoding)
 */
export function encryptWebPushAes128Gcm(params: { payloadJson: string; p256dh: string; auth: string }): Buffer {
  const uaPublic = decodeBase64UrlOrBase64(params.p256dh);
  const authSecret = decodeBase64UrlOrBase64(params.auth);

  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) {
    throw new Error('Invalid client p256dh public key (must be 65-byte uncompressed P-256 point)');
  }
  if (authSecret.length < 16) {
    throw new Error('Invalid client auth secret (must be at least 16 bytes)');
  }

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'ascii'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));

  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii');
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, cekInfo, 16));

  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'ascii');
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, nonceInfo, 12));

  // RFC 8188 final record delimiter 0x02
  const plaintextRecord = Buffer.concat([Buffer.from(params.payloadJson, 'utf8'), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintextRecord), cipher.final(), cipher.getAuthTag()]);

  // RFC 8188 header: salt (16) || rs (4, uint32BE=4096) || idlen (1, uint8=65) || keyid (asPublic, 65)
  const header = Buffer.alloc(21 + asPublic.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  asPublic.copy(header, 21);

  return Buffer.concat([header, ciphertext]);
}
