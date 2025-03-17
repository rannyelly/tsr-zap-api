const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const clients = new Map(); // Armazenar clientes por usuário
const messages = []; // Armazenar mensagens recebidas

function createClient(userId) {
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: userId }), // Salvar a sessão localmente
        puppeteer: { headless: true },
    });

    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
    });

client.on('ready', () => {
    console.log(`Cliente ${userId} está pronto!`);
    console.log('Informações do cliente:', client.info); // Log das informações do cliente
});

    client.on('message', (message) => {
        console.log(`Mensagem recebida de ${message.from}: ${message.body}`);
        messages.push({ from: message.from, body: message.body }); // Salvar a mensagem
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