precision highp float;

in vec2 aCenter;
in vec2 aNormal;
in float aSide;
in float aAlong;
in float aSalt;
in float aClosed;

uniform vec2 uResolution;
uniform float uWidthPx;
uniform float uTime;

out float vSide;
out float vAlong;
out float vSalt;
out float vClosed;

void main() {
  float pulse = 1.0 + 0.07 * sin(aAlong * 16.0 - uTime * 1.4 + aSalt * 6.28318);
  vec2 p = aCenter + aNormal * aSide * uWidthPx * pulse;
  vec2 clip = vec2(
    (p.x / uResolution.x) * 2.0 - 1.0,
    1.0 - (p.y / uResolution.y) * 2.0
  );
  vSide = aSide;
  vAlong = aAlong;
  vSalt = aSalt;
  vClosed = aClosed;
  gl_Position = vec4(clip, 0.0, 1.0);
}
