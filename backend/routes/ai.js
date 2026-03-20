const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.post('/suggest', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, message: 'Prompt missing' });
    }

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a helpful coding assistant. Return only code, no explanations." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 1000,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const text = response.data.choices[0].message.content;
        return res.json({ success: true, suggestion: text });

    } catch (err) {
        console.error('Groq error:', err.response?.data || err.message);
        return res.status(500).json({ success: false, message: err.response?.data?.error?.message || err.message });
    }
});

module.exports = router;