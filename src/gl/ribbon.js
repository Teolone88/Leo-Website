import * as THREE from 'three';

const MAX_VERTS = 512;
const MAX_INDICES = 1536;

export function createRibbonGeometry() {
  const geo = new THREE.BufferGeometry();
  const center = new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 2), 2);
  const normal = new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 2), 2);
  const side = new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1);
  const along = new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1);
  const salt = new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1);
  const closed = new THREE.BufferAttribute(new Float32Array(MAX_VERTS), 1);
  const position = new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3);
  const index = new THREE.BufferAttribute(new Uint16Array(MAX_INDICES), 1);

  for (const attr of [center, normal, side, along, salt, closed, position, index]) {
    attr.setUsage(THREE.DynamicDrawUsage);
  }

  geo.setAttribute('aCenter', center);
  geo.setAttribute('aNormal', normal);
  geo.setAttribute('aSide', side);
  geo.setAttribute('aAlong', along);
  geo.setAttribute('aSalt', salt);
  geo.setAttribute('aClosed', closed);
  geo.setAttribute('position', position);
  geo.setIndex(index);
  geo.setDrawRange(0, 0);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
  return geo;
}

export function writeRibbon(geo, strokes) {
  const center = geo.getAttribute('aCenter');
  const normal = geo.getAttribute('aNormal');
  const side = geo.getAttribute('aSide');
  const along = geo.getAttribute('aAlong');
  const salt = geo.getAttribute('aSalt');
  const closedAttr = geo.getAttribute('aClosed');
  const position = geo.getAttribute('position');
  const index = geo.getIndex();

  let v = 0;
  let iCount = 0;

  for (const stroke of strokes) {
    const src = stroke.pts;
    if (!src || src.length < 2) continue;
    const pts = stroke.closed ? src.concat([src[0]]) : src.slice();
    const n = pts.length;
    if (v + n * 2 > MAX_VERTS || iCount + (n - 1) * 6 > MAX_INDICES) break;

    const normals = [];
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(n - 1, i + 1);
      let tx = pts[i1].x - pts[i0].x;
      let ty = pts[i1].y - pts[i0].y;
      const len = Math.hypot(tx, ty) || 1;
      normals.push({ x: -ty / len, y: tx / len });
    }
    if (stroke.closed) normals[n - 1] = normals[0];

    const base = v;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      for (const s of [-1, 1]) {
        const o = v * 2;
        center.array[o] = pts[i].x;
        center.array[o + 1] = pts[i].y;
        normal.array[o] = normals[i].x;
        normal.array[o + 1] = normals[i].y;
        side.array[v] = s;
        along.array[v] = t;
        salt.array[v] = stroke.salt;
        closedAttr.array[v] = stroke.closed ? 1 : 0;
        position.array[v * 3] = pts[i].x;
        position.array[v * 3 + 1] = pts[i].y;
        position.array[v * 3 + 2] = 0;
        v += 1;
      }
    }

    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      index.array[iCount++] = a;
      index.array[iCount++] = a + 1;
      index.array[iCount++] = a + 2;
      index.array[iCount++] = a + 1;
      index.array[iCount++] = a + 3;
      index.array[iCount++] = a + 2;
    }
  }

  center.needsUpdate = true;
  normal.needsUpdate = true;
  side.needsUpdate = true;
  along.needsUpdate = true;
  salt.needsUpdate = true;
  closedAttr.needsUpdate = true;
  position.needsUpdate = true;
  index.needsUpdate = true;
  geo.setDrawRange(0, iCount);
}
