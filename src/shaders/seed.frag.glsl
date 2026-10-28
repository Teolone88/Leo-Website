precision highp float;

in vec2 vUv;

uniform vec2 uA[8];
uniform vec2 uB[6];
uniform vec2 uC[5];
uniform float uAspect;
uniform float uSeedRadius;

out vec4 fragColor;

vec2 asp(vec2 uv) {
  return vec2(uv.x * uAspect, uv.y);
}

void consider(vec2 p, vec2 a, vec2 b, inout float best, inout vec2 seed) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  vec2 c = a + ba * h;
  float d = distance(p, c);
  if (d < best) {
    best = d;
    seed = c;
  }
}

void main() {
  vec2 p = asp(vUv);
  float best = 1e5;
  vec2 seed = vec2(0.0);

  for (int i = 0; i < 7; i++) {
    consider(p, asp(uA[i]), asp(uA[i + 1]), best, seed);
  }
  consider(p, asp(uA[7]), asp(uA[0]), best, seed);

  for (int i = 0; i < 5; i++) {
    consider(p, asp(uB[i]), asp(uB[i + 1]), best, seed);
  }

  for (int i = 0; i < 4; i++) {
    consider(p, asp(uC[i]), asp(uC[i + 1]), best, seed);
  }

  if (best < uSeedRadius) {
    fragColor = vec4(seed.x / uAspect, seed.y, 1.0, 1.0);
  } else {
    fragColor = vec4(0.0);
  }
}
