// models/User.js
const users = []; // Armazenar usuários em memória

class User {
    constructor(phone, token) {
        this.phone = phone;
        this.token = token;
        this.session = null; // Armazenar a sessão do WhatsApp
    }

    static findByPhone(phone) {
        return users.find(user => user.phone === phone);
    }

    static create(phone, token) {
        const user = new User(phone, token);
        users.push(user);
        return user;
    }

    // Método para listar todos os usuários
    static getAll() {
        return users;
    }
}

module.exports = User;