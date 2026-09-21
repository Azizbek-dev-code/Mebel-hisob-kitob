let app;
let appReady;

async function getApp() {
  if (!appReady) {
    appReady = (async () => {
      const { createApp } = await import('../server/dist/app.js');
      const expressApp = createApp();
      const { hydrateTelegramRuntimeFromDb } = await import(
        '../server/dist/modules/telegram/telegram.admin.service.js'
      );
      await hydrateTelegramRuntimeFromDb();
      const { ensureTelegramWebhookOnce } = await import(
        '../server/dist/modules/telegram/telegram.service.js'
      );
      void ensureTelegramWebhookOnce();
      app = expressApp;
      return expressApp;
    })();
  }
  return appReady;
}

export default async function handler(req, res) {
  const expressApp = await getApp();
  return new Promise((resolve, reject) => {
    expressApp(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
