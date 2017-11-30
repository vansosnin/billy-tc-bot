const config = require('../config.json');

const buildStatuses = {
    success: 'SUCCESS',
    failure: 'FAILURE'
};

const getStatusEmoji = (status) => {
    switch (status) {
        case buildStatuses.success:
            return '✅';
        case buildStatuses.failure:
            return '❌';
        default:
            return status;
    }
};

module.exports = {
    DEFAULT_CRON_PATTERN: '0 0 9 * * 1-5',

    isAdmin: (chatId) => chatId === config['admin-chat-id'],

    prepareTestsToSave: (buildTypes) => {
        const preparedTests = {};

        for (const buildType of buildTypes) {
            const { id, status } = buildType;
            preparedTests[id] = status;
        }

        return preparedTests;
    },

    getTestsMessage: (buildTypes) => {
        let message = 'Результаты последнего запуска тестов:';

        for (const buildType of buildTypes) {
            const {
                name, status, webUrl, statusText
            } = buildType;
            if (!status) {
                message += `\n*—\u2009${name}:* ❓`;
            } else {
                message += `\n*—\u2009${name}:* ${getStatusEmoji(status)} \n_${statusText}_\n[Подробнее](${webUrl})`;
            }
        }

        return message;
    },

    stringifyLocator: (locator) => Object.keys(locator)
        .reduce((result, key) => `${result}${key}:${locator[key]},`, '')
        .slice(0, -1)
};