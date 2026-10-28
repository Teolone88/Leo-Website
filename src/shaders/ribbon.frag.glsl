precision highp float;

in float vSide;
in float vAlong;
in float vSalt;
in float vClosed;

uniform float uTime;

out vec4 fragColor;

void main() {
  float d = abs(vSide);
  float edge = smoothstep(1.0, 0.42, d);
  float core = smoothstep(0.38, 0.0, d);
  float travel = fract(uTime * 0.1 + vSalt);
  float delta = abs(vAlong - travel);
  if (vClosed > 0.5) {
    delta = min(delta, 1.0 - delta);
  }
  float head = exp(-pow(delta * 8.0, 2.0));
  vec3 glow = vec3(0.86, 1.0, 0.28);
  vec3 ink = vec3(0.97, 1.0, 0.9);
  vec3 col = glow * (1.0 - d) * 0.55 + ink * core + glow * head * 1.65;
  if (edge < 0.02) discard;
  col = min(max(col, 0.0), vec3(1.0));
  vec3 linear = pow(col, vec3(2.2));
  fragColor = vec4(linear * edge, edge);
}
