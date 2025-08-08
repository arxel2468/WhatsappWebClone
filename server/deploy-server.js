// deploy-server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Define Message Schema
const messageSchema = new mongoose.Schema({
  id: String,
  meta_msg_id: String,
  wa_id: String,
  from: String,
  timestamp: Number,
  type: String,
  text: {
    body: String
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'inbound'
  },
  contact_name: String
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema, 'processed_messages');

// Process webhook payload function
const processWebhookPayload = async (payload) => {
  try {
    if (payload.metaData && payload.metaData.entry && 
        payload.metaData.entry[0].changes && 
        payload.metaData.entry[0].changes[0].value) {
      
      const value = payload.metaData.entry[0].changes[0].value;
      
      // Process message
      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const contact = value.contacts && value.contacts.length > 0 ? value.contacts[0] : null;
        const contactName = contact ? contact.profile.name : null;
        
        // Determine direction based on the sender
        const direction = message.from === '918329446654' ? 'outbound' : 'inbound';
        
        const newMessage = new Message({
          id: message.id,
          meta_msg_id: message.id,
          wa_id: direction === 'inbound' ? message.from : message.recipient_id || (contact ? contact.wa_id : null),
          from: message.from,
          timestamp: parseInt(message.timestamp),
          type: message.type,
          text: message.text || { body: '' },
          status: 'delivered',
          direction,
          contact_name: contactName
        });
        
        await newMessage.save();
        return newMessage;
      }
      
      // Process status update
      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0];
        
        const updatedMessage = await Message.findOneAndUpdate(
          { id: status.id },
          { status: status.status },
          { new: true }
        );
        
        return updatedMessage;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    return null;
  }
};

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check if we need to load sample data
    try {
      const count = await Message.countDocuments();
      if (count === 0) {
        console.log('No messages found. Loading sample data...');
        await loadSampleData();
      } else {
        console.log(`Found ${count} existing messages. Skipping sample data load.`);
      }
    } catch (err) {
      console.error('Error checking/loading sample data:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Function to load sample data
async function loadSampleData() {
  try {
    const sampleDir = path.join(__dirname, '../samples');
    
    // Check if directory exists
    if (!fs.existsSync(sampleDir)) {
      console.log('Samples directory not found');
      return;
    }
    
    const files = fs.readdirSync(sampleDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('No sample files found');
      return;
    }
    
    let processedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(sampleDir, file);
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const result = await processWebhookPayload(payload);
      if (result) {
        processedCount++;
      }
    }
    
    console.log(`Processed ${processedCount} sample files`);
  } catch (error) {
    console.error('Error loading sample data:', error);
  }
}

// API Routes
app.get('/api/contacts', async (req, res) => {
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

app.get('/api/messages/:wa_id', async (req, res) => {
  try {
    const messages = await Message.find({ wa_id: req.params.wa_id })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
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
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple API route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Process sample data endpoint
app.post('/api/process-samples', async (req, res) => {
  try {
    await loadSampleData();
    res.json({ success: true, message: 'Sample data processed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all route handler
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});