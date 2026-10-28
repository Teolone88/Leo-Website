precision highp float;

in vec2 vUv;

uniform sampler2D uField;
uniform vec2 uResolution;
uniform float uTime;
uniform float uWash;

out vec4 fragColor;

void main() {
  vec3 base = vec3(0.035, 0.039, 0.031);
  vec3 signal = vec3(0.839, 1.0, 0.247);
  vec4 field = texture(uField, vUv);

  vec2 gcell = vUv * vec2(uResolution.x / 64.0, uResolution.y / 64.0);
  vec2 gf = abs(fract(gcell) - 0.5);
  float grid = 1.0 - smoothstep(0.0, 0.045, min(gf.x, gf.y));

  vec3 col = base + vec3(0.45, 0.48, 0.36) * grid * 0.07;

  if (field.a > 0.5) {
    vec2 d = vUv - field.rg;
    d.x *= uResolution.x / max(uResolution.y, 1.0);
    float dist = length(d);

    float height = exp(-dist * 5.2);
    vec3 normal = normalize(vec3(dFdx(height) * uResolution.x, dFdy(height) * uResolution.y, 0.42));
    vec3 lightDir = normalize(vec3(-0.42, 0.62, 0.72));
    float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
    float spec = pow(clamp(dot(normal, halfVec), 0.0, 1.0), 28.0);

    float band = abs(fract(dist * 13.5 - uTime * 0.035) - 0.5);
    float contour = smoothstep(0.085, 0.0, band);
    float fine = smoothstep(0.035, 0.0, abs(fract(dist * 38.0) - 0.5));
    float core = smoothstep(0.02, 0.0, dist);

    col += vec3(0.16, 0.17, 0.12) * height;
    col += vec3(0.28, 0.3, 0.22) * diff * height;
    col += signal * contour * mix(0.18, 0.72, height);
    col += vec3(0.8, 0.84, 0.7) * fine * 0.12 * height;
    col += signal * spec * height;
    col += vec3(0.95, 1.0, 0.82) * core;
  }

  float wash = smoothstep(0.78, 0.06, vUv.x) * uWash;
  col = mix(col, base, wash);

  float vignette = smoothstep(1.15, 0.35, length((vUv - 0.5) * vec2(1.15, 1.0)));
  col *= mix(0.72, 1.0, vignette);

  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) * 0.012;

  col = min(max(col, 0.0), vec3(1.0));
  fragColor = vec4(pow(col, vec3(2.2)), 1.0);
}
