const TelegramBot = require('node-telegram-bot-api');
const _ = require('lodash');

const TeamCity = require('./teamcity');
const Db = require('./db');
const Cron = require('./controls/cron');
const Messenger = require('./controls/messenger');
const { isAdmin, prepareTestsToSave, getTestsMessage, DEFAULT_CRON_PATTERN } = require('./utils');
const config = require('../config.json');

class BotMechanics {
    constructor() {
        this._bot = new TelegramBot(config['telegram-token'], {
            polling: true
        });
        this._messenger = new Messenger(this._bot);
        this._cron = new Cron(this._messenger);
        this._timerMap = {};

        this.init();
        this.addEventListeners();
    }

    init() {
        this.initWatchers();
        this._messenger.informAdmin();
    }

    initWatchers() {
        const watchers = Db.getAllWatchers();

        if (watchers && watchers.length > 0) {
            for (const watcher of watchers) {
                this.initWatcher(watcher.id);
            }
        }
    }

    initWatcher(chatId) {
        this._timerMap[chatId] = setInterval(
            this.testsWatcher.bind(this, chatId),
            config['check-interval-ms']
        );
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

            this.setBranch(chatId, branch);

            this._messenger.sendMessage(chatId, `Ветка «*${branch}*» сохранена 👌`, true);
        });

        this._bot.onText(/\/tests/, (msg) => {
            this.checkLastUnitTest(msg.chat.id);
        });

        this._bot.onText(/\/watchon/, (msg) => {
            this.addBuildWatcher(msg.chat.id);
        });

        this._bot.onText(/\/watchoff/, (msg) => {
            this.removeBuildWatcher(msg.chat.id);
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
                        `\nПопробуй по умолчанию (без аргументов - по будням в 9 утра) или почитай` +
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

    setBranch(chatId, branch) {
        Db.setBranch(chatId, branch);
    }

    addBuildWatcher(chatId) {
        const chat = Db.setWatching(chatId, true);

        this.initWatcher(chatId);

        this._messenger.sendMessage(
            chatId,
            `Смотрим за изменениями «*${chat.branch}*»`,
            true
        );
    }

    removeBuildWatcher(chatId) {
        const chat = Db.setWatching(chatId, false);

        clearInterval(this._timerMap[chatId]);
        delete this._timerMap[chatId];

        this._messenger.sendMessage(
            chatId,
            `Больше не смотрим за изменениями «*${chat.branch}*»`,
            true
        );
    }

    testsWatcher(chatId) {
        const chat = Db.getChatValue(chatId);

        TeamCity.getTestsResults(chat.branch).then((tests) => {
            const preparedTests = prepareTestsToSave(tests);

            if (_.isEqual(preparedTests, chat.lastTestsResult)) {
                return;
            }

            Db.setTestsResult(chatId, preparedTests);

            this._messenger.sendMessage(chatId, getTestsMessage(tests), true);
        });
    }

    checkLastUnitTest(chatId) {
        const chat = Db.getChatValue(chatId);

        return TeamCity
            .getTestsResults(chat.branch)
            .then((buildTypes) => {
                Db.setTestsResult(chatId, prepareTestsToSave(buildTypes));

                this._messenger.sendMessage(chatId, getTestsMessage(buildTypes), true);
            })
            .catch((e) => {
                this._messenger.reportTCError(chatId, e);
            });
    }
}

module.exports = BotMechanics;
