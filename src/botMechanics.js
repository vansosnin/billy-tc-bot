const TelegramBot = require('node-telegram-bot-api');
const _ = require('lodash');
const TeamCity = require('./teamcity');
const Db = require('./db');
const config = require('../config.json');

const buildStatuses = {
    success: 'SUCCESS',
    failure: 'FAILURE'
};

class BotMechanics {
    constructor() {
        this._db = new Db();
        this._bot = new TelegramBot(config['telegram-token'], {
            polling: true,
        });
        this._tc = new TeamCity();
        this._timerMap = {};

        this.init();
        this.addEventListeners();
    }

    init() {
        this.initWatchers();
        this.informAdmin();
    }

    initWatchers() {
        const watchers = this._db.getAllWatchers();

        if (watchers && watchers.length > 0) {
            for (let watcher of watchers) {
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

    informAdmin() {
        this.sendMessage(
            config['admin-chat-id'],
            '*⚡ Бот (пере)запущен ⚡*',
            true
        );
    }

    addEventListeners() {
        this._bot.onText(/\/start/, msg => {
            this._db.createChatUnobtrusive(msg.chat.id, msg.from);

            this.sendHelpMessage(msg.chat.id);
        });

        this._bot.onText(/\/help/, msg => {
            this.sendHelpMessage(msg.chat.id);
        });

        this._bot.onText(/\/branch (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const branch = match[1];

            this.setBranch(chatId, branch);

            this.sendMessage(chatId, `Ветка «*${branch}*» сохранена 👌`, true);
        });

        this._bot.onText(/\/tests/, msg => {
            this.checkLastUnitTest(msg.chat.id);
        });

        this._bot.onText(/\/watchon/, msg => {
            this.addBuildWatcher(msg.chat.id);
        });

        this._bot.onText(/\/watchoff/, msg => {
            this.removeBuildWatcher(msg.chat.id);
        });

        this._bot.onText(/\/status/, msg => {
            const chatId = msg.chat.id;

            this._bot.sendMessage(chatId, this.getStatusMessage(chatId), {
                parse_mode: 'Markdown'
            });
        });

        this._bot.onText(/\/broadcast (.+)/, (msg, match) => {
            if (this.isAdmin(msg.chat.id)) {
                const chats = this._db.getChats().value();

                for (let chat of chats) {
                    this.sendMessage(chat.id, match[1]);
                }
            }
        });
    }

    setBranch(chatId, branch) {
        this._db.setBranch(chatId, branch);
    }

    addBuildWatcher(chatId) {
        const chat = this._db.setWatching(chatId, true);

        this.initWatcher(chatId);

        this.sendMessage(
            chatId,
            `Смотрим за изменениями «*${chat.branch}*»`,
            true
        );
    }

    removeBuildWatcher(chatId) {
        const chat = this._db.setWatching(chatId, false);

        clearInterval(this._timerMap[chatId]);
        delete this._timerMap[chatId];

        this.sendMessage(
            chatId,
            `Больше не смотрим за изменениями «*${chat.branch}*»`,
            true
        );
    }

    testsWatcher(chatId) {
        const chat = this._db.getChatValue(chatId);

        this._tc.getTestsResults(chat.branch).then(tests => {
            const preparedTests = this.prepareTestsToSave(tests);

            if (_.isEqual(preparedTests, chat.lastTestsResult)) {
                return;
            }

            this._db.setTestsResult(chatId, preparedTests);

            this.sendMessage(chatId, this.getTestsMessage(tests), true);
        });
    }

    checkLastUnitTest(chatId) {
        const chat = this._db.getChatValue(chatId);

        return this._tc
            .getTestsResults(chat.branch)
            .then(buildTypes => {
                this._db.setTestsResult(chatId, this.prepareTestsToSave(buildTypes));

                this.sendMessage(chatId, this.getTestsMessage(buildTypes), true);
            })
            .catch(e => {
                this.reportError(chatId, e);
            });
    }

    getTestsMessage(buildTypes) {
        let message = 'Результаты последнего запуска тестов:';

        for (let buildType of buildTypes) {
            const { name, status, webUrl, statusText } = buildType;
            message += `\n*— ${name}:* ${this.getStatusEmoji(status)} \n_${statusText}_\n[Подробнее](${webUrl})`;
        }

        return message;
    }

    prepareTestsToSave(buildTypes) {
        const preparedTests = {};

        for (let buildType of buildTypes) {
            const { id, status } = buildType;
            preparedTests[id] = status;
        }

        return preparedTests;
    }

    getStatusEmoji(status) {
        switch (status) {
            case buildStatuses.success:
                return '✅';
            case buildStatuses.failure:
                return '❌';
            default:
                return status;
        }
    }

    getStatusMessage(chatId) {
        const chat = this._db.getChatValue(chatId);
        let message = '';

        message += `Ветка: ${chat.branch}`;

        if (chat.watch) {
            message += '\n👁 Большой брат следит';
        } else {
            message += '\n🕶 Большой брат не следит';
        }

        return message;
    }

    reportError(chatId, error) {
        const defaultErrorMessage =
            '⚠ Что-то пошло не так, проверь /status. А может быть, я просто не смог достучаться до TeamCity.';

        this.sendMessage(chatId, defaultErrorMessage + '\n' + error);
    }

    isAdmin(chatId) {
        return chatId === config['admin-chat-id'];
    }

    sendHelpMessage(chatId) {
        const message =
            '*Для начала*:' +
            '\n/branch `<BranchName>` - задать ветку. По умолчанию: ' +
            `_${config['default-branch']}_` +
            '\n\n*Потом можно так*:' +
            '\n/tests - проверить тесты' +
            '\n/watchon - наблюдать за билдами ветки' +
            '\n\n*А еще можно вот так*:' +
            '\n/status - проверить статус' +
            '\n/watchoff - отключить наблюдение за билдами ветки';

        this.sendMessage(chatId, message, true);
    }

    sendMessage(chatId, message, useMarkdown) {
        const fullOptions = { parse_mode: 'Markdown' };
        this._bot.sendMessage(chatId, message, useMarkdown ? fullOptions : {});

        const chat = this._db.getChatValue(chatId);
        if (!chat) {
            this._bot.sendMessage(
                chatId,
                'Тебя почему-то нет в базе, выполни, пожалуйста, /start'
            );
        }
    }
}

module.exports = BotMechanics;
