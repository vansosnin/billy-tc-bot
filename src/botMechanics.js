const TeamCity = require('./teamcity.js');

const buildStatuses = {
    success: 'SUCCESS',
    failure: 'FAILURE'
};

class BotMechanics {
    constructor() {
        this._tc = {};
        this._branch = {};
    }

    setBranch(chatId, branch) {
        this._branch[chatId] = branch;
    }

    getBranch(chatId) {
        return this._branch[chatId];
    }

    initTeamCityClient(chatId) {
        this._tc[chatId] = new TeamCity(this._branch[chatId]);
    }

    checkLastUnitTest(chatId) {
        return this._tc[chatId].getLastUnitTest()
            .then(test => {
                const { status, webUrl } = test;
                let message = 'Последний запуск тестов: ';
                message += this.getStatusEmoji(status) + ' ';
                message += `[Подробнее](${webUrl})`;

                return message;
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

        if (this._branch[chatId]) {
            message += `✅ Ветка: ${this._branch[chatId]}`;
        } else {
            message += '❌ Ветка не задана. Используй /branch, Люк!'
        }

        if (this._tc[chatId]) {
            message += '\n✅ Клиент TeamCity проинициализирован';
        } else {
            message += '\n❌ Клиент TeamCity не проинициализирован. Используй /branch, Люк!';
        }

        return message;
    }
}

module.exports = BotMechanics;
