#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;   // color buffer
uniform sampler2D texID;  // ID buffer
uniform float time;
uniform float dartMode;

varying vec2 vTexCoord;

// ------------------ noise helpers ---------------------
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// -------------------------------------------------------

void main() {
    vec2 uv = vTexCoord;

    // read encoded sentence ID
    float sid = texture2D(texID, uv).r * 255.0;
    float seed = fract(sin(sid * 12.3456) * 9876.543);

    // ---------- TEXT DISTORTION ----------
    float n = noise(uv * 8.0 + time * 0.5);
    uv.x += (n - 0.5) * 0.006;
    uv.y += (n - 0.5) * 0.006;

    float bandWidth = 0.25;
    float bandCenter1 = 0.5 + 0.4 * sin(time * (0.25 + seed * 0.2));
    float bandCenter2 = 0.5 - 0.4 * sin(time * (0.30 + seed * 0.3) + 1.57);

    float dist1 = abs(uv.y - bandCenter1);
    float dist2 = abs(uv.y - bandCenter2);

    float b1 = smoothstep(bandWidth, 0.0, dist1);
    float b2 = smoothstep(bandWidth, 0.0, dist2);
    float combined = clamp(b1 + b2, 0.0, 1.0);

    float stretchAmount = 1.6 * (1.0 - 0.65 * dartMode);  
    // dartMode=1 → stretch=0.56 instead of 1.6

    uv.y = (uv.y - 0.5) * (1.0 + stretchAmount * combined) + 0.5;


    // ---------- BASE COLOR AFTER DISTORTION ----------
    vec3 col = texture2D(tex0, uv).rgb;

    // ---------- GLSL DUST / STATIC ----------
    vec2 duv = uv;
    duv.x += time * 0.05;
    duv.y += time * 0.03;

    float fog = noise2D(duv * 2.0) * 0.15;
    float mid = noise2D(duv * 40.0) * 0.12;
    float sharp = (hash(duv * 500.0) - 0.5) * 0.08;

    float dust = fog + mid + sharp;
    dust *= 0.8 + 0.2 * sin(time * 3.0 + uv.x * 20.0);

    col += vec3(dust);

    gl_FragColor = vec4(col, 1.0);
}
