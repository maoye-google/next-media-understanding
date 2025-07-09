import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 8080;
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});
app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
app.use('/image', express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/readyz', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        res.status(200).json({ status: 'ready' });
    }
    catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            error: 'API key not configured'
        });
    }
});
app.post('/api/image/generate', async (req, res) => {
    try {
        const { imageDataUrl, prompt, model, temperature, thinkingConfig } = req.body;
        if (!imageDataUrl || !prompt || !model) {
            return res.status(400).json({ error: 'Missing required fields: imageDataUrl, prompt, model' });
        }
        if (model === 'gemma-3-4b-ollama-l4') {
            const kubeAIEndpoint = 'http://kubeai.kubeai.svc.cluster.local/openai/v1/chat/completions';
            const response = await fetch(kubeAIEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gemma-3-4b-ollama-l4',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: prompt,
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageDataUrl,
                                    },
                                },
                            ],
                        },
                    ],
                    temperature: Number(temperature) || 0.5,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
            }
            const result = await response.json();
            const responseText = result.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error('No response text received from AI model');
            }
            let cleanedResponse = responseText;
            if (responseText.includes('```json')) {
                cleanedResponse = responseText.split('```json')[1].split('```')[0];
            }
            const parsedResponse = JSON.parse(cleanedResponse);
            return res.status(200).json(parsedResponse);
        }
        else {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY not configured');
            }
            const config = {
                temperature: Number(temperature) || 0.5
            };
            if (thinkingConfig) {
                config.thinkingConfig = thinkingConfig;
            }
            const result = await ai.models.generateContent({
                model,
                contents: [{
                        role: 'user',
                        parts: [
                            {
                                inlineData: {
                                    data: imageDataUrl.replace('data:image/png;base64,', ''),
                                    mimeType: 'image/png'
                                }
                            },
                            { text: prompt },
                        ],
                    }],
                config,
            });
            const responseText = result.text;
            if (!responseText) {
                throw new Error('No response text received from AI model');
            }
            let cleanedResponse = responseText;
            if (responseText.includes('```json')) {
                cleanedResponse = responseText.split('```json')[1].split('```')[0];
            }
            const parsedResponse = JSON.parse(cleanedResponse);
            res.status(200).json(parsedResponse);
        }
    }
    catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({
            error: 'Failed to generate content from image',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/image/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/', (req, res) => {
    res.redirect('/image/');
});
app.listen(port, () => {
    console.log(`Image understanding server running on port ${port}`);
});
