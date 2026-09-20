import {
  TelegramMediaKind,
  TelegramMenuButtonAction,
  type TelegramMenuButtonDto,
  type TelegramMenuScreenDto,
  type TelegramStartButtonDto,
  type TelegramStartMessageDto,
  type UpdateTelegramStartMessageRequest,
  type UpsertTelegramMenuScreenRequest,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { getPublicAppUrl } from './telegram.config.js';
import { sendTelegramContent, type TelegramSendableContent } from './telegram.content.js';
import { DEFAULT_TELEGRAM_START_TEXT, TELEGRAM_CB_MENU } from './telegram.types.js';

const START_MESSAGE_ID = 'default';
const WELCOME_SLUG = 'welcome';

type StoredStartButton = {
  text?: unknown;
  action?: unknown;
  url?: unknown;
  targetSlug?: unknown;
};

function parseStartButtons(value: Prisma.JsonValue | null | undefined): TelegramStartButtonDto[] {
  if (!Array.isArray(value)) return [];
  const buttons: TelegramStartButtonDto[] = [];
  for (const raw of value as StoredStartButton[]) {
    const text = typeof raw?.text === 'string' ? raw.text.trim() : '';
    if (!text) continue;
    const action =
      raw?.action === TelegramMenuButtonAction.MENU
        ? TelegramMenuButtonAction.MENU
        : raw?.action === TelegramMenuButtonAction.BACK
          ? TelegramMenuButtonAction.BACK
          : TelegramMenuButtonAction.URL;
    buttons.push({
      text,
      action,
      url: typeof raw?.url === 'string' ? raw.url : null,
      targetSlug: typeof raw?.targetSlug === 'string' ? raw.targetSlug : null,
    });
  }
  return buttons;
}

function defaultStartButtons(): TelegramStartButtonDto[] {
  return [
    {
      text: '🚀 Dasturga kirish',
      action: TelegramMenuButtonAction.URL,
      url: getPublicAppUrl(),
    },
    {
      text: '📚 Batafsil',
      action: TelegramMenuButtonAction.MENU,
      targetSlug: 'details',
    },
  ];
}

type DefaultMenuScreen = {
  slug: string;
  title: string;
  text: string;
  categoryKey: string | null;
  sortOrder: number;
  buttons: Array<{
    text: string;
    action: TelegramMenuButtonAction;
    url?: string | null;
    targetSlug?: string | null;
    sortOrder: number;
  }>;
};

function appUrl(): string {
  return getPublicAppUrl();
}

export const DEFAULT_TELEGRAM_MENU_SCREENS: DefaultMenuScreen[] = [
  {
    slug: 'details',
    title: '📚 Batafsil',
    text:
      '📚 <b>Balancy Space</b>\n\n' +
      '🏠 <b>SHAXSIY HISOB</b>\n\n' +
      'Daromad, xarajat, qarz, budjet, maqsadlar va moliyaviy holatingizni boshqaring.\n\n' +
      '💼 <b>BUSINESS HISOB</b>\n\n' +
      'Biznesingizni boshqaring, sotuv va xarajatlarni nazorat qiling.\n\n' +
      'Business yo‘nalishlari:\n\n' +
      '🪑 Mebel do‘koni\n' +
      '🧶 Gilam do‘koni\n' +
      '📦 Boshqa bizneslar',
    categoryKey: null,
    sortOrder: 10,
    buttons: [
      { text: '🏠 Shaxsiy hisob', action: TelegramMenuButtonAction.MENU, targetSlug: 'personal', sortOrder: 10 },
      { text: '💼 Business hisob', action: TelegramMenuButtonAction.MENU, targetSlug: 'business', sortOrder: 20 },
      { text: '🌐 Dasturga kirish', action: TelegramMenuButtonAction.URL, url: appUrl(), sortOrder: 30 },
      { text: '⬅️ Orqaga', action: TelegramMenuButtonAction.BACK, targetSlug: WELCOME_SLUG, sortOrder: 40 },
    ],
  },
  {
    slug: 'personal',
    title: '🏠 Shaxsiy hisob',
    text:
      '🏠 <b>Shaxsiy hisob</b>\n\n' +
      'Daromad, xarajat, qarz, budjet, maqsad va kundalik moliyangizni boshqaring.',
    categoryKey: 'personal',
    sortOrder: 20,
    buttons: [
      { text: '🚀 Dasturga kirish', action: TelegramMenuButtonAction.URL, url: `${appUrl()}/personal/dashboard`, sortOrder: 10 },
      { text: '⬅️ Orqaga', action: TelegramMenuButtonAction.BACK, targetSlug: 'details', sortOrder: 20 },
    ],
  },
  {
    slug: 'business',
    title: '💼 Business',
    text: '💼 <b>Business</b>\n\nBiznesingizni bir joyda boshqaring.',
    categoryKey: 'business',
    sortOrder: 30,
    buttons: [
      { text: '🪑 Mebel do‘koni', action: TelegramMenuButtonAction.MENU, targetSlug: 'furniture', sortOrder: 10 },
      { text: '🧶 Gilam do‘koni', action: TelegramMenuButtonAction.MENU, targetSlug: 'carpet', sortOrder: 20 },
      { text: '📦 Boshqa biznes', action: TelegramMenuButtonAction.MENU, targetSlug: 'other-business', sortOrder: 30 },
      { text: '⬅️ Orqaga', action: TelegramMenuButtonAction.BACK, targetSlug: 'details', sortOrder: 40 },
    ],
  },
  {
    slug: 'furniture',
    title: '🪑 Mebel do‘koni',
    text:
      '🪑 <b>MEBEL DO‘KONI</b>\n\n' +
      'Sotuvlar, ombor, mijozlar, qarzdorlik, xarajatlar, xodimlar, yetkazib berish va boshqa jarayonlarni boshqaring.',
    categoryKey: 'FURNITURE',
    sortOrder: 40,
    buttons: [
      { text: '🚀 Dasturga kirish', action: TelegramMenuButtonAction.URL, url: appUrl(), sortOrder: 10 },
      { text: '⬅️ Orqaga', action: TelegramMenuButtonAction.BACK, targetSlug: 'business', sortOrder: 20 },
    ],
  },
  {
    slug: 'carpet',
    title: '🧶 Gilam do‘koni',
    text:
      '🧶 <b>GILAM DO‘KONI</b>\n\n' +
      'Sotuvlar, ombor, mijozlar, qarzdorlik, xarajatlar, xodimlar, yetkazib berish va boshqa jarayonlarni boshqaring.',
    categoryKey: 'CARPET',
    sortOrder: 50,
    buttons: [
      { text: '🚀 Dasturga kirish', action: TelegramMenuButtonAction.URL, url: appUrl(), sortOrder: 10 },
      { text: '⬅️ Orqaga', action: TelegramMenuButtonAction.BACK, targetSlug: 'business', sortOrder: 20 },
    ],
  },
  {
    slug: 'other-business',
    title: '📦 Boshqa biznes',
    text:
      '📦 <b>BOSHQA BIZNES</b>\n\n' +
      'Sotuv, ombor, xarajat va hisob-kitoblarni bitta joyda boshqaring. Yangi biznes turlari admin paneldan qo‘shilishi mumkin.',
    categoryKey: 'OTHER',
    sortOrder: 60,
    buttons: [
      { text: '🚀 Dasturga kirish', action: TelegramMenuButtonAction.URL, url: appUrl(), sortOrder: 10 },
      { text: '⬅️ Orqaga', action: TelegramMenuButtonAction.BACK, targetSlug: 'business', sortOrder: 20 },
    ],
  },
];

export async function ensureDefaultMenuScreens(): Promise<void> {
  const existing = await prisma.telegramMenuScreen.findMany({ select: { slug: true } });
  const have = new Set(existing.map((row) => row.slug));
  for (const screen of DEFAULT_TELEGRAM_MENU_SCREENS) {
    if (have.has(screen.slug)) continue;
    await prisma.telegramMenuScreen.create({
      data: {
        slug: screen.slug,
        title: screen.title,
        text: screen.text,
        categoryKey: screen.categoryKey,
        sortOrder: screen.sortOrder,
        isActive: true,
        buttons: {
          create: screen.buttons.map((button) => ({
            text: button.text,
            action: button.action,
            url: button.url ?? null,
            targetSlug: button.targetSlug ?? null,
            sortOrder: button.sortOrder,
            isActive: true,
          })),
        },
      },
    });
  }
}

function buttonsToSendable(
  buttons: TelegramStartButtonDto[],
): TelegramSendableContent['buttons'] {
  return buttons
    .filter((button) => button.text.trim())
    .map((button) => {
      if (button.action === TelegramMenuButtonAction.URL && button.url) {
        return { text: button.text, url: button.url };
      }
      const slug =
        button.action === TelegramMenuButtonAction.BACK
          ? button.targetSlug || WELCOME_SLUG
          : button.targetSlug;
      if (!slug) return { text: button.text, url: getPublicAppUrl() };
      return { text: button.text, callbackData: `${TELEGRAM_CB_MENU}${slug}` };
    });
}

export function defaultStartContent(): TelegramSendableContent {
  const buttons = defaultStartButtons();
  const urlButton = buttons.find((button) => button.action === TelegramMenuButtonAction.URL);
  return {
    text: DEFAULT_TELEGRAM_START_TEXT,
    imageUrl: null,
    buttonText: urlButton?.text ?? null,
    buttonUrl: urlButton?.url ?? null,
    buttons: buttonsToSendable(buttons),
  };
}

export async function getActiveStartMessage(): Promise<TelegramSendableContent> {
  const row = await prisma.telegramStartMessage.findUnique({ where: { id: START_MESSAGE_ID } });
  if (!row || !row.isActive) return defaultStartContent();
  const parsed = parseStartButtons(row.buttons);
  const buttons = parsed.length ? parsed : defaultStartButtons();
  const urlButton =
    buttons.find((button) => button.action === TelegramMenuButtonAction.URL) ??
    (row.buttonText && row.buttonUrl
      ? {
          text: row.buttonText,
          action: TelegramMenuButtonAction.URL,
          url: row.buttonUrl,
        }
      : null);
  return {
    text: row.text,
    imageUrl: row.imageUrl,
    buttonText: urlButton?.text ?? row.buttonText,
    buttonUrl: urlButton?.url ?? row.buttonUrl,
    buttons: buttonsToSendable(buttons),
  };
}

export function toStartMessageDto(row: {
  id: string;
  text: string;
  mediaKind: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  buttons: Prisma.JsonValue;
  updatedAt: Date;
}): TelegramStartMessageDto {
  const buttons = parseStartButtons(row.buttons);
  return {
    id: row.id,
    text: row.text,
    mediaKind: (row.mediaKind as TelegramStartMessageDto['mediaKind']) || TelegramMediaKind.NONE,
    imageUrl: row.imageUrl,
    buttonText: row.buttonText,
    buttonUrl: row.buttonUrl,
    buttons: buttons.length
      ? buttons
      : row.buttonText && row.buttonUrl
        ? [
            {
              text: row.buttonText,
              action: TelegramMenuButtonAction.URL,
              url: row.buttonUrl,
            },
          ]
        : defaultStartButtons(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function startButtonsForSave(
  body: UpdateTelegramStartMessageRequest,
): TelegramStartButtonDto[] {
  if (body.buttons?.length) return body.buttons;
  if (body.buttonText && body.buttonUrl) {
    return [
      {
        text: body.buttonText,
        action: TelegramMenuButtonAction.URL,
        url: body.buttonUrl,
      },
      {
        text: '📚 Batafsil',
        action: TelegramMenuButtonAction.MENU,
        targetSlug: 'details',
      },
    ];
  }
  return defaultStartButtons();
}

function toMenuButtonDto(row: {
  id: string;
  text: string;
  action: TelegramMenuButtonAction;
  url: string | null;
  targetSlug: string | null;
  sortOrder: number;
  isActive: boolean;
}): TelegramMenuButtonDto {
  return {
    id: row.id,
    text: row.text,
    action: row.action,
    url: row.url,
    targetSlug: row.targetSlug,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function toMenuScreenDto(row: {
  id: string;
  slug: string;
  title: string;
  text: string;
  mediaKind: string;
  imageUrl: string | null;
  categoryKey: string | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
  buttons: Array<{
    id: string;
    text: string;
    action: TelegramMenuButtonAction;
    url: string | null;
    targetSlug: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
}): TelegramMenuScreenDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    text: row.text,
    mediaKind: (row.mediaKind as TelegramMenuScreenDto['mediaKind']) || TelegramMediaKind.NONE,
    imageUrl: row.imageUrl,
    categoryKey: row.categoryKey,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
    buttons: [...row.buttons]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toMenuButtonDto),
  };
}

async function loadMenuScreen(slug: string): Promise<TelegramSendableContent | null> {
  if (slug === WELCOME_SLUG) return getActiveStartMessage();
  await ensureDefaultMenuScreens();
  const row = await prisma.telegramMenuScreen.findUnique({
    where: { slug },
    include: { buttons: true },
  });
  if (!row || !row.isActive) return null;
  const buttons = [...row.buttons]
    .filter((button) => button.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((button) => ({
      text: button.text,
      action: button.action,
      url: button.url,
      targetSlug: button.targetSlug,
    }));
  return {
    text: row.text,
    imageUrl: row.imageUrl,
    buttons: buttonsToSendable(buttons),
  };
}

export async function sendMenuScreen(chatId: string, slug: string): Promise<void> {
  const content = (await loadMenuScreen(slug)) ?? (await getActiveStartMessage());
  await sendTelegramContent(chatId, content);
}

export async function listMenuScreens(): Promise<TelegramMenuScreenDto[]> {
  await ensureDefaultMenuScreens();
  const rows = await prisma.telegramMenuScreen.findMany({
    include: { buttons: true },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map(toMenuScreenDto);
}

export async function upsertMenuScreen(
  slug: string,
  body: UpsertTelegramMenuScreenRequest,
): Promise<TelegramMenuScreenDto> {
  const imageUrl = body.imageUrl?.trim() || null;
  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.telegramMenuScreen.upsert({
      where: { slug },
      create: {
        slug,
        title: body.title.trim(),
        text: body.text.trim(),
        imageUrl,
        mediaKind: imageUrl ? TelegramMediaKind.IMAGE : TelegramMediaKind.NONE,
        categoryKey: body.categoryKey?.trim() || null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
      update: {
        title: body.title.trim(),
        text: body.text.trim(),
        imageUrl,
        mediaKind: imageUrl ? TelegramMediaKind.IMAGE : TelegramMediaKind.NONE,
        categoryKey: body.categoryKey?.trim() || null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await tx.telegramMenuButton.deleteMany({ where: { screenId: saved.id } });
    if (body.buttons.length) {
      await tx.telegramMenuButton.createMany({
        data: body.buttons.map((button, index) => ({
          screenId: saved.id,
          text: button.text.trim(),
          action: button.action,
          url: button.url?.trim() || null,
          targetSlug: button.targetSlug?.trim() || null,
          isActive: button.isActive ?? true,
          sortOrder: button.sortOrder ?? (index + 1) * 10,
        })),
      });
    }
    return tx.telegramMenuScreen.findUniqueOrThrow({
      where: { id: saved.id },
      include: { buttons: true },
    });
  });
  return toMenuScreenDto(row);
}

export { START_MESSAGE_ID, WELCOME_SLUG };
