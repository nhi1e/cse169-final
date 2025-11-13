import express from "express";
import http from "http";
import { Server } from "socket.io";

// app.use(express.static("bigscreen"));
// app.use(express.static("smallscreen"));

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
	cors: { origin: "*" },
});

io.on("connection", (socket) => {
	console.log("user connected:", socket.id);

	socket.on("audienceMessage", (msg) => {
		io.emit("newMessage", msg);
	});
});

server.listen(3000, () => {
	console.log("Server running on http://localhost:3000");
});
