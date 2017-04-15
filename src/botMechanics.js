const TelegramBot = require('node-telegram-bot-api');
const TeamCity = require('./teamcity.js');
const config = require('../config.json');

const buildStatuses = {
    success: 'SUCCESS',
    failure: 'FAILURE'
};

class BotMechanics {
    constructor() {
        this._bot = new TelegramBot(config['telegram-token'], { polling: true });
        this._tcMap = {
            default: new TeamCity(config['default-branch'])
        };
        this._branchMap = {
            default: config['default-branch']
        };
        this._timerMap = {};
        this._lastTestStatusMap = {};

        this.addEventListeners();
    }

    addEventListeners() {
        this._bot.onText(/(\/start)|(\/help)/, msg => {
            const message = '*Для начала*:' +
                '\n/branch `<BranchName>` - задать ветку' +
                '\n\n*Потом можно так*:' +
                '\n/tests - проверить тесты' +
                '\n/watchon - наблюдать за билдами ветки' +
                '\n\n*А еще можно вот так*:' +
                '\n/status - проверить статус' +
                '\n/watchoff - отключить наблюдение за билдами ветки';

            this.sendMessage(msg.chat.id, message, true);
        });

        this._bot.onText(/\/branch (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const branch = match[1];

            this.setBranch(chatId, branch);
            this.initTeamCityClient(chatId);

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

            this._bot.sendMessage(chatId, this.getStatusMessage(chatId), {'parse_mode': 'Markdown'});
        });
    }

    setBranch(chatId, branch) {
        this._branchMap[chatId] = branch;
    }

    initTeamCityClient(chatId) {
        this._tcMap[chatId] = new TeamCity(this._branchMap[chatId]);
    }

    addBuildWatcher(chatId) {
        this._timerMap[chatId] = setInterval(
            this.testsWatcher.bind(this, chatId),
            config['check-interval-ms']
        );

        this.sendMessage(
            chatId,
            `Смотрим за изменениями «*${this._branchMap[chatId] || this._branchMap.default}*»`,
            true
        );
    }

    removeBuildWatcher(chatId) {
        clearInterval(this._timerMap[chatId]);
        delete this._timerMap[chatId];

        this.sendMessage(
            chatId,
            `Больше не смотрим за изменениями «*${this._branchMap[chatId] || this._branchMap.default}*»`,
            true
        );
    }

    testsWatcher(chatId) {
        const tc = this._tcMap[chatId] || this._tcMap.default;

        tc.getLastUnitTest()
            .then(test => {
                const { status, webUrl } = test;
                let message = '';

                if (status === this._lastTestStatusMap[chatId]) {
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

                this._lastTestStatusMap[chatId] = status;
                this.sendMessage(chatId, message, true);
            });
    }

    checkLastUnitTest(chatId) {
        const tc = this._tcMap[chatId] || this._tcMap.default;

        return tc.getLastUnitTest()
            .then(test => {
                const { status, webUrl } = test;
                this._lastTestStatusMap[chatId] = status;

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
        let message = '';

        if (this._branchMap[chatId]) {
            message += `✅ Ветка: ${this._branchMap[chatId]}`;
        } else {
            message += `❌ Ветка не задана. Используется ветка по умолчанию: «*${this._branchMap.default}*». Используй /branch, Люк!`
        }

        if (this._tcMap[chatId]) {
            message += '\n✅ Клиент TeamCity проинициализирован';
        } else {
            message += '\n❌ Клиент TeamCity не проинициализирован. Используй /branch, Люк!';
        }

        if (this._timerMap[chatId]) {
            message += '\n👁 Большой брат следит';
        } else {
            message += '\n🕶 Большой брат не следит';
        }

        return message;
    }

    reportError(chatId, error) {
        const defaultErrorMessage = '⚠ Что-то пошло не так, проверь /status. А может быть я просто не смог достучаться до TeamCity.';

        this.sendMessage(chatId, defaultErrorMessage + '\n' + error);
    }

    sendMessage(chatId, message, useMarkdown) {
        const fullOptions = {'parse_mode': 'Markdown'};
        this._bot.sendMessage(chatId, message, useMarkdown ? fullOptions : {});

        if (!this._tcMap[chatId] && !this._branchMap[chatId]) {
            this._bot.sendMessage(chatId, this.getStatusMessage(chatId), fullOptions);
        }
    }
}

module.exports = BotMechanics;
