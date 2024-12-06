const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Message = require('./models/message');
const messageRoutes = require('./routes/messages'); 


const app = express();
const server = http.createServer(app);
const io = new Server(server);


mongoose.connect('mongodb://localhost:27017/messaging', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});


const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    
    socket.on('register', (userID) => {
        onlineUsers.set(userID, socket.id); 
    });

    
    socket.on('receiveMessage', async (message) => {
        const { messageID, senderID, recipientID, content } = message;

        
        const newMessage = new Message({ messageID, senderID, recipientID, content });
        await newMessage.save();

        
        io.to(socket.id).emit('statusUpdate', { messageID, status: 'delivered' });
    });

    
    socket.on('messageRead', async (messageID) => {
        await Message.updateOne({ messageID }, { status: 'read' });
        const message = await Message.findOne({ messageID });

        if (message) {
            const senderSocketID = onlineUsers.get(message.senderID);
            if (senderSocketID) {
                io.to(senderSocketID).emit('statusUpdate', { messageID, status: 'read' });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);
        for (const [userID, socketID] of onlineUsers.entries()) {
            if (socketID === socket.id) {
                onlineUsers.delete(userID);
                break;
            }
        }
    });
});

app.use(express.json()); 
app.use('/api/messages', messageRoutes); 

server.listen(3000, () => console.log('Sunucu 3000 portunda çalışıyor'));
