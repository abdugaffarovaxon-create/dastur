import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { translate } from '@vitalets/google-translate-api';
import path from 'path';

console.log("Starting server process...");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

app.use(express.json());

// Serve frontend static files from local 'public' folder
// Because Render deletes folders outside the Root Directory!
const frontendPath = path.join(__dirname, '..', 'public');
console.log("Frontend path set to:", frontendPath);

app.use(express.static(frontendPath));

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Translation Request
    socket.on('translate-text', async (data) => {
        try {
            console.log('Received for translation:', data);
            // data: { text: "Hello", from: "en", to: "uz" }
            const res = await translate(data.text, { from: data.from, to: data.to });
            
            // Send back the translated text
            io.emit('translated-text', {
                original: data.text,
                translated: res.text,
                from: data.from,
                to: data.to,
                senderId: socket.id
            });
        } catch (err) {
            console.error('Translation error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Fallback: serve index.html for any unmatched route (SPA behavior)
app.get('/*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT as string, 10) || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is successfully running and bound to port ${PORT} on 0.0.0.0`);
});
