const BotMechanics = require('./src/botMechanics.js');

const bot = new BotMechanics();

process.on('uncaughtException', e => {
    console.log(e);
});
