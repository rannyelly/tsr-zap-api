// server.js
const app = require('./app');
const { createClient } = require('./services/whatsapp');
const User = require('./models/User');
const PORT = process.env.PORT || 3000;

// Reinicializar clientes ao iniciar a aplicação
const users = User.getAll(); // Listar todos os usuários
users.forEach(user => {
    createClient(user.phone); // Reinicializar o cliente para cada usuário
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});