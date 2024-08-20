const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingClients = [];
let rooms = {}; // Store rooms information

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('find-next-partner', () => {
        if (waitingClients.length > 0) {
            const partnerSocket = waitingClients.shift();
            const room = `${socket.id}-${partnerSocket.id}`;

            socket.join(room);
            partnerSocket.join(room);

            rooms[room] = { clients: [socket.id, partnerSocket.id] };

            socket.emit('chat-start', { room });
            partnerSocket.emit('chat-start', { room });

            console.log('Two users are connected:', room);
        } else {
            waitingClients.push(socket);
            socket.emit('waiting');
        }
    });

    socket.on('message', (data) => {
        io.to(data.room).emit('message', data);
    });

    socket.on('end-chat', () => {
        const room = Object.keys(rooms).find(r => rooms[r].clients.includes(socket.id));
        if (room) {
            io.to(room).emit('partner-disconnected');
            delete rooms[room];
            socket.leave(room);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        waitingClients = waitingClients.filter(client => client.id !== socket.id);

        const room = Object.keys(rooms).find(r => rooms[r].clients.includes(socket.id));
        if (room) {
            io.to(room).emit('partner-disconnected');
            delete rooms[room];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
