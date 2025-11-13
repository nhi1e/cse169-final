function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	setupBuffer(); // recreate the pg buffer to match
}
function makeTextStream(text) {
	return {
		text: text,
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
