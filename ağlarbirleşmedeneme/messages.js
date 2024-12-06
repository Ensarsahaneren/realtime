const express = require('express');
const Message = require('../models/message');
const router = express.Router();


router.get('/history/:userID', async (req, res) => {
    const { userID } = req.params;
    try {
        const messages = await Message.find({
            $or: [{ senderID: userID }, { recipientID: userID }]
        }).sort({ timestamp: -1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Mesaj geçmişi alınırken bir hata oluştu' });
    }
});


router.put('/:messageID', async (req, res) => {
    const { messageID } = req.params;
    const { content } = req.body;

    try {
        const updatedMessage = await Message.findOneAndUpdate(
            { messageID },
            { content },
            { new: true }
        );

        if (updatedMessage) {
            res.status(200).json(updatedMessage);
        } else {
            res.status(404).json({ error: 'Mesaj bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Mesaj güncellenirken bir hata oluştu' });
    }
});

router.delete('/:messageID', async (req, res) => {
    const { messageID } = req.params;

    try {
        const deletedMessage = await Message.findOneAndDelete({ messageID });

        if (deletedMessage) {
            res.status(200).json({ message: 'Mesaj silindi' });
        } else {
            res.status(404).json({ error: 'Mesaj bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Mesaj silinirken bir hata oluştu' });
    }
});

module.exports = router;
