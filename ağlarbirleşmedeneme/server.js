require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const authenticateToken = require('./middleware/authMiddleware'); 
const authRoutes = require('./routes/auth'); 

const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.json());


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB\'ye bağlanıldı'))
  .catch(err => console.error('MongoDB\'ye bağlanılamadı', err));

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation', 
  },
  senderId: { type: String, required: true }, 
  recipientId: { type: String }, 
  content: { type: String, required: true }, 
  timestamp: { type: Date, default: Date.now }, 
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }, 
});

const Message = mongoose.model('Message', messageSchema);


const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH), 
  cert: fs.readFileSync(process.env.SSL_CERT_PATH), 
};


const httpsServer = https.createServer(httpsOptions, app);


const io = new Server(httpsServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'], 
  },
});


const onlineUsers = new Map(); 


app.use('/api/auth', authRoutes);


app.get('/chat', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Sohbete hoş geldiniz!', userId: req.user.userId });
});


io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Kimlik doğrulama hatası'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new Error('Geçersiz token'));
    }
    socket.user = user; 
    next();
  });
});


io.on('connection', (socket) => {
  console.log(`Kullanıcı bağlandı: ${socket.user.userId}`);
  onlineUsers.set(socket.user.userId, socket.id); 

  socket.on('send_message', async ({ conversationId, recipientId, content }) => {
    try {
      const message = new Message({ conversationId, senderId: socket.user.userId, recipientId, content });
      await message.save();

      
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', message);
        message.status = 'delivered'; 
        await message.save();
      }
      socket.emit('message_status', { messageId: message._id, status: message.status });
    } catch (err) {
      console.error('Mesaj gönderilirken hata oluştu:', err);
    }
  });

  socket.on('broadcast_message', async ({ content }) => {
    try {
      const message = new Message({ senderId: socket.user.userId, content, recipientId: null });
      await message.save();
      io.emit('receive_message', message);
    } catch (err) {
      console.error('Yayın mesajı gönderilirken hata oluştu:', err);
    }
  });

  socket.on('message_read', async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        message.status = 'read';
        await message.save();
        const senderSocketId = onlineUsers.get(message.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_status', { messageId, status: 'read' });
        }
      }
    } catch (err) {
      console.error('Mesaj okundu durumu güncellenirken hata oluştu:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Kullanıcı bağlantısı kesildi: ${socket.user.userId}`);
    onlineUsers.delete(socket.user.userId); // Kullanıcıyı çevrimiçi kullanıcılar listesinden kaldır
  });
});

httpsServer.listen(PORT, () => {
  console.log(`Güvenli sunucu çalışıyor: https://localhost:${PORT}`);
});
