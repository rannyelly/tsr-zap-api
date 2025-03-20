// routes/whatsapp.js
const express = require('express');
const { clients, MessageMedia, isClientReady, messages } = require('../services/whatsapp');
const { formatNumber } = require('../utils/formatter');
const router = express.Router();

// Endpoint para receber mensagens via webhook
router.post('/webhook', (req, res) => {
    const { from, body, timestamp, type, isMedia, isGroupMsg, sender, media } = req.body;

    if (!from || !body) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Salvar a mensagem recebida
    messages.push({
        from,
        body,
        timestamp,
        type,
        isMedia,
        isGroupMsg,
        sender,
        media,
    });

    console.log(`Mensagem recebida de ${from} (${sender.name}): ${body}`);
    console.log('Detalhes da mensagem:', {
        timestamp,
        type,
        isMedia,
        isGroupMsg,
        media: media ? `[${media.mimetype}]` : 'Nenhuma',
    });

    // Responder com sucesso
    res.json({ success: true });
});

// Enviar mensagem de texto
router.post('/send', async (req, res) => {
    const { userId, to, message } = req.body;
    const client = clients.get(userId);

    if (!client) {
        console.error(`Cliente não encontrado para o userId: ${userId}`);
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se o cliente está autenticado
    if (!isClientReady(userId)) {
        console.error(`Cliente não autenticado para o userId: ${userId}`);
        return res.status(400).json({ error: 'Cliente não está autenticado.' });
    }

    try {
        const formattedTo = formatNumber(to); // Formatar o número
        const recipient = `${formattedTo}@c.us`; // Adicionar @c.us apenas uma vez
        console.log(`Enviando mensagem para: ${recipient}`);
        await client.sendMessage(recipient, message); // Enviar a mensagem
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem', details: error.message });
    }
});

// Enviar mídia (imagem, documento, etc.)
router.post('/send-media', async (req, res) => {
    const { userId, to, file, caption } = req.body;
    const client = clients.get(userId);

    if (!client) {
        console.error(`Cliente não encontrado para o userId: ${userId}`);
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se o cliente está autenticado
    if (!isClientReady(userId)) {
        console.error(`Cliente não autenticado para o userId: ${userId}`);
        return res.status(400).json({ error: 'Cliente não está autenticado.' });
    }

    try {
        const media = await MessageMedia.fromUrl(file); // Baixar a mídia da URL
        const formattedTo = formatNumber(to); // Formatar o número
        const recipient = `${formattedTo}@c.us`; // Adicionar @c.us apenas uma vez
        console.log(`Enviando mídia para: ${recipient}`);
        await client.sendMessage(recipient, media, { caption }); // Enviar a mídia
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao enviar mídia:', error);
        res.status(500).json({ error: 'Erro ao enviar mídia', details: error.message });
    }
});

// Listar mensagens recebidas
router.get('/messages', async (req, res) => {
    const { userId } = req.query;
    const client = clients.get(userId);

    if (!client) {
        console.error(`Cliente não encontrado para o userId: ${userId}`);
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ messages });
});

router.get('/messages/:from', async (req, res) => {
    const { userId } = req.query;
    const { from } = req.params; // Número do remetente

    const client = clients.get(userId);

    if (!client) {
        console.error(`Cliente não encontrado para o userId: ${userId}`);
        return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Filtrar mensagens pelo número do remetente
    const filteredMessages = messages.filter(msg => msg.from === from);

    res.json({ messages: filteredMessages });
});

module.exports = router;