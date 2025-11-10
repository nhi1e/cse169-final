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

  float wave = sin((uv.y + time * 0.3) * 8.0) * 0.004;
  float flow = sin((uv.y * 2.0 - time) * 3.0) * 0.003;
  uv.x += wave;
  uv.y += flow;

  float shift = 0.0015;
  vec3 col;
  col.r = texture2D(tex0, uv + vec2(shift, 0.0)).r;
  col.g = texture2D(tex0, uv).g;
  col.b = texture2D(tex0, uv - vec2(shift, 0.0)).b;

  col.r += 0.02 * sin(time + uv.y * 40.0);
  col.b += 0.02 * sin(time * 0.7 + uv.x * 50.0);

  float brightness = smoothstep(0.6, 1.0, dot(col, vec3(0.333)));
  col += brightness * 0.15;

  // float glitch = step(0.98, fract(sin(time * 2.7) * 43758.5453)); // random flicker
  // if (glitch > 0.5) {
  //   col.rb += vec2(0.2, -0.2);
  // }
  float flicker = 0.02 * sin(time * 3.0 + uv.y * 10.0);
  col += vec3(flicker);


  gl_FragColor = vec4(col, 1.0);
}
