const TelegramBot = require('node-telegram-bot-api');
const BotMechanics = require('./src/botMechanics.js');
const config = require('./config.json');

const bot = new TelegramBot(config['telegram-token'], { polling: true });
const botMechanics = new BotMechanics(bot);

bot.onText(/(\/start)|(\/help)/, msg => {
    const message = 'Доступные комманды:' +
        '\n/ping - проверить доступность' +
        '\n/status - проверить статус' +
        '\n/branch `<BranchName>` - задать ветку' +
        '\n/tests - проверить тесты' +
        '\n/watchon - наблюдать за билдами ветки' +
        '\n/watchoff - отключить наблюдение за билдами ветки';

    bot.sendMessage(msg.chat.id, message, {'parse_mode': 'Markdown'});
});

bot.onText(/\/ping/, msg => {
    bot.sendMessage(msg.chat.id, "Я здесь 👋");
});

bot.onText(/\/branch (.+)/, function (msg, match) {
    const chatId = msg.chat.id;
    const branch = match[1];

    botMechanics.setBranch(chatId, branch);
    botMechanics.initTeamCityClient(chatId);

    bot.sendMessage(chatId, `Ветка «${branch}» сохранена 👌`);
});

bot.onText(/\/tests/, msg => {
    botMechanics.checkLastUnitTest(msg.chat.id);
});

bot.onText(/\/watchon/, msg => {
    botMechanics.addBuildWatcher(msg.chat.id);
});

bot.onText(/\/watchoff/, msg => {
    botMechanics.removeBuildWatcher(msg.chat.id);
});

bot.onText(/\/status/, msg => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, botMechanics.getStatusMessage(chatId), {'parse_mode': 'Markdown'});
});
