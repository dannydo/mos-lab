const Fastify = require('fastify');
const prismaPlugin = require('./dist/plugins/prisma.js').default;
const { LashBenchmarkService } = require('./dist/modules/catalog/services/lash-benchmark.service.js');

async function test() {
  const app = Fastify();
  await app.register(prismaPlugin);
  console.time('Seed Execution');
  const res = await LashBenchmarkService.seedBenchmarks(app);
  console.timeEnd('Seed Execution');
  console.log('Seed Result:', res);
  const rows = await LashBenchmarkService.listBenchmarks(app);
  console.log('Total Benchmark Rows:', rows.length);
  console.log('\n--- ALL LASH BENCHMARKS BROKEN DOWN BY EXACT LASH COUNT ---');
  rows.forEach((r) => {
    console.log(
      `  - ${r.lashStyle.padEnd(12)} | ${r.serviceType.padEnd(7)} | Sợi: ${(r.lashCount !== null ? r.lashCount + ' sợi' : 'N/A').padEnd(8)} -> Median P50: ${r.benchmarkMinutes}p (P25: ${r.minMinutes}p, P75: ${r.maxMinutes}p) [Mẫu: ${r.sampleSize}]`
    );
  });
  process.exit(0);
}
test();
