import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function findToken() {
  await legacy.$connect();
  const tokens = await legacy.$queryRawUnsafe<any[]>(
    `SELECT user_id, access_token, date_expired FROM user_access_token WHERE user_id = 37790 LIMIT 5`
  );
  console.log('Tokens for 37790:', tokens);

  if (tokens.length === 0) {
    const anyTokens = await legacy.$queryRawUnsafe<any[]>(
      `SELECT user_id, access_token, date_expired FROM user_access_token ORDER BY id DESC LIMIT 5`
    );
    console.log('Any recent tokens:', anyTokens);
  }
  await legacy.$disconnect();
}

findToken();
