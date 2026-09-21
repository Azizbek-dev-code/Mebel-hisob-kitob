import type { TelegramAccountPref } from '@furniture-erp/shared';

import { prisma } from '../../lib/prisma.js';
import { listAccountPreferences } from './telegram.account-pref.service.js';
import { countValidTelegramAccountContexts, unlinkTelegramForIdentity } from './telegram.cleanup.service.js';
import {
  findActiveByTelegramUserId,
  getConnectionStatus,
} from './telegram.connection.service.js';
import {
  answerTelegramCallbackQuery,
  sendTelegramMessage,
} from './telegram.service.js';
import type {
  TelegramCallbackQuery,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
} from './telegram.types.js';

/** Callback prefixes — keep under 64 bytes with cuid workspace id. */
export const TELEGRAM_CB_ACCOUNTS = 'tg:accs';
export const TELEGRAM_CB_ACC = 'tg:acc:';
export const TELEGRAM_CB_ACC_NOTIFY = 'tg:accn:';
export const TELEGRAM_CB_ACC_UNLINK = 'tg:accu:';
export const TELEGRAM_CB_ACC_UNLINK_OK = 'tg:accuo:';
export const TELEGRAM_CB_ACC_UNLINK_NO = 'tg:accun:';
export const TELEGRAM_CB_ACC_SELECT = 'tg:accs:';

function accountsKeyboard(accounts: TelegramAccountPref[]): TelegramInlineKeyboardMarkup {
  const rows = accounts.map((account) => [
    {
      text:
        account.type === 'PERSONAL'
          ? `👤 ${account.name || 'Personal'}`
          : `🏢 ${account.name || 'Business'}`,
      callback_data: `${TELEGRAM_CB_ACC}${account.workspaceId}`,
    },
  ]);
  return { inline_keyboard: rows.length ? rows : [[{ text: '⬅️ Orqaga', callback_data: TELEGRAM_CB_ACCOUNTS }]] };
}

function accountDetailKeyboard(account: TelegramAccountPref): TelegramInlineKeyboardMarkup {
  const notifyLabel = account.notifyEnabled ? '🔔 Bildirishnomalar: YOQIQ' : '🔕 Bildirishnomalar: O‘CHIQ';
  return {
    inline_keyboard: [
      [{ text: '✅ Tanlash', callback_data: `${TELEGRAM_CB_ACC_SELECT}${account.workspaceId}` }],
      [{ text: notifyLabel, callback_data: `${TELEGRAM_CB_ACC_NOTIFY}${account.workspaceId}` }],
      [{ text: '🔗 Unlink', callback_data: `${TELEGRAM_CB_ACC_UNLINK}${account.workspaceId}` }],
      [{ text: '⬅️ Orqaga', callback_data: TELEGRAM_CB_ACCOUNTS }],
    ],
  };
}

function unlinkConfirmKeyboard(workspaceId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: 'Ha, uzish', callback_data: `${TELEGRAM_CB_ACC_UNLINK_OK}${workspaceId}` },
        { text: 'Bekor qilish', callback_data: `${TELEGRAM_CB_ACC_UNLINK_NO}${workspaceId}` },
      ],
    ],
  };
}

function formatAccountsList(accounts: TelegramAccountPref[]): string {
  if (accounts.length === 0) {
    return '👤 <b>Ulangan akkauntlar</b>\n\nHozircha ulangan akkaunt topilmadi.';
  }
  const lines = accounts.map((account) => {
    const icon = account.type === 'PERSONAL' ? '👤' : '🏢';
    const kind = account.type === 'PERSONAL' ? 'Personal' : 'Business';
    const status = account.notifyEnabled ? '🟢' : '⚪';
    const subtitle = account.type === 'PERSONAL' ? 'Shaxsiy moliya' : account.name;
    return `${status} <b>${kind}</b>\n${icon} ${subtitle}`;
  });
  return `👤 <b>Ulangan akkauntlar</b>\n\nSizning akkauntlaringiz:\n\n${lines.join('\n\n')}`;
}

function formatAccountDetail(
  account: TelegramAccountPref,
  connectionNotify: { notifyPersonal: boolean; notifyBusiness: boolean },
): string {
  const kind = account.type === 'PERSONAL' ? 'Personal' : 'Business';
  const channelOn =
    account.type === 'PERSONAL' ? connectionNotify.notifyPersonal : connectionNotify.notifyBusiness;
  return [
    `<b>${account.type === 'PERSONAL' ? '👤' : '🏢'} ${account.name}</b>`,
    `Turi: ${kind}`,
    `Status: ${account.notifyEnabled && channelOn ? '🟢 Faol' : '⚪ Bildirishnoma o‘chirilgan'}`,
    `Telegram notification: ${account.notifyEnabled ? 'yoqilgan' : 'o‘chirilgan'}`,
    '',
    'Kerakli amalni tanlang:',
  ].join('\n');
}

