import * as THREE from 'three';
import quadVert from '../shaders/quad.vert.glsl?raw';
import modesFrag from '../shaders/modes.frag.glsl?raw';
import studioFrag from '../shaders/studio.frag.glsl?raw';

function glsl(options) {
  const material = new THREE.RawShaderMaterial(options);
  material.glslVersion = THREE.GLSL3;
  return material;
}

function mount(canvas, fragmentShader, extraUniforms) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    canvas.closest('.plate')?.classList.add('is-flat');
    return null;
  }

  if (!renderer.capabilities.isWebGL2) {
    canvas.closest('.plate')?.classList.add('is-flat');
    renderer.dispose();
    return null;
  }

  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x090a08, 1);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    ...extraUniforms,
  };
  const material = glsl({
    vertexShader: quadVert,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    uniforms,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);

  let reduced = false;
  let running = true;
  let visible = true;
  let raf = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const narrow = window.innerWidth < 800;
    const dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1 : 1.35);
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(w * dpr), Math.round(h * dpr), false);
    uniforms.uResolution.value.copy(renderer.getDrawingBufferSize(new THREE.Vector2()));
  }

  function render(time) {
    uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }

  function frame(now) {
    if (!running) return;
    if (visible) render(reduced ? 0.8 : now * 0.001);
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  }, { threshold: 0.05 });
  observer.observe(canvas);

  resize();
  render(0.4);
  raf = requestAnimationFrame(frame);

  return {
    uniforms,
    resize,
    setReduced(next) {
      reduced = next;
      if (!reduced && running) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    },
  };
}

const MODE_COPY = {
  cpu: 'CPU. The field is sampled on a coarse lattice, the way a processor walks it.',
  compute: 'Compute. A smooth flood. The engine runs this class of work in GPU compute shaders. This view is the same distance field in a fragment shader.',
  raster: 'Raster. Crisp coverage from a vertex and fragment pipeline. Fill drops out. The stroke stays.',
};

export function createEnginePanel(canvas) {
  const view = mount(canvas, modesFrag, { uMode: { value: 1 } });
  const caption = document.getElementById('engine-caption');
  const buttons = [...document.querySelectorAll('[data-pipeline]')];
  if (!view) {
    if (caption) caption.textContent = 'WebGL2 is unavailable here. The three pipelines are still listed beside this plate.';
    return { stop() {}, setReduced() {}, resize() {} };
  }

  function setMode(name) {
    const mode = name === 'cpu' ? 0 : name === 'raster' ? 2 : 1;
    view.uniforms.uMode.value = mode;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', button.dataset.pipeline === name ? 'true' : 'false');
    }
    if (caption) caption.textContent = MODE_COPY[name] || MODE_COPY.compute;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => setMode(button.dataset.pipeline));
  }
  setMode('compute');

  return view;
}

export function createStudioPanel(canvas) {
  return mount(canvas, studioFrag, {}) || { stop() {}, setReduced() {}, resize() {} };
}
