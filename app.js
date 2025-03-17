// app.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');

// Criar a aplicação Express
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('WhatsApp API está funcionando!');
});

// Exportar a aplicação
module.exports = app;