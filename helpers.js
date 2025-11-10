function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	setupBuffer(); // recreate the pg buffer to match
}
