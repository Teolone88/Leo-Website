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

document.documentElement.classList.add('js');

const gpuNotes = [...document.querySelectorAll('.gpu-note')];

async function noteWebGPU() {
  if (!gpuNotes.length) return;
  const missing = 'This browser does not offer WebGPU, which the Studio draws with. Open it in a current Chrome, Edge or Safari on a computer with a graphics card, or run the desktop Studio.';
  const noAdapter = 'This browser offers WebGPU but found no graphics adapter to use. It will not run on an old browser, an outdated version, or on some phones and tablets.';
  const ready = 'This browser can open Leo Studio. WebGPU is required, so an old browser, an outdated version, or some phones and tablets will not run it.';
  if (!('gpu' in navigator)) {
    document.documentElement.dataset.webgpu = 'missing';
    for (const note of gpuNotes) note.textContent = missing;
    return;
  }
  let adapter = null;
  try {
    adapter = await navigator.gpu.requestAdapter();
  } catch {
    adapter = null;
  }
  if (!adapter) {
    document.documentElement.dataset.webgpu = 'no-adapter';
    for (const note of gpuNotes) note.textContent = noAdapter;
    return;
  }
  document.documentElement.dataset.webgpu = 'ready';
  for (const note of gpuNotes) note.textContent = ready;
}

noteWebGPU();

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
