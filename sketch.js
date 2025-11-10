let font, myShader, pg;
let streams = [];

const confessions = [
	"Dear Milena, I wishthe world were ending tomorrow...",
	"Perhaps we don’t love unreasonably because we think we have time...",
	"But what if we don't have time? Or what if time, as we know it, is irrelevant?...",
];

function preload() {
	font = loadFont("NewRodinPro.otf");
	myShader = loadShader("shader.vert", "shader.frag");
}

function setup() {
	pixelDensity(1);
	const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
	canvas.position(0, 0);
	canvas.style("display", "block");
	canvas.style("z-index", "-1");

	pg = createGraphics(width, height);
	pg.pixelDensity(1);
	pg.textFont(font);
	pg.textSize(min(width, height) * 0.05);
	pg.textAlign(CENTER, CENTER);

	for (let i = 0; i < confessions.length; i++) {
		streams.push(makeStream(i));
	}
}

function makeStream(i) {
	return {
		confessionIdx: i,
		text: confessions[i],
		x: random(-width / 3, width / 3),
		y: random(-height / 3, height / 3),
		speedX: random(-0.8, 0.8),
		speedY: random(-0.6, 0.6),
		opacity: random(200, 255),
		life: 0, // counts frames since creation
		stayFrames: int(random(300, 600)), // how long to stay fully visible before fading (~5–10 seconds)
		fadingOut: false,
	};
}

function draw() {
	pg.clear();
	pg.background("#0000ff");
	pg.push();
	pg.translate(pg.width / 2, pg.height / 2);

	for (let s of streams) {
		pg.push();
		pg.translate(s.x, s.y);
		// pg.fill(255, s.opacity);
		let flicker = map(sin(frameCount * 0.12 + s.x * 0.01), -1, 1, 0.95, 1.08);
		pg.fill(255, s.opacity * flicker);
		pg.text(s.text, 0, 0, width * 0.45); // 45% of screen width; adjust 0.35–0.55 to taste

		pg.pop();

		s.x += s.speedX;
		s.y += s.speedY;
		s.life++;

		// Only start fading after stayFrames have passed
		if (s.life > s.stayFrames) {
			s.fadingOut = true;
		}

		if (s.fadingOut) {
			s.opacity -= 1.0; // slow fade-out
		}

		// Reset when fully faded or offscreen
		if (s.opacity <= 0 || abs(s.x) > width / 2.2 || abs(s.y) > height / 2.2) {
			resetStream(s);
		}
	}

	pg.pop();

	shader(myShader);
	myShader.setUniform("tex0", pg);
	myShader.setUniform("time", millis() / 1000.0);

	beginShape(TRIANGLES);
	vertex(-1, -1, 0, 0, 1);
	vertex(1, -1, 0, 1, 1);
	vertex(1, 1, 0, 1, 0);
	vertex(-1, -1, 0, 0, 1);
	vertex(1, 1, 0, 1, 0);
	vertex(-1, 1, 0, 0, 0);
	endShape();
}

function resetStream(s) {
	s.x = random(-width / 3, width / 3);
	s.y = random(-height / 3, height / 3);
	s.speedX = random(-0.8, 0.8);
	s.speedY = random(-0.6, 0.6);
	s.opacity = random(200, 255);
	s.life = 0;
	s.stayFrames = int(random(300, 600)); // linger 5–10s
	s.fadingOut = false;
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	pg = createGraphics(width, height);
	pg.pixelDensity(1);
	pg.textFont(font);
	pg.textSize(min(width, height) * 0.05); // ~4% of canvas size

	pg.textAlign(CENTER, CENTER);
}

function makeStream(i) {
	return {
		confessionIdx: i,
		text: confessions[i],
		x: random(-width / 3, width / 3),
		y: random(-height / 3, height / 3),
		// slower for readability with larger text
		speedX: random(-0.4, 0.4),
		speedY: random(-0.3, 0.3),
		opacity: random(220, 255),
		life: 0,
		stayFrames: int(random(360, 720)), // linger ~6–12s
		fadingOut: false,
	};
}
