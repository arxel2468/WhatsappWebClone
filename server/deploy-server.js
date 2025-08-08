// deploy-server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize Express app and server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io available to routes
app.set('io', io);

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
const processWebhookPayload = async (payload, io) => {
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
        
        // Emit the new message to all connected clients
        if (io) {
          io.emit('new-message', newMessage);
        }
        
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
        
        if (updatedMessage && io) {
          // Emit the status update to all connected clients
          io.emit('status-update', { id: status.id, status: status.status });
        }
        
        return updatedMessage;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    return null;
  }
};

// Function to load sample data
async function loadSampleData(io) {
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
      
      const result = await processWebhookPayload(payload, io);
      if (result) {
        processedCount++;
      }
    }
    
    console.log(`Processed ${processedCount} sample files`);
    return processedCount;
  } catch (error) {
    console.error('Error loading sample data:', error);
    return 0;
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
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.get('/api/messages/:wa_id', async (req, res) => {
  try {
    const messages = await Message.find({ wa_id: req.params.wa_id })
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { wa_id, text, contact_name } = req.body;
    
    if (!wa_id || !text) {
      return res.status(400).json({ error: 'wa_id and text are required' });
    }
    
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
    io.emit('new-message', newMessage);
    
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Simple API route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Process sample data endpoint
app.post('/api/process-samples', async (req, res) => {
  try {
    const count = await loadSampleData(io);
    res.json({ success: true, message: `Processed ${count} sample files` });
  } catch (error) {
    console.error('Error processing samples:', error);
    res.status(500).json({ error: 'Failed to process sample data' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Root route and catch-all for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Check if we need to load sample data
  try {
    const count = await Message.countDocuments();
    console.log(`Found ${count} existing messages`);
    
    if (count === 0) {
      console.log('No messages found. Loading sample data...');
      await loadSampleData(io);
    } else {
      console.log('Skipping sample data load');
    }
  } catch (err) {
    console.error('Error checking/loading sample data:', err);
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  // Don't crash the server if MongoDB connection fails
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});