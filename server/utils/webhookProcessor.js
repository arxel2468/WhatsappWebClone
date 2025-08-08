// utils/webhookProcessor.js
const Message = require('../models/Message');

/**
 * Process a webhook payload and save to database
 * @param {Object} payload - The webhook payload
 * @param {Object} io - Socket.IO instance for real-time updates
 * @returns {Promise<Object|null>} - The processed message or null
 */
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

module.exports = { processWebhookPayload };