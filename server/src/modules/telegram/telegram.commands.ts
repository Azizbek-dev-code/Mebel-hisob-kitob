import {
  handleAccountsCallback,
  handleAccountsCommand,
  isTelegramAccountsCallback,
} from './telegram.accounts.bot.js';
import { getPublicAppUrl } from './telegram.config.js';
import { sendMenuScreen } from './telegram.menu.js';
import {
  activateOrReplaceConnection,
  findActiveByTelegramUserId,
  getConnectionStatus,
  unlinkConnection,
} from './telegram.connection.service.js';
import {
  createPendingLink,
  deletePendingLink,
  findValidLinkTokenByHash,
  findValidLinkTokenByPayload,
  getPendingLink,
  markLinkTokenUsed,
} from './telegram.linking.js';
import {
  answerTelegramCallbackQuery,
  sendTelegramMessage,
} from './telegram.service.js';
import {
  TELEGRAM_CB_LINK_NO,
  TELEGRAM_CB_LINK_OK,
  TELEGRAM_CB_MENU,
  TELEGRAM_CB_UNLINK_NO,
  TELEGRAM_CB_UNLINK_OK,
  type TelegramCallbackQuery,
  type TelegramInlineKeyboardMarkup,
  type TelegramLogSink,
  type TelegramMessage,
  type TelegramUpdate,
} from './telegram.types.js';

function confirmLinkKeyboard(pendingId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Akkauntni ulash', callback_data: `${TELEGRAM_CB_LINK_OK}${pendingId}` },
        { text: '❌ Bekor qilish', callback_data: `${TELEGRAM_CB_LINK_NO}${pendingId}` },
      ],
    ],
  };
}

function confirmUnlinkKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Ha, uzish', callback_data: TELEGRAM_CB_UNLINK_OK },
        { text: '❌ Bekor', callback_data: TELEGRAM_CB_UNLINK_NO },
      ],
    ],
  };
}

function appUrlKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: '🏠 Dasturga kirish', url: getPublicAppUrl() }]],
  };
}

function parseBotCommand(text: string): { command: string; arg: string } | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  return {
    command: match[1]!.toLowerCase(),
    arg: (match[2] ?? '').trim(),
  };
}

function tgUserIds(from: { id: number; username?: string; first_name?: string }, chatId: number) {
  return {
    telegramUserId: String(from.id),
    telegramChatId: String(chatId),
    username: from.username ?? null,
    firstName: from.first_name ?? null,
  };
}

async function handleStart(message: TelegramMessage, arg: string): Promise<void> {
  const from = message.from;
  if (!from) return;
  const ids = tgUserIds(from, message.chat.id);

  if (!arg) {
    await sendMenuScreen(ids.telegramChatId, 'welcome');
    return;
  }

  const token = await findValidLinkTokenByPayload(arg);
  if (!token) {
    await sendTelegramMessage(
      ids.telegramChatId,
      '⚠️ Havola muddati o‘tgan yoki allaqachon ishlatilgan.\nIlovadan yangi ulash havolasini oling.',
    );
    return;
  }

  const pending = await createPendingLink({
    identityId: token.identityId,
    tokenHash: token.tokenHash,
    ...ids,
  });

  await sendTelegramMessage(
    ids.telegramChatId,
    '🔐 <b>Akkauntni ulash</b>\n\nTelegram akkauntingizni Balancy Space akkauntingizga ulashni tasdiqlaysizmi?',
    confirmLinkKeyboard(pending.id),
  );
}

async function handleHelp(chatId: string): Promise<void> {
  await sendTelegramMessage(
    chatId,
    '<b>Yordam</b>\n' +
      '/start — boshlash / ulash\n' +
      '/accounts — ulangan akkauntlar\n' +
      '/settings — holat va sozlamalar\n' +
      '/app — ilovani ochish\n' +
      '/unlink — butun hisobni uzish\n' +
      '/help — shu yordam',
  );
}

async function handleSettings(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) return;
  const chatId = String(message.chat.id);
  const connection = await findActiveByTelegramUserId(String(from.id));
  if (!connection) {
    await sendTelegramMessage(
      chatId,
      '❌ Telegram hali ulanmagan.\nIlovadan ulash havolasini oling.',
      appUrlKeyboard(),
    );
    return;
  }
  const status = await getConnectionStatus(connection.identityId);
  const lines = [
    '<b>Telegram sozlamalari</b>',
    `Holat: ✅ ulangan${status.username ? ` (@${status.username})` : ''}`,
    `Biznes: ${status.notifyBusiness ? 'yoqilgan' : 'o‘chirilgan'}`,
    `Shaxsiy: ${status.notifyPersonal ? 'yoqilgan' : 'o‘chirilgan'}`,
    '',
    'Batafsil sozlamalar — ilovada.',
  ];
  await sendTelegramMessage(chatId, lines.join('\n'), appUrlKeyboard());
}

async function handleApp(chatId: string): Promise<void> {
  await sendTelegramMessage(chatId, 'Ilovani ochish:', appUrlKeyboard());
}

async function handleUnlinkPrompt(message: TelegramMessage): Promise<void> {
  const from = message.from;
  if (!from) return;
  const chatId = String(message.chat.id);
  const connection = await findActiveByTelegramUserId(String(from.id));
  if (!connection) {
    await sendTelegramMessage(chatId, 'Telegram allaqachon ulanmagan.');
    return;
  }
  await sendTelegramMessage(
    chatId,
    'Hisobni uzishni tasdiqlaysizmi?\nBildirishnomalar to‘xtaydi.',
    confirmUnlinkKeyboard(),
  );
}

