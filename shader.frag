#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;
uniform float time;
varying vec2 vTexCoord;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vTexCoord;

  float n = noise(uv * 8.0 + time * 0.5);
  uv.x += (n - 0.5) * 0.006;
  uv.y += (n - 0.5) * 0.006;

  float shift = 0.0015;
  vec3 col;
  col.r = texture2D(tex0, uv + vec2(shift, 0.0)).r;
  col.g = texture2D(tex0, uv).g;
  col.b = texture2D(tex0, uv - vec2(shift, 0.0)).b;

  float brightness = smoothstep(0.6, 1.0, dot(col, vec3(0.333)));
  col += brightness * 0.15;

  gl_FragColor = vec4(col, 1.0);
}
