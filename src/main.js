import { App } from './core/App.js';
import { Diorama } from './world/Diorama.js';

const app = new App(document.body);
new Diorama(app);
app.Start();

// Dev-only handle for inspecting camera angles from the browser console.
if (import.meta.env.DEV) window.__app = app;
