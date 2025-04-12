require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Use PORT from .env or default to 3000
const BASE_URL = process.env.BASE_URL || `http://localhost`; // Use BASE_URL from .env or default to localhost

app.use(bodyParser.json({ limit: '10mb' })); 
app.use(cors());

app.post('/create', async (req, res) => {
    const fetch = (await import('node-fetch')).default; 

    console.log('Request Method:', req.method);
    console.log('Request Body:', req.body);

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const formattedPrompt = `Generate the HTML content for a ${prompt}, ensuring it is mobile-friendly. Please provide only the raw HTML code, starting with the <!DOCTYPE html> tag and ending with the </html> tag. Include a responsive viewport setting and consider basic mobile layout principles. Do not include any surrounding text, explanations, or code blocks.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: formattedPrompt }]
                }]
            }),
        });

        const data = await response.json();

        let htmlContent = data.candidates[0]?.content?.parts[0]?.text;
        if (!htmlContent) {
            return res.status(500).json({ error: 'Failed to extract HTML content from the API response' });
        }

        htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

        const randomFileName = `file_${Date.now()}.html`;
        const filePath = path.join(__dirname, 'apps', randomFileName);

        fs.writeFile(filePath, htmlContent, (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ error: 'Failed to create file' });
            }

            console.log(`${filePath}`);

            // Return only the file URL
            const fileUrl = `${BASE_URL}:${PORT}/apps/${randomFileName}`;
            res.json({ fileUrl });
        });
    } catch (error) {
        console.error('Error communicating with the external API:', error);
        res.status(500).json({ error: 'Failed to fetch data from the external API' });
    }
});

// Serve static files from the apps directory
app.use('/apps', express.static(path.join(__dirname, 'apps')));

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'views', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Failed to load the page.');
        }
    });
});

app.get('/config', (req, res) => {
    res.json({ baseUrl: `${BASE_URL}:${PORT}` });
});

app.listen(PORT, () => {
    console.log(`Server is running on ${BASE_URL}:${PORT}`);
});