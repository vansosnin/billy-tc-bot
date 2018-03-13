const _ = require('lodash');

const Db = require('../db');
const TeamCity = require('../teamcity');

const { prepareTestsToSave, getTestsMessage } = require('../utils');
const config = require('../../config.json');

const _getWatcherTestsMessage = (branch, buildTypes) => `
    Результаты последнего запуска тестов в *«${branch}»*:\n${getTestsMessage(buildTypes)}
`;

class Watcher {
    constructor(messenger) {
        this._messenger = messenger;
        this._timerMap = {};

        this._init();
    }

    _init() {
        const watchers = Db.getAllWatchers();

        if (watchers && watchers.length > 0) {
            for (const watcher of watchers) {
                this._initWatcher(watcher.id);
            }
        }
    }

    add(chatId) {
        const chat = Db.setWatching(chatId, true);

        this._initWatcher(chatId);

        this._messenger.sendMessage(
            chatId,
            `Смотрим за изменениями «*${chat.branch}*»`,
            true
        );
    }

    remove(chatId) {
        const chat = Db.setWatching(chatId, false);

        clearInterval(this._timerMap[chatId]);
        delete this._timerMap[chatId];

        this._messenger.sendMessage(
            chatId,
            `Больше не смотрим за изменениями «*${chat.branch}*»`,
            true
        );
    }

    checkLastBuild(chatId) {
        const chat = Db.getChatValue(chatId);

        return TeamCity
            .getTestsResults(chat.branch)
            .then((buildTypes) => {
                Db.setTestsResult(chatId, prepareTestsToSave(buildTypes));

                this._messenger.sendMessage(chatId, _getWatcherTestsMessage(chat.branch, buildTypes), true);
            })
            .catch((e) => {
                this._messenger.reportTCError(chatId, e);
            });
    }

    _initWatcher(chatId) {
        this._timerMap[chatId] = setInterval(
            this._testsWatcher.bind(this, chatId),
            config['check-interval-ms']
        );
    }

    _testsWatcher(chatId) {
        const chat = Db.getChatValue(chatId);

        TeamCity.getTestsResults(chat.branch).then((tests) => {
            const preparedTests = prepareTestsToSave(tests);

            if (_.isEqual(preparedTests, chat.lastTestsResult)) {
                return;
            }

            Db.setTestsResult(chatId, preparedTests);

            this._messenger.sendMessage(chatId, _getWatcherTestsMessage(chat.branch, tests), true);
        });
    }
}

module.exports = Watcher;
