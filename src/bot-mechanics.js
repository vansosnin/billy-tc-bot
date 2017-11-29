const TelegramBot = require('node-telegram-bot-api');
const _ = require('lodash');
const CronJob = require('cron').CronJob;

const TeamCity = require('./teamcity');
const Db = require('./db');
const { isAdmin, prepareTestsToSave, getTestsMessage, DEFAULT_CRON_PATTERN } = require('./utils');
const config = require('../config.json');

class BotMechanics {
    constructor() {
        this._db = new Db();
        this._bot = new TelegramBot(config['telegram-token'], {
            polling: true
        });
        this._tc = new TeamCity();
        this._timerMap = {};
        this._cronMap = {};

        this.init();
        this.addEventListeners();
    }

    init() {
        this.initWatchers();
        this.initCron();
        this.informAdmin();
    }

    initWatchers() {
        const watchers = this._db.getAllWatchers();

        if (watchers && watchers.length > 0) {
            for (const watcher of watchers) {
                this.initWatcher(watcher.id);
            }
        }
    }

    initWatcher(chatId) {
        this._timerMap[chatId] = setInterval(
            this.testsWatcher.bind(this, chatId),
            config['check-interval-ms']
        );
    }

    initCron() {
        const cronSetupChats = this._db.getAllCronTasks();

        for (const chat of cronSetupChats) {
            this.setCron(chat.id, chat.cron);
        }
    }

    informAdmin() {
        this.sendMessage(
            config['admin-chat-id'],
            '*⚡ Бот (пере)запущен ⚡*',
            true
        );
    }

    addEventListeners() {
        this._bot.onText(/\/start/, (msg) => {
            this._db.createChatUnobtrusive(msg.chat.id, msg.from);

            this.sendHelpMessage(msg.chat.id);
        });

        this._bot.onText(/\/help/, (msg) => {
            this.sendHelpMessage(msg.chat.id);
        });

        this._bot.onText(/\/branch (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const branch = match[1];

            this.setBranch(chatId, branch);

            this.sendMessage(chatId, `Ветка «*${branch}*» сохранена 👌`, true);
        });

        this._bot.onText(/\/tests/, (msg) => {
            this.checkLastUnitTest(msg.chat.id);
        });

        this._bot.onText(/\/watchon/, (msg) => {
            this.addBuildWatcher(msg.chat.id);
        });

        this._bot.onText(/\/watchoff/, (msg) => {
            this.removeBuildWatcher(msg.chat.id);
        });

        this._bot.onText(/\/status/, (msg) => {
            const chatId = msg.chat.id;

            this._bot.sendMessage(chatId, this.getStatusMessage(chatId), {
                parse_mode: 'Markdown'
            });
        });

        this._bot.onText(/\/receivereports(.*)/, (msg, match) => {
            const chatId = msg.chat.id;
            const result = this.setCron(chatId, match[1]);

            if (result) {
                this.sendMessage(chatId, "✅ Планировщик настроен: " + result);
            } else {
                this.sendMessage(
                    chatId,
                    `
                        ❌ Неверный формат Cron.
                        Попробуй по умолчанию *${DEFAULT_CRON_PATTERN}* или почитай
                        [какую-нибудь документацию](http://www.nncron.ru/help/RU/working/cron-format.htm).
                    `,
                    true
                );
            }
        });

        this._bot.onText(/\/removereports/, (msg) => {
            const chatId = msg.chat.id;
            this.removeCron(chatId);
            this.sendMessage(chatId, "✅ Планировщик удален");
        });

        this._bot.onText(/\/broadcast (.+)/, (msg, match) => {
            if (isAdmin(msg.chat.id)) {
                const chats = this._db.getChats().value();

                for (const chat of chats) {
                    this.sendMessage(chat.id, match[1]);
                }
            }
        });
    }

    setBranch(chatId, branch) {
        this._db.setBranch(chatId, branch);
    }

    addBuildWatcher(chatId) {
        const chat = this._db.setWatching(chatId, true);

        this.initWatcher(chatId);

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
        const chat = this._db.getChatValue(chatId);

        this._tc.getTestsResults(chat.branch).then((tests) => {
            const preparedTests = prepareTestsToSave(tests);

            if (_.isEqual(preparedTests, chat.lastTestsResult)) {
                return;
            }

            this._db.setTestsResult(chatId, preparedTests);

            this.sendMessage(chatId, getTestsMessage(tests), true);
        });
    }

    defaultBranchCronTask(chatId) {
        this._tc.getTestsResults(config['default-branch']).then((tests) => {
            this.sendMessage(chatId, `📋 Отчет по тестам в *«${config['default-branch']}»*\n` + getTestsMessage(tests), true);
        });
    }

    setCron(chatId, pattern) {
        try {
            this.removeCron(chatId);

            const patternToSet = pattern || DEFAULT_CRON_PATTERN;
            this._cronMap[chatId] = new CronJob({
                cronTime: patternToSet,
                onTick: this.defaultBranchCronTask.bind(this, chatId)
            });
            this._cronMap[chatId].start();
            this._db.setCron(chatId, patternToSet);

            return patternToSet;
        } catch (e) {
            return false;
        }
    }

    removeCron(chatId) {
        if (this._cronMap[chatId]) {
            this._cronMap[chatId].stop();
            delete this._cronMap[chatId];
        }

        this._db.setCron(chatId, null);
    }

    checkLastUnitTest(chatId) {
        const chat = this._db.getChatValue(chatId);

        return this._tc
            .getTestsResults(chat.branch)
            .then((buildTypes) => {
                this._db.setTestsResult(chatId, prepareTestsToSave(buildTypes));

                this.sendMessage(chatId, getTestsMessage(buildTypes), true);
            })
            .catch((e) => {
                this.reportError(chatId, e);
            });
    }

    getStatusMessage(chatId) {
        const chat = this._db.getChatValue(chatId);
        let message = '';

        message += `Ветка: ${chat.branch}`;

        if (chat.watch) {
            message += '\n👁 Большой брат следит';
        }

        if (chat.cron) {
            message += `🕒 Включены регулярные уведомления: ${chat.cron}`;
        }

        return message;
    }

    reportError(chatId, error) {
        const defaultErrorMessage =
            '⚠ Что-то пошло не так, проверь /status. А может быть, я просто не смог достучаться до TeamCity.';

        this.sendMessage(chatId, `${defaultErrorMessage}\n${error}`);
    }

    sendHelpMessage(chatId) {
        const message =
            '*Для начала*:' +
            '\n/branch `<BranchName>` — задать ветку. По умолчанию: ' +
            `_${config['default-branch']}_` +
            '\n\n*Потом можно так*:' +
            '\n/tests — проверить тесты' +
            '\n/watchon — наблюдать за билдами ветки' +
            '\n/receivereports `<CronPattern>` — получать отчеты по тестам в ' + config['default-branch'] + ' (пустой паттерн для отчета по будням в 9 утра)' +
            '\n\n*А еще можно вот так*:' +
            '\n/status — проверить статус' +
            '\n/watchoff — отключить наблюдение за билдами ветки' +
            '\n/removereports — отключить получение отчетов';

        this.sendMessage(chatId, message, true);
    }

    sendMessage(chatId, message, useMarkdown) {
        const fullOptions = { parse_mode: 'Markdown' };
        this._bot.sendMessage(chatId, message, useMarkdown ? fullOptions : {});

        const chat = this._db.getChatValue(chatId);
        if (!chat) {
            this._bot.sendMessage(
                chatId,
                'Тебя почему-то нет в базе, выполни, пожалуйста, /start'
            );
        }
    }
}

module.exports = BotMechanics;
