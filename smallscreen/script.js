// ======================
// SOCKET.IO
// ======================
const socket = io("https://cse169-final.onrender.com", {
	transports: ["websocket"],
	upgrade: false,
	withCredentials: true,
});

// ======================
// UI ELEMENTS
// ======================
const textBtn = document.getElementById("textModeBtn");
const audioBtn = document.getElementById("audioModeBtn");
const textPanel = document.getElementById("textContainer");
const audioPanel = document.getElementById("audioContainer");
const cooldownMsg = document.getElementById("cooldownMsg");
const textInput = document.getElementById("textInput");
const textSubmit = document.getElementById("textSubmit");
const recordBtn = document.getElementById("recordBtn");

const fftCanvas = document.getElementById("specCanvas");
const fftCtx = fftCanvas.getContext("2d");

// ======================
// PANEL SWITCHING
// ======================
function showPanel(panel) {
	textPanel.classList.add("hidden");
	audioPanel.classList.add("hidden");
	panel.classList.remove("hidden");
}

textBtn.onclick = () => showPanel(textPanel);
audioBtn.onclick = () => showPanel(audioPanel);

// ======================
// COOLDOWN
// ======================
let cooldown = false;

function startCooldown() {
	cooldown = true;
	let timeLeft = 10;

	cooldownMsg.innerText = `Please wait ${timeLeft}s before sending another.`;

	const timer = setInterval(() => {
		timeLeft--;
		cooldownMsg.innerText = `Please wait ${timeLeft}s before sending another.`;

		if (timeLeft <= 0) {
			cooldown = false;
			cooldownMsg.innerText = "";
			clearInterval(timer);
		}
	}, 1000);
}

// ======================
// SEND TEXT
// ======================
textSubmit.onclick = () => {
	if (cooldown) return;

	let t = textInput.value.trim();
	if (!t) return;

	const words = t.split(/\s+/);
	if (words.length > 100) {
		cooldownMsg.innerText = "Text is limited to 100 words.";
		return;
	}

	socket.emit("audienceMessage", {
		type: "text",
		text: t,
	});

	textInput.value = "";
	startCooldown();
};

// ======================
// AUDIO RECORDING
// ======================
let recording = false;
let audioCtx,
	analyser,
	sourceNode,
	micGain,
	mediaRecorder,
	audioChunks = [];
let recordStartTime = 0;

recordBtn.onclick = toggleRecording;

async function toggleRecording() {
	if (recording) {
		stopRecording();
		return;
	}

	if (cooldown) return;

	recording = true;
	recordBtn.innerText = "⏹ stop recording";

	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

	audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	sourceNode = audioCtx.createMediaStreamSource(stream);

	micGain = audioCtx.createGain();
	micGain.gain.value = 10;
	analyser = audioCtx.createAnalyser();
	analyser.fftSize = 8192;
	analyser.smoothingTimeConstant = 0.65;

	sourceNode.connect(micGain);
	micGain.connect(analyser);

	mediaRecorder = new MediaRecorder(stream);
	audioChunks = [];
	mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

	mediaRecorder.onstop = async () => {
		const img = await generateSpectrogram();
		socket.emit("audienceMessage", {
			type: "audio",
			spectrogram: img,
		});
	};

	mediaRecorder.start();

	recordStartTime = Date.now();
	updateRecordingTimer();
}

function stopRecording() {
	recording = false;
	mediaRecorder.stop();
	recordBtn.innerText = "begin recording";
	startCooldown();
}

// 30 second limit
function updateRecordingTimer() {
	if (!recording) return;

	const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);

	if (elapsed >= 30) {
		stopRecording();
		return;
	}

	requestAnimationFrame(updateRecordingTimer);
}

// ======================
// GENERATE SPECTROGRAM
// ======================
async function generateSpectrogram() {
	const bins = analyser.frequencyBinCount;
	const freqData = new Uint8Array(bins);
	analyser.getByteFrequencyData(freqData);

	const height = fftCanvas.height;
	fftCtx.clearRect(0, 0, fftCanvas.width, height);

	const mid = height / 2;
	const totalBars = 180;
	const barWidth = 4;
	const barGap = 2;
	const stride = Math.floor(bins / totalBars);
	const baseColor = { r: 62, g: 199, b: 255 };

	for (let i = 0; i < totalBars; i++) {
		let v = freqData[i * stride];
		v = Math.pow(v / 255, 0.33) * 255;

		const h = (v / 255) * (height * 0.42);
		const x = i * (barWidth + barGap);

		fftCtx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
		fftCtx.fillRect(x, mid - h, barWidth, h);
		fftCtx.fillRect(x, mid, barWidth, h);
	}

	const contentWidth = totalBars * (barWidth + barGap);

	const trimmed = document.createElement("canvas");
	trimmed.width = contentWidth;
	trimmed.height = height;

	trimmed
		.getContext("2d")
		.drawImage(
			fftCanvas,
			0,
			0,
			contentWidth,
			height,
			0,
			0,
			contentWidth,
			height
		);

	return trimmed.toDataURL("image/png");
}
