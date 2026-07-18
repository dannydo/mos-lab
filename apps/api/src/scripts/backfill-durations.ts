import { PrismaClient } from '../generated/crm-client/index.js';
import axios from 'axios';

const prisma = new PrismaClient();
const apiKey = process.env.OMICALL_API_KEY;

async function backfill() {
  console.log('=== STARTING DURATION BACKFILL ===');

  if (!apiKey) {
    console.error('OMICALL_API_KEY is not defined in environment!');
    return;
  }

  // Bước 1: Lấy các cuộc gọi có callUuid nhưng durationSec là null
  const logsWithUuid = await prisma.crmCallLog.findMany({
    where: {
      durationSec: null,
      callUuid: { not: null },
    },
  });

  console.log(`Found ${logsWithUuid.length} logs with callUuid and null durationSec.`);

  let updatedCount = 0;
  for (const log of logsWithUuid) {
    if (!log.callUuid) continue;
    try {
      console.log(`Fetching detail for callUuid: ${log.callUuid}...`);
      const response = await axios.get(
        `https://public-v1.omicall.com/api/call/transaction/detail?call_uuid=${log.callUuid}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 5000,
        }
      );

      const data = response.data;
      const duration = data?.payload?.bill_sec || data?.payload?.duration || data?.bill_sec || data?.duration;

      if (duration !== undefined && duration !== null) {
        await prisma.crmCallLog.update({
          where: { id: log.id },
          data: { durationSec: Number(duration) },
        });
        console.log(`Successfully updated CallLog ID ${log.id} with duration: ${duration}s`);
        updatedCount++;
      } else {
        console.log(`No duration found in OmiCall payload for uuid ${log.callUuid}`);
      }
    } catch (err: any) {
      console.error(`Failed to fetch/update for uuid ${log.callUuid}:`, err.message);
    }
    // Delay 200ms để tránh rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`Step 1 complete. Updated ${updatedCount} logs directly from OmiCall.`);

  // Bước 2: Với các cuộc gọi không có callUuid nhưng bị null durationSec
  // Tìm trong crmOmicallLog (bảng local đã sync từ webhook) để so khớp theo legacyUserId và thời gian
  const logsWithoutUuid = await prisma.crmCallLog.findMany({
    where: {
      durationSec: null,
      callUuid: null,
    },
  });

  console.log(`Found ${logsWithoutUuid.length} logs without callUuid and null durationSec.`);
  let step2Updated = 0;

  for (const log of logsWithoutUuid) {
    // Tìm omicallLog cùng legacyUserId, staffId và thời gian lệch không quá 5 phút (300 giây)
    const startRange = new Date(log.createdAt.getTime() - 5 * 60 * 1000);
    const endRange = new Date(log.createdAt.getTime() + 5 * 60 * 1000);

    const match = await prisma.crmOmicallLog.findFirst({
      where: {
        legacyUserId: log.legacyUserId,
        staffId: log.staffId,
        createdAt: {
          gte: startRange,
          lte: endRange,
        },
        duration: { gt: 0 },
      },
    });

    if (match) {
      await prisma.crmCallLog.update({
        where: { id: log.id },
        data: {
          callUuid: match.callUuid,
          durationSec: match.duration,
        },
      });
      console.log(
        `Step 2: Matched CallLog ID ${log.id} with OmiCall Log ID ${match.id} (duration: ${match.duration}s)`
      );
      step2Updated++;
    }
  }

  console.log(`Step 2 complete. Matched and updated ${step2Updated} logs via local omicall logs.`);
  console.log(`=== BACKFILL COMPLETED. TOTAL UPDATED: ${updatedCount + step2Updated} ===`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
