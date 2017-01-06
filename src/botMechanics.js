const TeamCity = require('./teamcity.js');
const config = require('../config.json');

const buildStatuses = {
    success: 'SUCCESS',
    failure: 'FAILURE'
};

class BotMechanics {
    constructor(bot) {
        this._bot = bot;
        this._tcMap = {
            default: new TeamCity(config['default-branch'])
        };
        this._branchMap = {
            default: config['default-branch']
        };
        this._timerMap = {};
        this._lastTestStatusMap = {};
        this._defaultErrorMessage = '⚠ Что-то пошло не так, проверь /status';
    }

    setBranch(chatId, branch) {
        this._branchMap[chatId] = branch;
    }

    getBranch(chatId) {
        return this._branchMap[chatId];
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
            `Смотрим за изменениями _${this._branchMap[chatId]}_`,
            {'parse_mode': 'Markdown'}
        );
    }

    removeBuildWatcher(chatId) {
        clearInterval(this._timerMap[chatId]);
        delete this._timerMap[chatId];

        this.sendMessage(
            chatId,
            `Больше не смотрим за изменениями _${this._branchMap[chatId]}_`,
            {'parse_mode': 'Markdown'}
        );
    }

    testsWatcher(chatId) {
        const tc = this._tcMap[chatId] || this._tcMap.default;

        tc.getLastUnitTest()
            .then(test => {
                const { status, webUrl } = test;
                let message = '';

                console.log('old status', this._lastTestStatusMap[chatId]);
                console.log('new status', status);
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
                this.sendMessage(chatId, message, {'parse_mode': 'Markdown'});
            })
            .catch(e => {
                this.reportError(chatId, e);
            });
    }

    checkLastUnitTest(chatId) {
        const tc = this._tcMap[chatId] || this._tcMap.default;

        return tc.getLastUnitTest()
            .then(test => {
                const { status, webUrl } = test;
                this._lastTestStatusMap[chatId] = status;

                let message = 'Последний запуск тестов: ';
                message += this.getStatusEmoji(status) + ' ';
                message += `[Подробнее](${webUrl})`;

                this.sendMessage(chatId, message, {'parse_mode': 'Markdown'});
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
            message += `❌ Ветка не задана. Используется ветка по умолчанию: _${config['default-branch']}_. Используй /branch, Люк!`
        }

        if (this._tcMap[chatId]) {
            message += '\n✅ Клиент TeamCity проинициализирован';
        } else {
            message += '\n❌ Клиент TeamCity не проинициализирован. Используй /branch, Люк!';
        }

        return message;
    }

    reportError(chatId, error) {
        this.sendMessage(chatId, this._defaultErrorMessage + '\n' + error);
    }

    sendMessage(chatId, message, options = {}) {
        this._bot.sendMessage(chatId, message, options);

        if (!this._tcMap[chatId] && !this._branchMap[chatId]) {
            this._bot.sendMessage(chatId, this.getStatusMessage(chatId), {'parse_mode': 'Markdown'});
        }
    }
}

module.exports = BotMechanics;
