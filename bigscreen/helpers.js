function windowResized() {
	setupBuffer();
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
		warpPhase: random(1000.0), // random offset into time
		warpSpeed: random(0.1, 0.5), // unique animation speed
		warpAmp: random(0.2, 1.4), // unique stretch amount
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