async function requireActiveConnection(telegramUserId: string, chatId: string) {
  const connection = await findActiveByTelegramUserId(telegramUserId);
  if (!connection) {
    await sendTelegramMessage(
      chatId,
      '❌ Telegram hali ulanmagan.\nIlovadan ulash havolasini oling.',
    );
    return null;
  }
  return connection;
}

export async function handleAccountsCommand(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) return;
  const chatId = String(message.chat.id);
  const connection = await requireActiveConnection(String(from.id), chatId);
  if (!connection) return;

  const accounts = (await listAccountPreferences(connection.identityId)).filter(
    (row) => row.notifyEnabled,
  );
  await sendTelegramMessage(chatId, formatAccountsList(accounts), accountsKeyboard(accounts));
}

export async function handleAccountsListCallback(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    await sendTelegramMessage(chatId, '❌ Telegram hali ulanmagan.');
    return;
  }
  const accounts = (await listAccountPreferences(connection.identityId)).filter(
    (row) => row.notifyEnabled,
  );
  await answerTelegramCallbackQuery(query.id);
  await sendTelegramMessage(chatId, formatAccountsList(accounts), accountsKeyboard(accounts));
}

export async function handleAccountDetailCallback(
  query: TelegramCallbackQuery,
  workspaceId: string,
): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    return;
  }
  const accounts = await listAccountPreferences(connection.identityId);
  const account = accounts.find((row) => row.workspaceId === workspaceId);
  if (!account) {
    await answerTelegramCallbackQuery(query.id, 'Topilmadi');
    await sendTelegramMessage(chatId, '⚠️ Bu akkaunt topilmadi yoki allaqachon uzilgan.');
    return;
  }
  const status = await getConnectionStatus(connection.identityId);
  await answerTelegramCallbackQuery(query.id);
  await sendTelegramMessage(
    chatId,
    formatAccountDetail(account, status),
    accountDetailKeyboard(account),
  );
}

export async function handleAccountSelectCallback(
  query: TelegramCallbackQuery,
  workspaceId: string,
): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    return;
  }
  const accounts = await listAccountPreferences(connection.identityId);
  const account = accounts.find((row) => row.workspaceId === workspaceId);
  if (!account) {
    await answerTelegramCallbackQuery(query.id, 'Topilmadi');
    return;
  }
  await answerTelegramCallbackQuery(query.id, 'Tanlandi');
  await sendTelegramMessage(
    chatId,
    `✅ <b>${account.name}</b> tanlandi.\nBildirishnomalar shu akkaunt sozlamalariga qarab yuboriladi.`,
    accountDetailKeyboard(account),
  );
}

export async function handleAccountNotifyToggle(
  query: TelegramCallbackQuery,
  workspaceId: string,
): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    return;
  }

  const accounts = await listAccountPreferences(connection.identityId);
  const account = accounts.find((row) => row.workspaceId === workspaceId);
  if (!account) {
    await answerTelegramCallbackQuery(query.id, 'Topilmadi');
    return;
  }

  const next = !account.notifyEnabled;
  await prisma.telegramAccountPreference.upsert({
    where: {
      connectionId_workspaceId: { connectionId: connection.id, workspaceId },
    },
    create: { connectionId: connection.id, workspaceId, notifyEnabled: next },
    update: { notifyEnabled: next },
  });

  const updated = { ...account, notifyEnabled: next };
  const status = await getConnectionStatus(connection.identityId);
  await answerTelegramCallbackQuery(query.id, next ? 'Yoqildi' : 'O‘chirildi');
  await sendTelegramMessage(
    chatId,
    formatAccountDetail(updated, status),
    accountDetailKeyboard(updated),
  );
}

export async function handleAccountUnlinkPrompt(
  query: TelegramCallbackQuery,
  workspaceId: string,
): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    return;
  }
  const accounts = await listAccountPreferences(connection.identityId);
  const account = accounts.find((row) => row.workspaceId === workspaceId);
  if (!account) {
    await answerTelegramCallbackQuery(query.id, 'Topilmadi');
    return;
  }
  await answerTelegramCallbackQuery(query.id);
  await sendTelegramMessage(
    chatId,
    `Bu akkauntni Telegram'dan uzmoqchimisiz?\n\n<b>${account.name}</b>\n\nBoshqa akkauntlaringiz ulangan qoladi.`,
    unlinkConfirmKeyboard(workspaceId),
  );
}

