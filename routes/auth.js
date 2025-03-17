// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createClient, isClientReady } = require('../services/whatsapp');
const QRCode = require('qrcode');
const router = express.Router();

// Gerar QR Code e autenticar
router.post('/login', async (req, res) => {
    const { phone } = req.body;

    // Verificar se o usuário já existe
    let user = User.findByPhone(phone);
    if (!user) {
        // Criar um novo usuário
        const token = jwt.sign({ phone }, 'seu_segredo', { expiresIn: '1h' });
        user = User.create(phone, token);
    }

    // Verificar se o cliente já está autenticado
    if (isClientReady(user.phone)) {
        return res.json({ message: 'Cliente já autenticado.' });
    }

    // Criar cliente WhatsApp para o usuário
    const client = createClient(user.phone);

    // Gerar QR Code como imagem
    client.on('qr', async (qr) => {
        const qrImage = await QRCode.toDataURL(qr); // Gerar QR Code como base64
        res.json({ qrImage }); // Enviar o QR Code na resposta
    });

    // Finalizar a requisição se o cliente já estiver autenticado
    client.on('ready', () => {
        if (!res.headersSent) {
            res.json({ message: 'Cliente já autenticado.' });
        }
    });

    // Tratar erros de autenticação
    client.on('auth_failure', (msg) => {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Falha na autenticação', details: msg });
        }
    });

    // Tratar desconexões
    client.on('disconnected', (reason) => {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Cliente desconectado', details: reason });
        }
    });
});

module.exports = router;