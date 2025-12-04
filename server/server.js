import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
	transports: ["websocket"], 
	allowUpgrades: false, 
	cors: {
		origin: ["https://nhi1e.github.io", "https://cse169-final.onrender.com"],
		methods: ["GET", "POST"],
		credentials: true,
	},
});


// ==============================
io.on("connection", (socket) => {
	console.log("user connected:", socket.id);

	socket.on("audienceMessage", (msg) => {
		io.emit("newMessage", msg);
	});
});
// ==============================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log("Server running on port", PORT);
});
