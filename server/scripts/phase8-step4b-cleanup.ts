/**
 * Phase 8 Step 4B — soft-deactivate temporary Ali compensation rules.
 * Marker: PHASE8_STEP4B_TEMP. No hard DELETE.
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const WORKER_ID = 'cmslaio2w000bl7ek4l1ohalk';
const MARKER = 'PHASE8_STEP4B_TEMP';

async function main() {
  const updated = await prisma.workerCompensationRule.updateMany({
    where: { workerId: WORKER_ID },
    data: { notes: MARKER, isActive: false },
  });
  const rules = await prisma.workerCompensationRule.findMany({
    where: { workerId: WORKER_ID },
    select: { id: true, value: true, isActive: true, notes: true },
  });
  const financeTx = await prisma.workerFinancialTransaction.count();
  console.log(
    JSON.stringify({
      updated: updated.count,
      rules: rules.map((rule) => ({
        id: rule.id,
        value: Number(rule.value),
        isActive: rule.isActive,
        notes: rule.notes,
      })),
      financeTx,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
