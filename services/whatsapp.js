// services/whatsapp.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configurações
const MAX_MESSAGES_PER_USER = 50; // Limite máximo de mensagens por usuário
const WEBHOOK_URL = 'http://localhost:3000/api/whatsapp/webhook';
const SECONDARY_WEBHOOK = 'https://sisjud.com.br/tsrtech-api-receive';

const clients = new Map(); // Armazenar clientes por usuário
const userMessages = new Map(); // Armazenar mensagens por usuário

async function sendToWebhooks(messageData) {
  try {
    // Enviar para webhook principal
    await axios.post(WEBHOOK_URL, messageData);
    console.log('Mensagem enviada para webhook principal');
    
    // Enviar para webhook secundário
    await axios.get(SECONDARY_WEBHOOK);
    console.log('Mensagem enviada para webhook secundário');
  } catch (error) {
    console.error('Erro ao enviar para webhooks:', error.message);
  }
}

function addMessage(userId, message) {
  if (!userMessages.has(userId)) {
    userMessages.set(userId, []);
  }

  const messages = userMessages.get(userId);
  messages.push({
    ...message,
    id: uuidv4(), // ID único para cada mensagem
    processedAt: new Date()
  });

  // Manter apenas as mensagens mais recentes
  if (messages.length > MAX_MESSAGES_PER_USER) {
    messages.shift(); // Remove a mensagem mais antiga
  }
}

function getMessages(userId, filter = {}) {
  if (!userMessages.has(userId)) return [];
  
  let messages = userMessages.get(userId);
  
  // Aplicar filtros
  if (filter.from) {
    messages = messages.filter(msg => msg.from === filter.from);
  }
  
  // Ordenar por timestamp (mais recente primeiro)
  return messages.sort((a, b) => b.timestamp - a.timestamp);
}

async function processMediaMessage(message) {
  try {
    const media = await message.downloadMedia();
    return {
      mimetype: media.mimetype,
      data: media.data,
      filename: media.filename || `media-${Date.now()}`,
      size: media.data?.length || 0
    };
  } catch (error) {
    console.error('Erro ao processar mídia:', error);
    return null;
  }
}

function createClient(userId) {
  // Verificar se já existe um cliente para este usuário
  if (clients.has(userId)) {
    console.log(`Cliente já existe para o usuário ${userId}`);
    return clients.get(userId);
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId }),
    puppeteer: { 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    takeoverOnConflict: true,
    restartOnAuthFail: true
  });

  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log(`QR Code gerado para o usuário ${userId}`);
  });

  client.on('ready', () => {
    console.log(`Cliente ${userId} está pronto!`);
    // Limpar mensagens antigas ao iniciar
    if (userMessages.has(userId)) {
      userMessages.set(userId, []);
    }
  });

  client.on('message', async (message) => {
    const startTime = Date.now();
    console.log(`Nova mensagem de ${message.from} para ${userId}`);

    try {
      const messageDetails = {
        userId,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        type: message.type,
        isMedia: message.hasMedia,
        isGroupMsg: message.isGroupMsg,
        sender: {
          id: message.author || message.from,
          name: message.sender?.pushname || 'Desconhecido',
        },
        media: null
      };

      if (message.hasMedia) {
        messageDetails.media = await processMediaMessage(message);
      }

      // Adicionar mensagem ao armazenamento
      addMessage(userId, messageDetails);

      // Enviar para webhooks em segundo plano (não bloquear a thread principal)
      sendToWebhooks(messageDetails).catch(console.error);

      console.log(`Mensagem processada em ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Erro ao processar mensagem: ${error.message}`);
    }
  });

  client.on('auth_failure', (msg) => {
    console.error(`Falha na autenticação (${userId}): ${msg}`);
    clients.delete(userId);
    userMessages.delete(userId);
  });

  client.on('disconnected', (reason) => {
    console.log(`Cliente desconectado (${userId}): ${reason}`);
    clients.delete(userId);
    // Manter as mensagens mesmo após desconexão
  });

  client.initialize();
  clients.set(userId, client);
  
  return client;
}

function isClientReady(userId) {
  const client = clients.get(userId);
  return client?.info ? true : false;
}

function cleanupUserData(userId) {
  if (clients.has(userId)) {
    clients.get(userId).destroy();
    clients.delete(userId);
  }
  userMessages.delete(userId);
}

module.exports = {
  createClient,
  clients,
  MessageMedia,
  getMessages,
  isClientReady,
  cleanupUserData
};