const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageID: { 
    type: String, 
    required: true, 
    unique: true 
  }, 
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  }, 
  senderID: { 
    type: String, 
    required: true 
  }, 
  recipientID: { 
    type: String, 
    required: true 
  }, 
  content: { 
    type: String, 
    required: true 
  }, 
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  }, 
  timestamp: { 
    type: Date, 
    default: Date.now 
  } 
});

module.exports = mongoose.model('Message', messageSchema);
