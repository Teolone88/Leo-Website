precision highp float;

in vec2 vUv;

uniform float uTime;
uniform float uMode;
uniform vec2 uResolution;

out vec4 fragColor;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

float scene(vec2 p) {
  float d = sdRoundBox(p - vec2(0.16, 0.02), vec2(0.3, 0.16), 0.045);
  d = min(d, sdCircle(p - vec2(-0.28, 0.1), 0.13));
  d = min(d, sdSegment(p, vec2(-0.42, -0.24), vec2(0.46, -0.16)) - 0.02);
  d = min(d, sdSegment(p, vec2(-0.05, 0.28), vec2(0.22, -0.3)) - 0.012);
  return d;
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (vUv - 0.5) * aspect;

  float ang = uTime * 0.12;
  float c = cos(ang);
  float s = sin(ang);
  p = mat2(c, -s, s, c) * p;

  vec3 base = vec3(0.027, 0.031, 0.024);
  vec3 signal = vec3(0.839, 1.0, 0.247);
  vec3 col = base;

  if (uMode < 0.5) {
    vec2 q = (floor(p * 28.0 + 0.5)) / 28.0;
    float d = scene(q);
    float band = floor((-d) * 7.0) / 7.0;
    float ink = step(0.0, -d);
    col += vec3(0.16, 0.18, 0.11) * clamp(band, 0.0, 1.0);
    col += signal * ink * 0.28;
    col += vec3(0.95, 1.0, 0.85) * smoothstep(0.045, 0.0, abs(d));
    vec2 cell = abs(fract(p * 28.0) - 0.5);
    float lattice = 1.0 - smoothstep(0.42, 0.5, max(cell.x, cell.y));
    col += vec3(0.7, 0.74, 0.55) * lattice * 0.16;
  } else if (uMode < 1.5) {
    float d = scene(p);
    float height = exp(-max(d, 0.0) * 7.5);
    float inside = smoothstep(0.01, -0.02, d);
    vec3 normal = normalize(vec3(dFdx(height) * uResolution.x, dFdy(height) * uResolution.y, 0.38));
    float diff = clamp(dot(normal, normalize(vec3(-0.4, 0.55, 0.7))), 0.0, 1.0);
    float contour = smoothstep(0.08, 0.0, abs(fract(max(d, 0.0) * 9.0) - 0.5));
    col += vec3(0.12, 0.16, 0.1) * height;
    col += vec3(0.35, 0.4, 0.28) * diff * height;
    col += signal * contour * 0.55;
    col += signal * inside * 0.22;
    col += vec3(1.0) * pow(diff, 8.0) * height * 0.35;
  } else {
    float d = scene(p);
    float w = max(fwidth(d), 0.0025);
    float stroke = smoothstep(w * 1.6, 0.0, abs(d) - 0.004);
    float hair = smoothstep(w, 0.0, abs(abs(d) - 0.06) - 0.002);
    vec2 mesh = abs(fract(p * 18.0) - 0.5);
    float wire = 1.0 - smoothstep(0.46, 0.5, min(mesh.x, mesh.y));
    col += vec3(0.55, 0.58, 0.46) * wire * 0.14;
    col += signal * hair * 0.35;
    col += vec3(0.96, 1.0, 0.86) * stroke;
  }

  col = min(max(col, 0.0), vec3(1.0));
  fragColor = vec4(pow(col, vec3(2.2)), 1.0);
}
