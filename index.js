const BotMechanics = require('./src/bot-mechanics.js');

/* eslint-disable */
const bot = new BotMechanics();

process.on('uncaughtException', (e) => {
    console.log('***** uncaughtException *****');
    console.log(e);
});
/* eslint-enable */
