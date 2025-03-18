// services/whatsapp.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios'); // Para enviar requisições HTTP

const clients = new Map(); // Armazenar clientes por usuário
const messages = []; // Armazenar mensagens recebidas

function createClient(userId) {
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }), // Salvar a sessão localmente
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Adicione essas opções
        },
    });

    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log(`Cliente ${userId} está pronto!`);
    });

    client.on('message', async (message) => {
        console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
    
        // Obter detalhes da mensagem
        const messageDetails = {
            from: message.from, // Remetente
            body: message.body, // Corpo da mensagem (texto)
            timestamp: message.timestamp, // Data e hora da mensagem
            type: message.type, // Tipo de mensagem (texto, imagem, áudio, etc.)
            isMedia: message.hasMedia, // Se a mensagem contém mídia
            isGroupMsg: message.isGroupMsg, // Se a mensagem é de um grupo
            sender: {
                id: message.author || message.from, // ID do remetente
                name: message.sender?.pushname || 'Desconhecido', // Nome do remetente
            },
        };
    
        // Se a mensagem contém mídia, baixar a mídia
        if (message.hasMedia) {
            try {
                const media = await message.downloadMedia();
                messageDetails.media = {
                    mimetype: media.mimetype, // Tipo de mídia (ex: image/jpeg)
                    data: media.data, // Dados da mídia em base64
                    filename: media.filename, // Nome do arquivo (se disponível)
                };
            } catch (error) {
                console.error('Erro ao baixar mídia:', error);
            }
        }
    
        // Salvar a mensagem localmente
        messages.push(messageDetails);
    
        // Enviar a mensagem para o webhook
        try {
            await axios.post('http://localhost:3000/api/whatsapp/webhook', messageDetails);
            console.log('Mensagem enviada para o webhook com sucesso!');
            await axios.get('https://sisjud.com.br/tsrtech-api-receive');
            console.log('Mensagem enviada para o webhook com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar mensagem para o webhook:', error);
        }
    });

    client.on('auth_failure', (msg) => {
        console.error(`Falha na autenticação: ${msg}`);
        clients.delete(userId); // Remover cliente em caso de falha
    });

    client.on('disconnected', (reason) => {
        console.log(`Cliente ${userId} desconectado: ${reason}`);
        clients.delete(userId); // Remover cliente ao desconectar
    });

    client.initialize();
    clients.set(userId, client);
    return client;
}

// Verificar se o cliente está pronto
function isClientReady(userId) {
    const client = clients.get(userId);
    return client && client.info ? true : false;
}

module.exports = { createClient, clients, MessageMedia, messages, isClientReady };