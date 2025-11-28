function windowResized() {
	resizeCanvas(windowWidth, windowHeight);

	setupBuffer(); // rebuild pg

	scene3D = createGraphics(windowWidth, windowHeight, WEBGL);
	scene3D.pixelDensity(1);
	scene3D.textFont(fontMain);
	scene3D.textSize(min(windowWidth, windowHeight) * 0.05);
	scene3D.textAlign(CENTER, CENTER);
	scene3D.noStroke();
}

function makeSpectrogramStream(dataUrl) {
	let s = {
		isImage: true,
		img: null,
		loaded: false,
		x: random(-width * 0.2, width * 0.2),
		y: random(-height * 0.2, height * 0.2),
		speedX: random(-0.2, 0.2),
		speedY: random(-0.15, 0.15),
		opacity: 255,
		life: 0,
		stayFrames: int(random(480, 900)),
		fadingOut: false,
		createdAt: millis(),
		expired: false,
		depth: random(0.5, 1.5),
	};

	// load AFTER creating object so callback can write into s
	s.img = loadImage(dataUrl, () => {
		console.log("Spectrogram loaded!");
		s.loaded = true;
	});

	return s;
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

	// convert each line into character objects
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