async function handleLinkConfirm(
  query: TelegramCallbackQuery,
  pendingId: string,
  accept: boolean,
): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  const pending = await getPendingLink(pendingId);

  if (!pending || pending.expiresAt.getTime() <= Date.now()) {
    if (pending) await deletePendingLink(pending.id);
    await answerTelegramCallbackQuery(query.id, 'Havola muddati o‘tgan');
    await sendTelegramMessage(chatId, '⚠️ Havola muddati o‘tgan. Ilovadan yangisini oling.');
    return;
  }

  if (pending.telegramUserId !== String(query.from.id)) {
    await answerTelegramCallbackQuery(query.id, 'Bu so‘rov sizniki emas');
    await sendTelegramMessage(chatId, '⛔ Bu ulash so‘rovi boshqa Telegram hisobiga tegishli.');
    return;
  }

  if (!accept) {
    await deletePendingLink(pending.id);
    await answerTelegramCallbackQuery(query.id, 'Bekor qilindi');
    await sendTelegramMessage(chatId, 'Ulash bekor qilindi.');
    return;
  }

  const tokenRow = await findValidLinkTokenByHash(pending.tokenHash);
  if (!tokenRow) {
    await deletePendingLink(pending.id);
    await answerTelegramCallbackQuery(query.id, 'Havola ishlatilgan');
    await sendTelegramMessage(chatId, '⚠️ Havola allaqachon ishlatilgan yoki muddati o‘tgan.');
    return;
  }

  const activated = await activateOrReplaceConnection({
    identityId: pending.identityId,
    telegramUserId: pending.telegramUserId,
    telegramChatId: pending.telegramChatId,
    username: pending.username,
    firstName: pending.firstName,
  });

  if (!activated.ok) {
    await deletePendingLink(pending.id);
    await answerTelegramCallbackQuery(query.id, 'Xatolik');
    await sendTelegramMessage(
      chatId,
      '⛔ Bu Telegram allaqachon boshqa hisobga ulangan. Avval o‘sha hisobdan uzing.',
    );
    return;
  }

  await markLinkTokenUsed(tokenRow.id);
  await deletePendingLink(pending.id);
  await answerTelegramCallbackQuery(query.id, 'Ulandi');
  await sendTelegramMessage(
    chatId,
    '✅ Hisob muvaffaqiyatli ulandi!\nBildirishnomalar shu yerga keladi.\n/settings — sozlamalar',
  );
}

async function handleUnlinkConfirm(query: TelegramCallbackQuery, accept: boolean): Promise<void> {
  const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
  if (!accept) {
    await answerTelegramCallbackQuery(query.id, 'Bekor');
    await sendTelegramMessage(chatId, 'Uzish bekor qilindi.');
    return;
  }

  const connection = await findActiveByTelegramUserId(String(query.from.id));
  if (!connection) {
    await answerTelegramCallbackQuery(query.id, 'Ulanmagan');
    await sendTelegramMessage(chatId, 'Telegram allaqachon ulanmagan.');
    return;
  }

  await unlinkConnection(connection.identityId);
  await answerTelegramCallbackQuery(query.id, 'Uzildi');
  await sendTelegramMessage(chatId, '✅ Telegram hisobi uzildi.');
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const text = message.text;
  if (!text) return;
  const parsed = parseBotCommand(text);
  if (!parsed) return;

  const chatId = String(message.chat.id);
  switch (parsed.command) {
    case 'start':
      await handleStart(message, parsed.arg);
      break;
    case 'help':
      await handleHelp(chatId);
      break;
    case 'settings':
      await handleSettings(message);
      break;
    case 'accounts':
      await handleAccountsCommand(message);
      break;
    case 'app':
      await handleApp(chatId);
      break;
    case 'unlink':
      await handleUnlinkPrompt(message);
      break;
    default:
      break;
  }
}

async function handleCallback(query: TelegramCallbackQuery): Promise<void> {
  const data = query.data ?? '';
  if (data.startsWith(TELEGRAM_CB_LINK_OK)) {
    await handleLinkConfirm(query, data.slice(TELEGRAM_CB_LINK_OK.length), true);
    return;
  }
  if (data.startsWith(TELEGRAM_CB_LINK_NO)) {
    await handleLinkConfirm(query, data.slice(TELEGRAM_CB_LINK_NO.length), false);
    return;
  }
  if (data === TELEGRAM_CB_UNLINK_OK) {
    await handleUnlinkConfirm(query, true);
    return;
  }
  if (data === TELEGRAM_CB_UNLINK_NO) {
    await handleUnlinkConfirm(query, false);
    return;
  }
  if (isTelegramAccountsCallback(data)) {
    await handleAccountsCallback(query, data);
    return;
  }
  if (data.startsWith(TELEGRAM_CB_MENU)) {
    const slug = data.slice(TELEGRAM_CB_MENU.length).trim() || 'welcome';
    const chatId = query.message ? String(query.message.chat.id) : String(query.from.id);
    await answerTelegramCallbackQuery(query.id);
    await sendMenuScreen(chatId, slug);
    return;
  }
  if (data === 'tg:help') {
    const chatId = query.message?.chat.id;
    if (chatId != null) {
      await answerTelegramCallbackQuery(query.id);
      await handleHelp(String(chatId));
    }
  }
}

/**
 * Process a Telegram update (commands + callback buttons).
 * Callers must catch errors — this may throw on unexpected DB failures.
 */
export async function handleTelegramUpdate(
  update: TelegramUpdate,
  _log?: TelegramLogSink,
): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }
  if (update.message) {
    await handleMessage(update.message);
  }
}
