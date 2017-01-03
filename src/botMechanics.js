const TeamCity = require('./teamcity.js');

const buildStatuses = {
    success: 'SUCCESS',
    failure: 'FAILURE'
};

class BotMechanics {
    constructor() {
        this._tc = null;
        this._branch = null;
    }

    setBranch(branch) {
        this._branch = branch;
    }

    initTeamCityClient() {
        this._tc = new TeamCity(this._branch);
    }

    checkLastUnitTest() {
        return this._tc.getLastUnitTest()
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

    getStatusMessage() {
        let message = '';

        if (this._branch) {
            message += `Ветка: ${this._branch}`;
        } else {
            message += 'Ветка не задана. Используй /branch, Люк!'
        }

        if (this._tc) {
            message += '\nКлиент TeamCity проинициализирован';
        } else {
            message += '\nКлиент TeamCity не проинициализирован. Используй /branch, Люк!';
        }

        return message;
    }
}

module.exports = BotMechanics;