/**
 * Unlink a single workspace from Telegram notifications.
 * Does not disconnect the whole Identity connection unless no valid contexts remain
 * (or this was the last remaining account preference).
 */
export async function handleAccountUnlinkConfirm(
  query: TelegramCallbackQuery,
  workspaceId: string,
  accept: boolean,
): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  if (!accept) {
    await answerTelegramCallbackQuery(query.id, 'Bekor');
    await handleAccountDetailCallback(query, workspaceId);
    return;
  }

  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    return;
  }

  const accountsBefore = await listAccountPreferences(connection.identityId);
  const account = accountsBefore.find((row) => row.workspaceId === workspaceId);
  if (!account) {
    await answerTelegramCallbackQuery(query.id, 'Topilmadi');
    return;
  }

  await prisma.telegramAccountPreference.upsert({
    where: {
      connectionId_workspaceId: { connectionId: connection.id, workspaceId },
    },
    create: { connectionId: connection.id, workspaceId, notifyEnabled: false },
    update: { notifyEnabled: false },
  });

  // Flip channel master off when unlinking the last account of that type.
  const remainingOfType = accountsBefore.filter(
    (row) => row.workspaceId !== workspaceId && row.type === account.type && row.notifyEnabled,
  );
  if (remainingOfType.length === 0) {
    await prisma.telegramConnection.update({
      where: { id: connection.id },
      data:
        account.type === 'PERSONAL'
          ? { notifyPersonal: false }
          : { notifyBusiness: false },
    });
  }

  const remainingContexts = await countValidTelegramAccountContexts(connection.identityId);
  const allAccounts = await listAccountPreferences(connection.identityId);
  const remainingLinked = allAccounts.filter((row) => row.notifyEnabled);

  if (remainingContexts === 0 || remainingLinked.length === 0) {
    await unlinkTelegramForIdentity(connection.identityId);
    await answerTelegramCallbackQuery(query.id, 'Uzildi');
    await sendTelegramMessage(
      chatId,
      `✅ <b>${account.name}</b> uzildi.\nBoshqa akkaunt qolmagani uchun Telegram aloqasi ham uzildi.`,
    );
    return;
  }

  await answerTelegramCallbackQuery(query.id, 'Uzildi');
  await sendTelegramMessage(
    chatId,
    `✅ <b>${account.name}</b> Telegram'dan uzildi.\nBoshqa akkauntlaringiz ulangan qoladi.`,
    accountsKeyboard(remainingLinked),
  );
}

export function isTelegramAccountsCallback(data: string): boolean {
  return (
    data === TELEGRAM_CB_ACCOUNTS ||
    data.startsWith(TELEGRAM_CB_ACC) ||
    data.startsWith(TELEGRAM_CB_ACC_NOTIFY) ||
    data.startsWith(TELEGRAM_CB_ACC_UNLINK) ||
    data.startsWith(TELEGRAM_CB_ACC_UNLINK_OK) ||
    data.startsWith(TELEGRAM_CB_ACC_UNLINK_NO) ||
    data.startsWith(TELEGRAM_CB_ACC_SELECT)
  );
}

export async function handleAccountsCallback(
  query: TelegramCallbackQuery,
  data: string,
): Promise<void> {
  if (data === TELEGRAM_CB_ACCOUNTS) {
    await handleAccountsListCallback(query);
    return;
  }
  if (data.startsWith(TELEGRAM_CB_ACC_UNLINK_OK)) {
    await handleAccountUnlinkConfirm(query, data.slice(TELEGRAM_CB_ACC_UNLINK_OK.length), true);
    return;
  }
  if (data.startsWith(TELEGRAM_CB_ACC_UNLINK_NO)) {
    await handleAccountUnlinkConfirm(query, data.slice(TELEGRAM_CB_ACC_UNLINK_NO.length), false);
    return;
  }
  if (data.startsWith(TELEGRAM_CB_ACC_UNLINK)) {
    await handleAccountUnlinkPrompt(query, data.slice(TELEGRAM_CB_ACC_UNLINK.length));
    return;
  }
  if (data.startsWith(TELEGRAM_CB_ACC_NOTIFY)) {
    await handleAccountNotifyToggle(query, data.slice(TELEGRAM_CB_ACC_NOTIFY.length));
    return;
  }
  if (data.startsWith(TELEGRAM_CB_ACC_SELECT)) {
    await handleAccountSelectCallback(query, data.slice(TELEGRAM_CB_ACC_SELECT.length));
    return;
  }
  if (data.startsWith(TELEGRAM_CB_ACC)) {
    await handleAccountDetailCallback(query, data.slice(TELEGRAM_CB_ACC.length));
  }
}
