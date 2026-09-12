let app;

async function getApp() {
  if (!app) {
    const { createApp } = await import('../server/dist/app.js');
    app = createApp();
  }
  return app;
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
