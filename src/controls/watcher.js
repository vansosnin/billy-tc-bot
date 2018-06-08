const _ = require('lodash');

const Db = require('../db');
const TeamCity = require('../teamcity');
const Blame = require('./blame');
const logger = require('../logger');

const { prepareTestsToSave, getTestsMessage } = require('../utils');
const config = require('../../config.json');

class Watcher {
    constructor(messenger) {
        this._messenger = messenger;
        this._blame = new Blame(messenger);
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

    async checkLastBuild(chatId) {
        const chat = Db.getChatValue(chatId);

        try {
            const builds = await TeamCity.getTestsResults(chat.branch);
            Db.setTestsResult(chatId, prepareTestsToSave(builds));
            const enhancedBuilds = await this._blame.enhanceBuildTypes(
                builds,
                chat
            );
            this._messenger.sendMessage(
                chatId,
                this._getWatcherTestsMessage(chat.branch, enhancedBuilds),
                true
            );
        } catch (e) {
            this._messenger.reportTCError(chatId, e);
            logger.error({ chatId, message: e });
        }
    }

    _initWatcher(chatId) {
        this._timerMap[chatId] = setInterval(
            this._testsWatcher.bind(this, chatId),
            config['check-interval-ms']
        );
    }

    async _testsWatcher(chatId) {
        const chat = Db.getChatValue(chatId);

        const builds = await TeamCity.getTestsResults(chat.branch);
        const preparedTests = prepareTestsToSave(builds);

        if (_.isEqual(preparedTests, chat.lastTestsResult)) {
            return;
        }

        Db.setTestsResult(chatId, preparedTests);

        const enhancedBuilds = await this._blame.enhanceBuildTypes(
            builds,
            chat
        );
        this._messenger.sendMessage(
            chatId,
            this._getWatcherTestsMessage(chat.branch, enhancedBuilds),
            true
        );
    }

    _getWatcherTestsMessage(branch, builds) {
        return `Результаты последнего запуска тестов в *«${branch}»*: ${getTestsMessage(
            builds
        )}`;
    }
}

module.exports = Watcher;
