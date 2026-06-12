import './style.css';
import { Game } from './game/Game';
import { preventBrowserZoom } from './input/preventBrowserZoom';
import { registerSW } from 'virtual:pwa-register';

async function main(): Promise<void> {
  preventBrowserZoom();
  const canvas = document.querySelector('#game-canvas') as HTMLCanvasElement;
  const uiRoot = document.querySelector('#ui-root') as HTMLElement;

  const game = new Game(canvas, uiRoot);
  await game.init();
  game.start();

  registerSW({ immediate: true });
}

main().catch(console.error);
