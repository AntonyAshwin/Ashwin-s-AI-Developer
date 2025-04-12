require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(bodyParser.json({ limit: '10mb' })); // Increase limit if large HTML content is expected
app.use(cors());

// Route to handle prompt input
app.post('/create', async (req, res) => {
    const fetch = (await import('node-fetch')).default; // Dynamically import node-fetch

    console.log('Request Method:', req.method);
    console.log('Request Body:', req.body);

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Format the prompt into the required sentence
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

        // Extract the HTML content from the response
        let htmlContent = data.candidates[0]?.content?.parts[0]?.text;
        if (!htmlContent) {
            return res.status(500).json({ error: 'Failed to extract HTML content from the API response' });
        }

        // Remove ```html and ``` from the content
        htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();

        // Generate a random file name
        const randomFileName = `file_${Date.now()}.html`;

        // Define the file path inside the apps directory
        const filePath = path.join(__dirname, 'apps', randomFileName);

        // Write the cleaned HTML content to the file
        fs.writeFile(filePath, htmlContent, (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ error: 'Failed to create file' });
            }

            console.log(`File created: ${filePath}`);
            res.json({ message: `File created successfully: ${randomFileName}`, filePath });
        });
    } catch (error) {
        console.error('Error communicating with the external API:', error);
        res.status(500).json({ error: 'Failed to fetch data from the external API' });
    }
});

// Route to save the received HTML content into a file
app.post('/test', (req, res) => {
    console.log('Request Method:', req.method);
    console.log('Request Body:', req.body);

    const { htmlContent } = req.body; // Expecting the HTML content in the `htmlContent` field
    if (!htmlContent) {
        return res.status(400).json({ error: 'HTML content is required' });
    }

    // Generate a random file name
    const randomFileName = `file_${Date.now()}.html`;

    // Define the file path inside the apps directory
    const filePath = path.join(__dirname, 'apps', randomFileName);

    // Write the HTML content to the file
    fs.writeFile(filePath, htmlContent, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).json({ error: 'Failed to create file' });
        }

        console.log(`File created: ${filePath}`);
        res.json({ message: `File created successfully: ${randomFileName}` });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});