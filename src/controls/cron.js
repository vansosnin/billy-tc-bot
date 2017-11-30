const CronJob = require('cron').CronJob;

const Db = require('../db');
const TeamCity = require('../teamcity');
const { getTestsMessage, DEFAULT_CRON_PATTERN } = require('../utils');
const config = require('../../config.json');

class Cron {
    constructor(messenger) {
        this._messenger = messenger;
        this._cronMap = {};

        this._init();
    }

    _init() {
        const cronSetupChats = Db.getAllCronTasks();

        for (const chat of cronSetupChats) {
            this.set(chat.id, chat.cron);
        }
    }

    set(chatId, pattern) {
        return new Promise((resolve, reject) => {
            try {
                this.remove(chatId);

                const patternToSet = pattern || DEFAULT_CRON_PATTERN;
                this._cronMap[chatId] = new CronJob({
                    cronTime: patternToSet,
                    onTick: this._defaultBranchCronTask.bind(this, chatId)
                });
                this._cronMap[chatId].start();
                Db.setCron(chatId, patternToSet);

                resolve(patternToSet);
            } catch (e) {
                reject(e);
            }
        });
    }

    remove(chatId) {
        if (this._cronMap[chatId]) {
            this._cronMap[chatId].stop();
            delete this._cronMap[chatId];
        }

        Db.setCron(chatId, null);
    }

    _defaultBranchCronTask(chatId) {
        TeamCity.getTestsResults(config['default-branch']).then((tests) => {
            this._messenger.sendMessage(chatId, `📋 Отчет по тестам в *«${config['default-branch']}»*\n` + getTestsMessage(tests), true);
        });
    }
}

module.exports = Cron;