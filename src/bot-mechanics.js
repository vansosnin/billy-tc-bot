const TelegramBot = require('node-telegram-bot-api');

const Db = require('./db');
const Cron = require('./controls/cron');
const Watcher = require('./controls/watcher');
const Messenger = require('./controls/messenger');

const { isAdmin } = require('./utils');
const config = require('../config.json');

class BotMechanics {
    constructor() {
        this._bot = new TelegramBot(config['telegram-token'], {
            polling: true
        });
        this._messenger = new Messenger(this._bot);
        this._cron = new Cron(this._messenger);
        this._watcher = new Watcher(this._messenger);

        this.init();
        this.addEventListeners();
    }

    init() {
        this._messenger.informAdmin();
    }

    addEventListeners() {
        this._bot.onText(/\/start/, (msg) => {
            Db.createChatUnobtrusive(msg.chat.id, msg.from);

            this._messenger.sendHelpMessage(msg.chat.id);
        });

        this._bot.onText(/\/help/, (msg) => {
            this._messenger.sendHelpMessage(msg.chat.id);
        });

        this._bot.onText(/\/branch (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const branch = match[1];

            Db.setBranch(chatId, branch);

            this._messenger.sendMessage(chatId, `Ветка «*${branch}*» сохранена 👌`, true);
        });

        this._bot.onText(/\/tests/, (msg) => {
            this._watcher.checkLastBuild(msg.chat.id);
        });

        this._bot.onText(/\/watchon/, (msg) => {
            this._watcher.add(msg.chat.id);
        });

        this._bot.onText(/\/watchoff/, (msg) => {
            this._watcher.remove(msg.chat.id);
        });

        this._bot.onText(/\/status/, (msg) => {
            const chatId = msg.chat.id;

            this._messenger.sendStatusMessage(chatId);
        });

        this._bot.onText(/\/receivereports(.*)/, (msg, match) => {
            const chatId = msg.chat.id;
            this._cron.set(chatId, match[1])
                .then((result) => {
                    this._messenger.sendMessage(chatId, "✅ Планировщик настроен: " + result);
                })
                .catch((err) => {
                    this._messenger.sendMessage(
                        chatId,
                        '❌ Неверный формат Cron' +
                        `\nПопробуй по умолчанию (без аргументов — по будням в 9 утра) или почитай` +
                        ' [какую-нибудь документацию](http://www.nncron.ru/help/RU/working/cron-format.htm).',
                        true
                    );

                    console.error(err);
                });
        });

        this._bot.onText(/\/removereports/, (msg) => {
            const chatId = msg.chat.id;
            this._cron.remove(chatId);
            this._messenger.sendMessage(chatId, "✅ Планировщик удален");
        });

        this._bot.onText(/\/broadcast (.+)/, (msg, match) => {
            if (isAdmin(msg.chat.id)) {
                const chats = Db.getChats().value();

                for (const chat of chats) {
                    this._messenger.sendMessage(chat.id, match[1]);
                }
            }
        });
    }
}

module.exports = BotMechanics;
