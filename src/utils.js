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

const buildCommitInfo = (commitId) => {
    if (config['git-commit-url-base']) {
        return `[этом коммите](${config['git-commit-url-base']}${commitId})`;
    }

    return `коммите ${commitId}`;
};

const getChangesMessage = (changes = []) => changes.map((change) => {
    const { username, version } = change;

    return `\n🔧 ${username} в ${buildCommitInfo(version)}`;
});

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
        let message = '';

        for (const buildType of buildTypes) {
            const { name, status, webUrl, statusText, changes } = buildType;

            if (!status) {
                message += `\n*—\u2009${name}:* ❓`;
            } else {
                message += `\n\n*—\u2009${name}:* ${getStatusEmoji(status)}`;
                message += `\n_${statusText}_`;
                message += `${getChangesMessage(changes)}`;
                message += `\n[Подробнее](${webUrl})`;
            }
        }

        return message;
    },

    stringifyLocator: (locator) => Object.keys(locator)
        .reduce((result, key) => `${result}${key}:${locator[key]},`, '')
        .slice(0, -1)
};
