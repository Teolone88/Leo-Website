import '@fontsource/syne/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/400-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import { createHeroField } from './gl/field.js';
import { createEnginePanel, createStudioPanel } from './gl/panels.js';

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = navigator.connection && navigator.connection.saveData;

document.documentElement.classList.add('js');

const nav = document.getElementById('nav');
const navToggle = document.getElementById('nav-toggle');

navToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  navToggle.textContent = open ? 'Close' : 'Menu';
});

nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    nav.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle.textContent = 'Menu';
  }
});

const heroCanvas = document.getElementById('hero-canvas');
const engineCanvas = document.getElementById('engine-canvas');
const studioCanvas = document.getElementById('studio-canvas');
const readout = document.getElementById('readout');

const views = [];

if (heroCanvas && readout) {
  views.push(createHeroField(heroCanvas, readout));
}
if (engineCanvas && !saveData) {
  views.push(createEnginePanel(engineCanvas));
} else if (engineCanvas && saveData) {
  engineCanvas.closest('.plate')?.classList.add('is-flat');
}
if (studioCanvas && !saveData) {
  views.push(createStudioPanel(studioCanvas));
} else if (studioCanvas) {
  studioCanvas.closest('.plate')?.classList.add('is-flat');
}

function applyMotion() {
  const reduced = reducedQuery.matches || saveData;
  document.documentElement.classList.toggle('is-reduced', reduced);
  for (const view of views) view.setReduced?.(reduced);
}

applyMotion();
reducedQuery.addEventListener?.('change', applyMotion);

const resize = () => {
  for (const view of views) view.resize?.();
};
window.addEventListener('resize', resize, { passive: true });

document.addEventListener('visibilitychange', () => {
  const reduced = document.hidden || reducedQuery.matches || saveData;
  for (const view of views) view.setReduced?.(reduced || reducedQuery.matches || saveData);
  if (!document.hidden) applyMotion();
});
