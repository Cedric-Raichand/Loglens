import { createApp } from './app.js';

const port = Number(process.env.PORT) || 5000;
createApp().listen(port, () => {
  console.log(`LogLens API listening on http://localhost:${port}`);
});