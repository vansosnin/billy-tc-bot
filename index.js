const TelegramBot = require('node-telegram-bot-api');
const BotMechanics = require('./src/botMechanics.js');
const config = require('./config.json');

const bot = new TelegramBot(config['telegram-token'], { polling: true });
const botMechanics = new BotMechanics();

const defaultErrorMessage = '⚠ Что-то пошло не так, проверь /status';

bot.onText(/(\/start)|(\/help)/, msg => {
    let message = 'Доступные комманды:' +
        '\n/ping - проверить доступность' +
        '\n/status - проверить статус' +
        '\n/branch <BranchName> - задать ветку' +
        '\n/tests - проверить тесты';

    bot.sendMessage(msg.chat.id, message);
});

bot.onText(/\/ping/, msg => {
    bot.sendMessage(msg.chat.id, "Я здесь 👋");
});

bot.onText(/\/branch (.+)/, function (msg, match) {
    const branch = match[1];
    botMechanics.setBranch(branch);
    botMechanics.initTeamCityClient();

    bot.sendMessage(msg.chat.id, `Ветка «${branch}» сохранена 👌`);
});

bot.onText(/\/tests/, msg => {
    botMechanics
        .checkLastUnitTest()
        .then(message => {
            bot.sendMessage(msg.chat.id, message, {'parse_mode': 'Markdown'});
        })
        .catch(e => {
            bot.sendMessage(msg.chat.id, defaultErrorMessage + '\n' + e);
        });
});

bot.onText(/\/status/, msg => {
    bot.sendMessage(msg.chat.id, botMechanics.getStatusMessage());
});
