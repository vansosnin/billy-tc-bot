const winston = require('winston');

const { printf, timestamp, combine } = winston.format;

const chatFormat = printf((info) =>
    `${info.timestamp} [${info.level}]: ChatId ${info.chatId}. "${
        info.message
    }"`);

const logger = winston.createLogger({
    level: 'info',
    format: combine(timestamp(), chatFormat),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'info' })
    ]
});

module.exports = { logger };
