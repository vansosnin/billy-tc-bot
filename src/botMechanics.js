const TelegramBot = require('node-telegram-bot-api');
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
        this._bot = new TelegramBot(config['telegram-token'], { polling: true });
        this._tc = new TeamCity();
        this._timerMap = {};

        this._initWatchers();
        this.addEventListeners();
    }

    _initWatchers() {
        const watchers = this._db.getAllWatchers();

        if (watchers && watchers.length > 0) {
            for (let watcher of watchers) {
                this._initWatcher(watcher.id);
            }
        }
    }

    _initWatcher(chatId) {
        this._timerMap[chatId] = setInterval(
            this.testsWatcher.bind(this, chatId),
            config['check-interval-ms']
        );
    }

    addEventListeners() {
        this._bot.onText(/\/start/, msg => {
            this._db.createChat(msg.chat.id, msg.from);

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

            this._bot.sendMessage(chatId, this.getStatusMessage(chatId), { 'parse_mode': 'Markdown' });
        });
    }

    setBranch(chatId, branch) {
        this._db.setBranch(chatId, branch);
    }

    addBuildWatcher(chatId) {
        const chat = this._db.setWatching(chatId, true);

        this._initWatcher(chatId);

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
        const chat = this._db.chatRecordValue(chatId);

        this._tc.getLastUnitTest(chat.branch)
            .then(test => {
                const { status, webUrl } = test;
                let message = '';

                if (status === chat.lastTestsResult) {
                    return;
                }

                message += this.getStatusEmoji(status) + ' ';

                if (status === buildStatuses.success) {
                    message += 'Ура! Тесты зеленые!';
                } else if (status === buildStatuses.failure) {
                    message += 'Тесты упали, поднимите, будьте любезны';
                }

                message += ' ';
                message += `[Подробнее](${webUrl})`;

                this._db.setTestsResult(chatId, status);

                this.sendMessage(chatId, message, true);
            });
    }

    checkLastUnitTest(chatId) {
        const chat = this._db.chatRecordValue(chatId);

        return this._tc.getLastUnitTest(chat.branch)
            .then(test => {
                const { status, webUrl } = test;
                this._db.setTestsResult(chatId, status);

                let message = 'Результат последнего запуска тестов: ';
                message += this.getStatusEmoji(status) + ' ';
                message += `[Подробнее](${webUrl})`;

                this.sendMessage(chatId, message, true);
            })
            .catch(e => {
                this.reportError(chatId, e);
            });
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
        const chat = this._db.chatRecordValue(chatId);
        let message = '';

        message += `✅ Ветка: ${chat.branch}`;

        if (chat.watch) {
            message += '\n👁 Большой брат следит';
        } else {
            message += '\n🕶 Большой брат не следит';
        }

        return message;
    }

    reportError(chatId, error) {
        const defaultErrorMessage = '⚠ Что-то пошло не так, проверь /status. А может быть, я просто не смог достучаться до TeamCity.';

        this.sendMessage(chatId, defaultErrorMessage + '\n' + error);
    }

    sendHelpMessage(chatId) {
        const message = '*Для начала*:' +
            '\n/branch `<BranchName>` - задать ветку. По умолчанию: ' + `_${config['default-branch']}_` +
            '\n\n*Потом можно так*:' +
            '\n/tests - проверить тесты' +
            '\n/watchon - наблюдать за билдами ветки' +
            '\n\n*А еще можно вот так*:' +
            '\n/status - проверить статус' +
            '\n/watchoff - отключить наблюдение за билдами ветки';

        this.sendMessage(chatId, message, true);
    }

    sendMessage(chatId, message, useMarkdown) {
        const fullOptions = { 'parse_mode': 'Markdown' };
        this._bot.sendMessage(chatId, message, useMarkdown ? fullOptions : {});
    }
}

module.exports = BotMechanics;
