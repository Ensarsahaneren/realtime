const express = require('express');
const multer = require('multer');
const path = require('path');
const Message = require('../models/message');
const router = express.Router();

// Multer configuration for uploading audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/audio'); // Directory to store audio files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Generate unique file names
  },
});
const upload = multer({ storage });

// Route to upload an audio file
router.post('/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    const { conversationId, senderId, recipientId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const newMessage = new Message({
      conversationId,
      senderId,
      recipientId,
      audioUrl: `/uploads/audio/${req.file.filename}`, // Path to the uploaded file
      timestamp: new Date(),
    });

    const savedMessage = await newMessage.save();
    res.status(200).json(savedMessage);
  } catch (error) {
    console.error('Error uploading audio message:', error);
    res.status(500).json({ error: 'An error occurred while uploading the audio message' });
  }
});

// Get a user's message history
router.get('/history/:userID', async (req, res) => {
  const { userID } = req.params;
  try {
    const messages = await Message.find({
      $or: [{ senderId: userID }, { recipientId: userID }],
    }).sort({ timestamp: -1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error retrieving message history:', error);
    res.status(500).json({ error: 'An error occurred while retrieving message history' });
  }
});

// Update a message's content
router.put('/:messageID', async (req, res) => {
  const { messageID } = req.params;
  const { content } = req.body;

  try {
    const updatedMessage = await Message.findByIdAndUpdate(
      messageID,
      { content },
      { new: true }
    );

    if (updatedMessage) {
      res.status(200).json(updatedMessage);
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (error) {
    console.error('Error updating the message:', error);
    res.status(500).json({ error: 'An error occurred while updating the message' });
  }
});

// Update a message's status to "read"
router.put('/status/:messageID', async (req, res) => {
  const { messageID } = req.params;

  try {
    const updatedMessage = await Message.findByIdAndUpdate(
      messageID,
      { status: 'read' },
      { new: true }
    );

    if (updatedMessage) {
      res.status(200).json(updatedMessage);
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (error) {
    console.error('Error updating the message status:', error);
    res.status(500).json({ error: 'An error occurred while updating the message status' });
  }
});

// Delete a message
router.delete('/:messageID', async (req, res) => {
  const { messageID } = req.params;

  try {
    const deletedMessage = await Message.findByIdAndDelete(messageID);

    if (deletedMessage) {
      res.status(200).json({ message: 'Message deleted successfully' });
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (error) {
    console.error('Error deleting the message:', error);
    res.status(500).json({ error: 'An error occurred while deleting the message' });
  }
});

// Serve audio files
router.get('/audio/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/audio', filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending audio file:', err);
      res.status(500).json({ error: 'Failed to send audio file' });
    }
  });
});

module.exports = router;
