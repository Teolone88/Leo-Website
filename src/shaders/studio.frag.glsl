precision highp float;

in vec2 vUv;

uniform float uTime;
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

float picture(vec2 p) {
  float d = sdRoundBox(p - vec2(-0.05, 0.02), vec2(0.22, 0.16), 0.03);
  d = min(d, sdCircle(p - vec2(0.28, 0.12), 0.11));
  d = min(d, sdSegment(p, vec2(-0.42, -0.18), vec2(0.18, 0.22)) - 0.018);
  d = min(d, sdSegment(p, vec2(-0.2, -0.28), vec2(0.4, -0.12)) - 0.012);
  return d;
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = (vUv - 0.5) * aspect;
  float sweep = 0.5 + 0.28 * sin(uTime * 0.45);

  vec3 paper = vec3(0.045, 0.048, 0.038);
  vec3 signal = vec3(0.839, 1.0, 0.247);
  vec3 col;

  if (vUv.x < sweep) {
    vec2 q = floor(p * 34.0) / 34.0;
    float d = picture(q);
    float grain = fract(sin(dot(floor(p * 34.0) + 8.0, vec2(27.1, 91.7))) * 43758.5);
    float tone = smoothstep(0.05, -0.1, d);
    col = mix(vec3(0.18, 0.16, 0.12), vec3(0.95, 0.88, 0.62), tone);
    col *= 0.86 + 0.22 * grain;
  } else {
    float d = picture(p);
    float w = max(fwidth(d) * 1.4, 0.002);
    float fill = smoothstep(0.004, -0.01, d);
    float stroke = smoothstep(w, 0.0, abs(d) - 0.006);
    float offset = smoothstep(0.012, 0.0, abs(d - 0.045));
    col = paper;
    col += vec3(0.16, 0.2, 0.1) * fill;
    col += signal * offset * 0.45;
    col += vec3(0.96, 1.0, 0.88) * stroke;
  }

  float cut = smoothstep(0.012, 0.0, abs(vUv.x - sweep));
  col = mix(col, signal, cut);

  col = min(max(col, 0.0), vec3(1.0));
  fragColor = vec4(pow(col, vec3(2.2)), 1.0);
}
