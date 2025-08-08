// routes/api.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const Message = require('../models/Message');
const { processWebhookPayload } = require('../utils/webhookProcessor');

const router = express.Router();

// Get all contacts with their latest message
router.get('/contacts', async (req, res) => {
  try {
    // Aggregate to get contacts with their last message
    const contacts = await Message.aggregate([
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: "$wa_id",
          name: { $first: "$contact_name" },
          last_message: { $first: "$text.body" },
          timestamp: { $first: "$timestamp" },
          wa_id: { $first: "$wa_id" }
        }
      },
      {
        $sort: { timestamp: -1 }
      }
    ]);
    
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a specific contact
router.get('/messages/:wa_id', async (req, res) => {
  try {
    const messages = await Message.find({ wa_id: req.params.wa_id })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a new message (store only)
router.post('/messages', async (req, res) => {
  try {
    const { wa_id, text, contact_name } = req.body;
    
    const newMessage = new Message({
      id: `local-${Date.now()}`,
      meta_msg_id: `local-${Date.now()}`,
      wa_id,
      from: '918329446654', // Your business number
      timestamp: Math.floor(Date.now() / 1000),
      type: 'text',
      text: { body: text },
      status: 'sent',
      direction: 'outbound',
      contact_name
    });
    
    await newMessage.save();
    
    // Emit the new message to all connected clients
    req.app.get('io').emit('new-message', newMessage);
    
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process webhook payload
router.post('/webhook', async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await processWebhookPayload(req.body, io);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Process sample payloads from directory
router.post('/process-samples', async (req, res) => {
  try {
    const io = req.app.get('io');
    const sampleDir = path.join(__dirname, '../../samples');
    
    // Check if directory exists
    if (!fs.existsSync(sampleDir)) {
      return res.status(404).json({ error: 'Samples directory not found' });
    }
    
    const files = fs.readdirSync(sampleDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No sample files found' });
    }
    
    const results = [];
    
    for (const file of files) {
      const filePath = path.join(sampleDir, file);
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const result = await processWebhookPayload(payload, io);
      if (result) {
        results.push({ file, result });
      }
    }
    
    res.status(200).json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error('Error processing sample payloads:', err);
    res.status(500).json({ error: err.message });
  }
});

// Process uploaded sample payloads
router.post('/process-uploaded-samples', async (req, res) => {
  try {
    const io = req.app.get('io');
    const { payloads } = req.body;
    
    if (!Array.isArray(payloads)) {
      return res.status(400).json({ error: 'Payloads must be an array' });
    }
    
    const results = [];
    
    for (const payload of payloads) {
      const result = await processWebhookPayload(payload, io);
      if (result) {
        results.push(result);
      }
    }
    
    res.status(200).json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error('Error processing uploaded payloads:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;