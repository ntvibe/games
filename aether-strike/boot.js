import './mobile-performance.js';
import { installVisualPolish } from './visual-polish.js';

installVisualPolish();

try {
  await import('./game.js');
} catch (error) {
  console.error('Aether Strike failed to boot', error);
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:28px;background:#030712;color:#fff;font:600 14px/1.5 system-ui;text-align:center;z-index:99';
  el.textContent = 'Aether Strike could not start. Reload the page or try a newer browser.';
  document.body.appendChild(el);
}
