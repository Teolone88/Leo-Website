precision highp float;

in vec2 vUv;

uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uStep;

out vec4 fragColor;

void main() {
  vec2 base = (floor(gl_FragCoord.xy) + 0.5) * uTexel;
  vec4 best = texture(uState, base);
  float bestD = best.a > 0.5 ? dot((base - best.rg) * uResolution, (base - best.rg) * uResolution) : 1e10;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = base + vec2(float(x), float(y)) * uStep * uTexel;
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;
      vec4 s = texture(uState, uv);
      if (s.a < 0.5) continue;
      vec2 delta = (base - s.rg) * uResolution;
      float d = dot(delta, delta);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
  }

  fragColor = best;
}
