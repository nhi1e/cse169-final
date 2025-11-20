// bigscreen/sketch.js
let font, myShader;
let streams = [];
let socket;
let messages = [];
let fontMain, fontAlt;
let pg, pgID;

let animMode = "drift";

const confessions = [
	"Then I could take the next train, arrive at your doorstep in Vienna, and say: ‘Come with me, Milena. We are going to love each other without scruples or fear or restraint. Because the world is ending tomorrow.’",
	"Dear Milena, I wish the world were ending tomorrow...",
	"Perhaps we don’t love unreasonably because we think we have time",
	"But what if we don't have time? Or what if time, as we know it, is irrelevant?",
];

function preload() {
	fontMain = loadFont("NewRodinPro.otf");
	fontAlt = "Times New Roman";
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

	for (let line of confessions) {
		streams.push(makeTextStream(line));
	}
}

function draw() {
	if (animMode === "dart") {
		drawDartMode();
	} else {
		drawDriftMode();
	}
}

// ========================= DRIFT MODE (your original pg + shader) =========================
function drawDriftMode() {
	pg.clear();
	pg.background("#0000ff");
	pg.push();
	pg.translate(pg.width / 2, pg.height / 2);

	for (let i = 0; i < streams.length; i++) {
		let s = streams[i];

		pg.push();
		pg.translate(s.x, s.y);
		pg.scale(1, 1.6);

		// encode stream index in alpha for shader
		pg.tint(255, 255, 255, i);

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

		// motion + fade (slow drift)
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

// ========================= DART MODE (Milena-style conveyor + depth) =========================
function drawDartMode() {
	background("#0000ff");

	// Milena-style camera: move eye based on mouse to get "entering" depth feel
	let eyeX = map(mouseX, 0, width, -1200, 1200);
	let eyeY = map(mouseY, 0, height, -1200, 1200);
	let eyeZ = height / 2.0 / tan((PI * 30.0) / 180.0);

	camera(
		eyeX,
		eyeY,
		eyeZ, // eye
		0,
		0,
		0, // center
		0,
		1,
		0 // up
	);

	let fontSize = min(width, height) * 0.05;
	textFont(fontMain);
	textSize(fontSize);
	textAlign(CENTER, CENTER);
	fill("#f1f1f1");

	for (let i = 0; i < streams.length; i++) {
		let s = streams[i];

		// build a flat char array once per stream
		if (!s.rotChars) {
			s.rotChars = [];
			if (s.lines && s.lines.length > 0) {
				for (let line of s.lines) {
					for (let c of line) {
						s.rotChars.push(c.ch);
					}
					s.rotChars.push(" ");
				}
			} else if (s.text) {
				s.rotChars = s.text.split("");
			} else {
				s.rotChars = [];
			}
			s.shiftRate = int(random(2, 5)); // how many frames before one rotation
			s.shiftTimer = 0;
		}

		// do multiple rotations per frame, like your "for (let i=0;i<7;i++)" draft
		s.shiftTimer++;
		if (s.shiftTimer > s.shiftRate && s.rotChars.length > 0) {
			s.shiftTimer = 0;
			for (let k = 0; k < 7; k++) {
				// NEW = first → end (runs opposite direction)
				let first = s.rotChars.shift();
				s.rotChars.push(first);
			}
		}

		let textStr =
			s.rotChars && s.rotChars.length > 0 ? s.rotChars.join("") : s.text || "";

		// draw this stream as one big conveyor text block
		push();
		translate(s.x, s.y, 0); // z=0 plane, camera gives depth feel
		let lineWidth = textStr.length * (fontSize * 0.6);
		let cursorX = -(lineWidth / 2);

		for (let idx = 0; idx < textStr.length; idx++) {
			let ch = textStr[idx];
			text(ch, cursorX, 0);
			cursorX += fontSize * 0.6;
		}
		pop();

		// optional gentle motion in dart mode so they aren't perfectly locked
		s.x += s.speedX * 0.1;
		s.y += s.speedY * 0.1;
		s.life++;

		if (s.life > s.stayFrames) s.fadingOut = true;
		if (s.fadingOut) s.opacity -= 1.0;
		if (s.opacity <= 0 || abs(s.x) > width / 2.2 || abs(s.y) > height / 2.2) {
			resetStream(s);
		}
	}
	// === RUN SHADER ON THE WHOLE WEBGL FRAME ===
	let frame = get(); // capture the rendered dart-mode frame

	shader(myShader);
	myShader.setUniform("tex0", frame);
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
	s.stayFrames = int(random(1000, 2000));
	s.fadingOut = false;
	s.rotChars = null;
	s.shiftTimer = 0;
}

function setupBuffer() {
	pg = createGraphics(width, height);
	pg.pixelDensity(1);
	pg.textFont(fontMain);
	pg.textSize(min(width, height) * 0.05);
	pg.textAlign(CENTER, CENTER);
}

// NOTE: actual streams are created via makeTextStream(msg) elsewhere.
// This one isn't currently used, but I’ll leave it here.
function makeStream(i) {
	return {
		confessionIdx: i,
		text: confessions[i],
		x: random(-width / 3, width / 3),
		y: random(-height / 2, height / 2),
		speedX: random(-0.3, 0.3),
		speedY: random(0.4, 1.2),
		opacity: random(220, 255),
		life: 0,
		stayFrames: int(random(480, 900)),
		fadingOut: false,
		waveOffset: random(TWO_PI),
		depth: random(0.5, 1.5),
	};
}

// ==========================================================
// KEY SWITCHES
// ==========================================================
function keyPressed() {
	if (key === "1") animMode = "drift"; // pg + shader
	if (key === "2") animMode = "dart"; // Milena-style depth conveyor
}
