// bigscreen/sketch.js
let font, myShader;
let streams = [];
let socket;
let messages = [];
let fontMain, fontAlt;
let pg, pgID;

const confessions = [
	"Then I could take the next train, arrive at your doorstep in Vienna, and say: ‘Come with me, Milena. We are going to love each other without scruples or fear or restraint. Because the world is ending tomorrow.’",
	"Dear Milena, I wish the world were ending tomorrow...",
	"Perhaps we don’t love unreasonably because we think we have time",
	"But what if we don't have time? Or what if time, as we know it, is irrelevant?",
];

function preload() {
	fontMain = loadFont("NewRodinPro.otf");
	fontAlt = "Times New Roman"; // built-in system font
	myShader = loadShader("shader.vert", "shader.frag");
}

function setup() {
	console.log("BIGSCREEN: setup() running");

	socket = io("http://localhost:3000");
	socket.on("connect", () =>
		console.log("BIGSCREEN: MAIN socket connected", socket.id)
	);
	socket.on("connect_error", (err) =>
		console.log("BIGSCREEN: MAIN socket error", err)
	);

	pixelDensity(1);
	const canvas = createCanvas(windowWidth, windowHeight, WEBGL);

	setTimeout(() => {
		console.log("====== SHADER LOGS ======");
		console.log("VERTEX SHADER LOG:");
		console.log(myShader._gl.getShaderInfoLog(myShader._vertShader));

		console.log("FRAGMENT SHADER LOG:");
		console.log(myShader._gl.getShaderInfoLog(myShader._fragShader));
	}, 500);

	socket.on("newMessage", (msg) => {
		console.log("BIGSCREEN received:", msg);
		streams.push(makeTextStream(msg));
	});

	canvas.position(0, 0);
	canvas.style("display", "block");
	canvas.style("z-index", "-1");

	pg = createGraphics(width, height);
	pg.pixelDensity(1);
	pg.textFont(fontMain);
	pg.textSize(min(width, height) * 0.05);
	pg.textAlign(CENTER, CENTER);

	pgID = createGraphics(width, height);
	pgID.pixelDensity(1);
	pgID.textFont(fontMain);
	pgID.textSize(min(width, height) * 0.05);
	pgID.textAlign(CENTER, CENTER);

	// for (let i = 0; i < confessions.length; i++) {
	// 	streams.push(makeStream(i));
	// }
	for (let line of confessions) {
		streams.push(makeTextStream(line));
	}
}

function draw() {

	pg.clear();
	pg.background("#0000ff");
	pg.push();
	pg.translate(pg.width / 2, pg.height / 2);

	for (let i = 0; i < streams.length; i++) {
		let s = streams[i];

		pg.push();
		pg.translate(s.x, s.y);
		pg.scale(1, 1.6);

		// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
		// ADD THIS SINGLE LINE:
		// Encode sentence index into ALPHA (0–255)
		pg.tint(255, 255, 255, i);
		// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

		pg.fill(255, s.opacity * (2.0 - s.depth));

		let fontSize = min(width, height) * 0.05;
		let lineSpacing = fontSize * 1.2;
		let totalHeight = s.lines.length * lineSpacing;
		let startY = -totalHeight / 2;

		for (let line of s.lines) {
			let lineWidth = line.length * (fontSize * 0.6);
			let cursorX = -(lineWidth / 2);

			pg.push();
			pg.translate(0, startY);

			for (let c of line) {
				c.timer++;
				if (c.timer > c.switchRate) {
					c.useAlt = !c.useAlt;
					c.timer = 0;
				}

				pg.textFont(c.useAlt ? fontAlt : fontMain);
				pg.textSize(fontSize);
				pg.text(c.ch, cursorX, 0);

				cursorX += fontSize * 0.6;
			}

			pg.pop();
			startY += lineSpacing;
		}

		pg.noTint();
		pg.pop();

		// Motion + fade
		s.x += s.speedX * 0.25;
		s.y += s.speedY * 0.25;
		s.life++;

		if (s.life > s.stayFrames) s.fadingOut = true;
		if (s.fadingOut) s.opacity -= 1.0;
		if (s.opacity <= 0 || abs(s.x) > width / 2.2 || abs(s.y) > height / 2.2) {
			resetStream(s);
		}
	}

	pg.pop();

	// SHADER PASS
	shader(myShader);
	myShader.setUniform("tex0", pg);
	myShader.setUniform("time", millis() / 1000);

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
	s.stayFrames = int(random(1000, 2000)); // linger 5–10s
	s.fadingOut = false;
}

function setupBuffer() {
	pg = createGraphics(width, height);
	pg.pixelDensity(1);
	pg.textFont(fontMain);
	pg.textSize(min(width, height) * 0.05);
	pg.textAlign(CENTER, CENTER);
}

function makeStream(i) {
	return {
		confessionIdx: i,
		text: confessions[i],
		x: random(-width / 3, width / 3),
		y: random(-height / 2, height / 2),
		speedX: random(-0.3, 0.3),
		speedY: random(0.4, 1.2), // downward motion
		opacity: random(220, 255),
		life: 0,
		stayFrames: int(random(480, 900)),
		fadingOut: false,
		waveOffset: random(TWO_PI),
		depth: random(0.5, 1.5),
	};
}
