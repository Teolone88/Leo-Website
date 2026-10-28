import * as THREE from 'three';
import quadVert from '../shaders/quad.vert.glsl?raw';
import seedFrag from '../shaders/seed.frag.glsl?raw';
import jfaFrag from '../shaders/jfa.frag.glsl?raw';
import compositeFrag from '../shaders/composite.frag.glsl?raw';
import ribbonVert from '../shaders/ribbon.vert.glsl?raw';
import ribbonFrag from '../shaders/ribbon.frag.glsl?raw';
import { createRibbonGeometry, writeRibbon } from './ribbon.js';

function makeVectors(count) {
  return Array.from({ length: count }, () => new THREE.Vector2());
}

function targetOptions() {
  return {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
}

function glsl(options) {
  const material = new THREE.RawShaderMaterial(options);
  material.glslVersion = THREE.GLSL3;
  return material;
}

export function createHeroField(canvas, readout) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
  } catch (error) {
    readout.textContent = 'WebGL unavailable. The drawing stays in the copy.';
    canvas.closest('.hero')?.classList.add('is-flat');
    return { stop() {}, setReduced() {}, resize() {} };
  }

  const gl = renderer.getContext();
  if (!renderer.capabilities.isWebGL2) {
    readout.textContent = 'This browser has no WebGL2. The page still reads without the field.';
    canvas.closest('.hero')?.classList.add('is-flat');
    renderer.dispose();
    return { stop() {}, setReduced() {}, resize() {} };
  }

  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x090a08, 1);
  renderer.autoClear = false;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passScene = new THREE.Scene();
  const viewScene = new THREE.Scene();

  const a = makeVectors(8);
  const b = makeVectors(6);
  const c = makeVectors(5);

  const seedMat = glsl({
    vertexShader: quadVert,
    fragmentShader: seedFrag,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uA: { value: a },
      uB: { value: b },
      uC: { value: c },
      uAspect: { value: 1 },
      uSeedRadius: { value: 0.02 },
    },
  });

  const jfaMat = glsl({
    vertexShader: quadVert,
    fragmentShader: jfaFrag,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uState: { value: null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uStep: { value: 1 },
    },
  });

  const compositeMat = glsl({
    vertexShader: quadVert,
    fragmentShader: compositeFrag,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uField: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uWash: { value: 0.72 },
    },
  });

  const ribbonMat = glsl({
    vertexShader: ribbonVert,
    fragmentShader: ribbonFrag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uWidthPx: { value: 4 },
      uTime: { value: 0 },
    },
  });

  const passQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), seedMat);
  passQuad.frustumCulled = false;
  passScene.add(passQuad);

  const viewQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMat);
  viewQuad.frustumCulled = false;
  viewQuad.renderOrder = 0;
  viewScene.add(viewQuad);

  const ribbon = new THREE.Mesh(createRibbonGeometry(), ribbonMat);
  ribbon.frustumCulled = false;
  ribbon.renderOrder = 1;
  viewScene.add(ribbon);

  let rtA = null;
  let rtB = null;
  let fieldW = 0;
  let fieldH = 0;
  let cssW = 1;
  let cssH = 1;
  let reduced = false;
  let running = true;
  let visible = true;
  let raf = 0;
  const pointer = new THREE.Vector2(0.72, 0.46);
  const pointerTarget = new THREE.Vector2(0.78, 0.52);
  let seenPointer = false;
  const focus = new THREE.Vector2(0.7, 0.5);
  const version = gl.getParameter(gl.VERSION) || 'WebGL 2.0';
  const shading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || 'GLSL ES 3.00';

  function allocTargets(w, h) {
    if (rtA) rtA.dispose();
    if (rtB) rtB.dispose();
    rtA = new THREE.WebGLRenderTarget(w, h, targetOptions());
    rtB = new THREE.WebGLRenderTarget(w, h, targetOptions());
    fieldW = w;
    fieldH = h;
    jfaMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    jfaMat.uniforms.uResolution.value.set(w, h);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    const narrow = cssW < 800;
    const dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.25 : 1.6);
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(cssW * dpr), Math.round(cssH * dpr), false);
    const draw = renderer.getDrawingBufferSize(new THREE.Vector2());
    compositeMat.uniforms.uResolution.value.copy(draw);
    ribbonMat.uniforms.uResolution.value.copy(draw);
    ribbonMat.uniforms.uWidthPx.value = 3.4 * dpr;
    compositeMat.uniforms.uWash.value = narrow ? 0.18 : 0.78;

    const longest = narrow ? 220 : 288;
    const aspect = cssW / cssH;
    let fw;
    let fh;
    if (aspect >= 1) {
      fw = longest;
      fh = Math.max(48, Math.round(longest / aspect));
    } else {
      fh = longest;
      fw = Math.max(48, Math.round(longest * aspect));
    }
    if (fw !== fieldW || fh !== fieldH) allocTargets(fw, fh);
    focus.set(narrow ? 0.5 : 0.7, narrow ? 0.58 : 0.5);
    const es = /opengl es/i.test(`${version} ${shading}`) ? 'OpenGL ES 3.0' : 'WebGL2';
    readout.textContent = `${es} · GLSL ES 3.00 · JFA ${fw}×${fh}`;
  }

  function writePoint(target, x, y) {
    target.set(THREE.MathUtils.clamp(x, 0.03, 0.97), THREE.MathUtils.clamp(y, 0.03, 0.97));
  }

  function updatePoints(time) {
    if (!seenPointer) {
      pointerTarget.set(
        focus.x + Math.cos(time * 0.23) * 0.16,
        focus.y + Math.sin(time * 0.19) * 0.1,
      );
    }
    pointer.lerp(pointerTarget, reduced ? 1 : 0.07);

    const s = cssW < 800 ? 0.15 : 0.17;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + time * 0.13;
      const k = 1 + 0.05 * Math.sin(time * 0.8 + i * 1.2);
      writePoint(a[i], focus.x + Math.cos(ang) * s * 1.2 * k, focus.y + Math.sin(ang) * s * 0.72 * k);
    }

    const originX = focus.x - 0.2;
    const originY = focus.y - 0.16;
    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      const arc = Math.sin(u * Math.PI) * 0.07 * Math.sin(time * 0.7);
      writePoint(
        b[i],
        originX + (pointer.x - originX) * u,
        originY + (pointer.y - originY) * u + arc,
      );
    }

    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      const ang = time * 0.08;
      writePoint(
        c[i],
        focus.x - 0.02 + Math.cos(ang + u * 1.15) * (0.04 + u * 0.24),
        focus.y + 0.18 + Math.sin(ang * 0.7 + u * 2.2) * (0.03 + u * 0.12),
      );
    }
  }

  function strokesFromPoints(drawW, drawH) {
    const map = (list) => list.map((p) => ({ x: p.x * drawW, y: (1 - p.y) * drawH }));
    return [
      { pts: map(a), closed: true, salt: 0.05 },
      { pts: map(b), closed: false, salt: 0.37 },
      { pts: map(c), closed: false, salt: 0.71 },
    ];
  }

  function jumpSteps(maxDim) {
    let pot = 1;
    while (pot < maxDim) pot *= 2;
    const steps = [];
    for (let step = pot / 2; step >= 1; step /= 2) steps.push(step);
    steps.push(2, 1);
    return steps;
  }

  function render(time) {
    if (!rtA || !rtB) return;
    updatePoints(time);
    const aspect = fieldW / fieldH;
    seedMat.uniforms.uAspect.value = aspect;
    seedMat.uniforms.uSeedRadius.value = 3.2 / fieldH;

    const draw = renderer.getDrawingBufferSize(new THREE.Vector2());
    writeRibbon(ribbon.geometry, strokesFromPoints(draw.x, draw.y));

    renderer.setRenderTarget(rtA);
    renderer.clear();
    passQuad.material = seedMat;
    renderer.render(passScene, camera);

    let src = rtA;
    let dst = rtB;
    passQuad.material = jfaMat;
    for (const step of jumpSteps(Math.max(fieldW, fieldH))) {
      jfaMat.uniforms.uState.value = src.texture;
      jfaMat.uniforms.uStep.value = step;
      renderer.setRenderTarget(dst);
      renderer.render(passScene, camera);
      const swap = src;
      src = dst;
      dst = swap;
    }

    compositeMat.uniforms.uField.value = src.texture;
    compositeMat.uniforms.uTime.value = time;
    ribbonMat.uniforms.uTime.value = time;
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(viewScene, camera);
  }

  function frame(now) {
    if (!running) return;
    if (visible) {
      const t = reduced ? 1.4 : now * 0.001;
      render(t);
    }
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  function onPointer(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    seenPointer = true;
    pointerTarget.set(
      THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92),
      THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height, 0.08, 0.92),
    );
  }

  const hero = canvas.closest('.hero');
  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  }, { threshold: 0.02 });
  if (hero) observer.observe(hero);
  hero?.addEventListener('pointermove', onPointer);

  resize();
  render(0.2);
  raf = requestAnimationFrame(frame);

  return {
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
      hero?.removeEventListener('pointermove', onPointer);
      observer.disconnect();
      rtA?.dispose();
      rtB?.dispose();
      seedMat.dispose();
      jfaMat.dispose();
      compositeMat.dispose();
      ribbonMat.dispose();
      passQuad.geometry.dispose();
      viewQuad.geometry.dispose();
      ribbon.geometry.dispose();
      renderer.dispose();
    },
  };
}
