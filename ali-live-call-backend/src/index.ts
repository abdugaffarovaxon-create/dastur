import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { translate } from '@vitalets/google-translate-api';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

app.use(express.json());

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

app.get('/', (req, res) => {
    res.send('ALI LIVE CALL TRANSLATOR BACKEND IS RUNNING!');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
