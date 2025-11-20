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

  float bandWidth = 0.25;                      // width of the stretch zones
  float bandCenter1 = 0.5 + 0.4 * sin(time * 0.25);
  float bandCenter2 = 0.5 - 0.4 * sin(time * 0.3 + 1.57);

  float dist1 = abs(uv.y - bandCenter1);
  float dist2 = abs(uv.y - bandCenter2);
  float band1 = smoothstep(bandWidth, 0.0, dist1);
  float band2 = smoothstep(bandWidth, 0.0, dist2);

  float combinedBand = clamp(band1 + band2, 0.0, 1.0);
  float stretch = 1.0 + 1.6 * combinedBand;    // increase for more dramatic elongation
  uv.y = (uv.y - 0.5) * stretch + 0.5;
  uv.y = clamp(uv.y, 0.001, 0.999);

  float shift = 0.0015;
  vec3 col;
  col.r = texture2D(tex0, uv + vec2(shift, 0.0)).r;
  col.g = texture2D(tex0, uv).g;
  col.b = texture2D(tex0, uv - vec2(shift, 0.0)).b;

  col.r += 0.02 * sin(time + uv.y * 40.0);
  col.b += 0.02 * sin(time * 0.7 + uv.x * 50.0);

  float brightness = smoothstep(0.6, 1.0, dot(col, vec3(0.333)));
  col += brightness * 0.15;

  float flicker = 0.02 * sin(time * 3.0 + uv.y * 10.0);
  col += vec3(flicker);
  col *= 1.2;  // or 1.3 for stronger boost
  gl_FragColor = vec4(col, 1.0);
}
