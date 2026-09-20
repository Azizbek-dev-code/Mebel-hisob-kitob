import { config } from 'dotenv';
config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });

import { PrismaClient } from '@prisma/client';
import {
  activateOrReplaceConnection,
  unlinkConnection,
} from '../src/modules/telegram/telegram.connection.service.ts';
import { tryDeliverTelegram, tryDeliverTelegramToStoreUsers } from '../src/modules/telegram/telegram.delivery.ts';

const prisma = new PrismaClient();

const user = await prisma.user.findFirst({
  where: { email: 'admin@furniture-erp.local' },
  select: { id: true, storeId: true, identityId: true },
});
if (!user?.identityId) throw new Error('admin identity missing');

await activateOrReplaceConnection({
  identityId: user.identityId,
  telegramUserId: '9001001',
  telegramChatId: '9001001',
  username: 'local_test_bot_user',
  firstName: 'LocalTest',
});

await tryDeliverTelegram({
  identityId: user.identityId,
  channel: 'business',
  prefField: 'bizNotifySales',
  text: '🛒 Local business notify smoke',
});
await tryDeliverTelegram({
  identityId: user.identityId,
  channel: 'personal',
  prefField: 'personalNotifyBudget',
  text: '💰 Local personal notify smoke',
});
await tryDeliverTelegramToStoreUsers(user.storeId, {
  prefField: 'bizNotifySales',
  text: '🛒 Store fanout smoke',
});

console.log('DELIVERY_SMOKE_OK');
await unlinkConnection(user.identityId);
await prisma.$disconnect();
