// bigscreen/sketch.js
let font, myShader;
let streams = [];
let socket;
let messages = [];
let fontMain, fontAlt;
let pg, pgID;
let scene3D; // offscreen buffer for dart mode
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

	// --- OFFSCREEN 3D BUFFER FOR DART MODE ---
	scene3D = createGraphics(windowWidth, windowHeight, WEBGL);
	scene3D.pixelDensity(1);
	scene3D.textFont(fontMain);
	scene3D.textSize(min(windowWidth, windowHeight) * 0.05);
	scene3D.textAlign(CENTER, CENTER);
	scene3D.noStroke();

	setTimeout(() => {
		console.log("====== SHADER LOGS ======");
		console.log("VERTEX SHADER LOG:");
		console.log(myShader._gl.getShaderInfoLog(myShader._vertShader));
		console.log("FRAGMENT SHADER LOG:");
		console.log(myShader._gl.getShaderInfoLog(myShader._fragShader));
	}, 500);

	socket.on("newMessage", (msg) => {
		console.log("BIGSCREEN received:", msg);

		// TEXT MESSAGE
		if (msg.type === "text") {
			streams.push(makeTextStream(msg.text));
		}

		// AUDIO SPECTROGRAM MESSAGE
		else if (msg.type === "audio") {
			streams.push(makeSpectrogramStream(msg.spectrogram));
		}
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

// ========================= DRIFT MODE =========================

function drawDriftMode() {
	pg.clear();
	pg.background("#0000ff");

	pg.push();
	pg.translate(pg.width / 2, pg.height / 2);

	for (let i = 0; i < streams.length; i++) {
		let s = streams[i];

		// ========== EXPIRATION CHECK (2 minutes) ==========
		if (!s.expired && millis() - s.createdAt > 60000) {
			s.expired = true;
			s.fadingOut = true;
			console.log(
				`[EXPIRE] Stream expired after 1 min: "${s.text.slice(0, 30)}..."`
			);
		}

		// ----------------- DRAW -----------------
		pg.push();
		pg.translate(s.x, s.y);
		pg.scale(1, 1.6);

		// === IMAGE STREAM ===
		if (s.isImage) {
			pg.tint(255, s.opacity);
			let imgW = s.img.width * 0.35;
			let imgH = s.img.height * 0.35;
			pg.image(s.img, -imgW / 2, -imgH / 2, imgW, imgH);
			pg.pop();
			continue;
		}

		// === TEXT STREAM ===
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

		// ----------------- MOTION -----------------
		s.x += s.speedX * 0.25;
		s.y += s.speedY * 0.25;
		s.life++;

		if (s.life > s.stayFrames) s.fadingOut = true;
		if (s.fadingOut) s.opacity -= 1.0;

		// ----------------- REMOVAL / RESET LOGIC -----------------
		if (s.opacity <= 0) {
			if (s.expired) {
				console.log(
					`[DELETE] Removed expired stream: "${s.text.slice(0, 30)}..."`
				);
				streams.splice(i, 1);
				i--;
				continue;
			}

			console.log(
				`[RESET] Recycling non-expired stream (confession): "${s.text.slice(
					0,
					30
				)}..."`
			);
			resetStream(s);
			continue;
		}

		if (s.expired) continue;

		if (abs(s.x) > width / 2.2 || abs(s.y) > height / 2.2) {
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

// ========================= DART MODE =========================

function drawDartMode() {
	scene3D.push();
	scene3D.clear();
	scene3D.background("#0000ff");

	// ====== AUTO CAMERA DRIFT ======
	let t = millis() * 0.00015;
	let driftX = noise(t) * 2.0 - 1.0;
	let driftY = noise(t + 1000.0) * 2.0 - 1.0;

	let eyeX = driftX * 900;
	let eyeY = driftY * 900;
	let eyeZ = scene3D.height / 2.0 / tan((PI * 30.0) / 180.0);

	scene3D.camera(eyeX, eyeY, eyeZ, 0, 0, 0, 0, 1, 0);

	let fontSize = min(scene3D.width, scene3D.height) * 0.05;
	scene3D.textFont(fontMain);
	scene3D.textSize(fontSize);
	scene3D.textAlign(CENTER, CENTER);
	scene3D.fill("#f1f1f1");

	// ====================================================
	// MAIN STREAM LOOP
	// ====================================================
	for (let i = 0; i < streams.length; i++) {
		let s = streams[i];

		// ==================== IMAGE STREAM ====================
		if (s.isImage) {
			if (!s.expired && millis() - s.createdAt > 60000) {
				s.expired = true;
				s.fadingOut = true;
			}

			scene3D.push();
			scene3D.translate(s.x, s.y, 0);

			let imgW = s.img.width * 1.2;
			let imgH = s.img.height * 1.2;
			scene3D.image(s.img, -imgW / 2, -imgH / 2, imgW, imgH);

			scene3D.pop();

			s.x += s.speedX * 0.04;
			s.y += s.speedY * 0.04;

			if (s.fadingOut) s.opacity -= 1.0;

			if (s.opacity <= 0) {
				if (s.expired) {
					console.log("[DELETE] Removed IMAGE stream");
					streams.splice(i, 1);
					i--;
					continue;
				}
				resetStream(s);
				continue;
			}
			continue;
		}

		// ======== EXPIRATION (1 min) ========
		if (!s.expired && millis() - s.createdAt > 60000) {
			s.expired = true;
			s.fadingOut = true;
			console.log(
				`[EXPIRE] "${s.text.slice(0, 30)}..." expired after 1 minute`
			);
		}

		// ======== BUILD ROTATION BUFFER ========
		if (!s.rotChars) {
			s.rotChars = [];

			if (s.lines && s.lines.length > 0) {
				for (let line of s.lines) {
					for (let c of line) s.rotChars.push(c.ch);
					s.rotChars.push(" ");
				}
			} else if (s.text) {
				s.rotChars = s.text.split("");
			}

			s.shiftRate = int(random(12, 18));
			s.shiftTimer = 0;
		}

		// ======== ROTATION ========
		s.shiftTimer++;
		if (s.shiftTimer > s.shiftRate && s.rotChars.length > 0) {
			s.shiftTimer = 0;
			let first = s.rotChars.shift();
			s.rotChars.push(first);
		}

		let textStr = s.rotChars.length > 0 ? s.rotChars.join("") : s.text;

		// ======== BOUNDING BOX ========
		let boxW = textStr.length * (fontSize * 0.6);
		let boxH = fontSize * 1.2;

		s.box = {
			x: s.x - boxW / 2,
			y: s.y - boxH / 2,
			w: boxW,
			h: boxH,
		};

		// ======== OVERLAP PREVENTION ========
		for (let j = 0; j < i; j++) {
			let o = streams[j];
			if (!o.box) continue;

			let overlap = !(
				s.box.x + s.box.w < o.box.x ||
				s.box.x > o.box.x + o.box.w ||
				s.box.y + s.box.h < o.box.y ||
				s.box.y > o.box.y + o.box.h
			);

			if (overlap) {
				s.y += boxH * 1.4;
				s.box.y = s.y - boxH / 2;
			}
		}

		// ======== DRAW TEXT ========
		scene3D.push();
		scene3D.translate(s.x, s.y, 0);

		let cursorX = -(textStr.length * (fontSize * 0.6)) / 2;

		for (let ch of textStr) {
			scene3D.text(ch, cursorX, 0);
			cursorX += fontSize * 0.6;
		}

		scene3D.pop();

		// ======== MOTION / FADE ========
		s.x += s.speedX * 0.04;
		s.y += s.speedY * 0.04;

		s.life++;
		if (s.life > s.stayFrames) s.fadingOut = true;
		if (s.fadingOut) s.opacity -= 1.0;

		if (s.opacity <= 0) {
			if (s.expired) {
				console.log(`[DELETE] Removed: "${s.text.slice(0, 30)}..."`);
				streams.splice(i, 1);
				i--;
				continue;
			}
			resetStream(s);
			continue;
		}

		if (s.expired) continue;

		if (abs(s.x) > width / 2.2 || abs(s.y) > height / 2.2) {
			resetStream(s);
		}
	}

	scene3D.pop();

	// ======== SHADER PASS ========
	shader(myShader);
	myShader.setUniform("tex0", scene3D);
	myShader.setUniform("time", millis() / 1000);
	myShader.setUniform("dartMode", 1.0);

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

// ==========================================================
// UNUSED STREAM MAKER
// ==========================================================
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

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	setupBuffer();

	scene3D = createGraphics(windowWidth, windowHeight, WEBGL);
	scene3D.pixelDensity(1);
	scene3D.textFont(fontMain);
	scene3D.textSize(min(windowWidth, windowHeight) * 0.05);
	scene3D.textAlign(CENTER, CENTER);
	scene3D.noStroke();
}

function makeTextStream(text) {
	let maxW = width * 0.4;
	let fontSize = min(width, height) * 0.05;

	return {
		text,
		lines: wrapTextToLines(text, maxW, fontSize),
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
		warpPhase: random(1000.0),
		warpSpeed: random(0.1, 0.5),
		warpAmp: random(0.2, 1.4),

		// NEW FIELDS FOR MESSAGE EXPIRY
		createdAt: millis(),
		expired: false,
	};
}

function wrapTextToLines(text, maxWidth, fontSize) {
	pg.textFont(fontMain);
	pg.textSize(fontSize);

	let words = text.split(" ");
	let lines = [];
	let current = "";

	for (let w of words) {
		let test = current.length ? current + " " + w : w;

		if (pg.textWidth(test) < maxWidth) {
			current = test;
		} else {
			lines.push(current);
			current = w;
		}
	}

	if (current.length) lines.push(current);

	return lines.map((line) =>
		line.split("").map((ch) => ({
			ch,
			useAlt: false,
			switchRate: int(random(90, 120)),
			timer: 0,
		}))
	);
}

function makeSpectrogramStream(dataUrl) {
	let img = loadImage(dataUrl);
	return {
		isImage: true,
		img,
		x: random(-width / 3, width / 3),
		y: random(-height / 2, height / 2),
		speedX: random(-0.3, 0.3),
		speedY: random(0.4, 1.2),
		opacity: random(220, 255),
		life: 0,
		stayFrames: int(random(480, 900)),
		fadingOut: false,
		createdAt: millis(),
		expired: false,
		depth: random(0.5, 1.5),
	};
}
