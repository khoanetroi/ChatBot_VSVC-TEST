const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Communicate } = require('edge-tts-universal');

const app = express();
const PORT = 3000;

app.use(cors()); // Allow requests from any origin

app.get('/api/config', (req, res) => {
    res.json({
        BOT_ID: process.env.COZE_BOT_ID,
        PAT: process.env.COZE_PAT
    });
});

app.get('/api/tts', async (req, res) => {
    try {
        const text = req.query.text;
        const voice = req.query.voice || 'vi-VN-HoaiMyNeural'; // Default high quality voice

        if (!text) {
            return res.status(400).send('Missing text parameter');
        }

        console.log(`[TTS Request] Voice: ${voice} | Text: ${text}`);

        // Set response headers for audio stream
        res.setHeader('Content-Type', 'audio/mpeg');

        const communicate = new Communicate(text, { voice });

        for await (const chunk of communicate.stream()) {
            if (chunk.type === 'audio' && chunk.data) {
                res.write(chunk.data);
            }
        }

        res.end();
    } catch (error) {
        console.error('TTS Streaming Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`[x] Edge TTS Server running at http://localhost:${PORT}`);
        console.log(`[x] Test URL: http://localhost:${PORT}/api/tts?text=Xin%20chao`);
    });
}

module.exports = app;
