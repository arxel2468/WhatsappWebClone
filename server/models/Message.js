// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: String,              // Message ID from WhatsApp
  meta_msg_id: String,     // For status updates
  wa_id: String,           // Phone number of contact
  from: String,            // Sender phone number
  timestamp: Number,       // Unix timestamp
  type: String,            // Message type (text, image, etc.)
  text: {                  // Message content
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
  contact_name: String     // Name of the contact
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema, 'processed_messages');