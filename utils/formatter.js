// utils/formatter.js
function formatNumber(number) {
    // Remover o sufixo @c.us (caso exista)
    let formattedNumber = number.replace('@c.us', '');

    // Verificar se o número tem 13 dígitos (com o 9 extra após o DDD)
    if (formattedNumber.length === 13) {
        // Remover o 9 após o DDD (posição 4)
        formattedNumber = formattedNumber.slice(0, 4) + formattedNumber.slice(5);
    }

    return formattedNumber; // Retornar apenas o número formatado, sem @c.us
}

module.exports = { formatNumber };