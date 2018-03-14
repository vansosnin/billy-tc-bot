const Db = require('../db');
const config = require('../../config.json');

class Messenger {
    constructor(bot) {
        this._bot = bot;
    }

    informAdmin() {
        this.sendMessage(
            config['admin-chat-id'],
            '*⚡ Бот (пере)запущен ⚡*',
            true
        );
    }

    sendStatusMessage(chatId) {
        this.sendMessage(chatId, this._getStatusMessage(chatId));
    }

    reportTCError(chatId, error) {
        const defaultErrorMessage = '⚠ Что-то пошло не так, проверь /status. А может быть, я просто не смог достучаться до TeamCity.';

        this.sendMessage(chatId, `${defaultErrorMessage}\n${error}`);
    }

    sendHelpMessage(chatId) {
        const message =
            `${'*Для начала*:' +
            '\n/branch `<BranchName>` — задать ветку. По умолчанию: ' +
            `_${config['default-branch']}_` +
            '\n\n*Потом можно так*:' +
            '\n/tests — проверить тесты' +
            '\n/watchon — наблюдать за билдами ветки' +
            '\n/receivereports `<CronPattern>` — получать отчеты по тестам в '}${config['default-branch']} (пустой паттерн для отчета по будням в 9 утра)` +
            '\n/lastchanges `<ChangesCount>` — получать N последних изменений по тестам (авторы и коммиты); ворнинг: простыня и времечко алерт!' +
            '\n\n*А еще можно вот так*:' +
            '\n/status — проверить статус' +
            '\n/watchoff — отключить наблюдение за билдами ветки' +
            '\n/removereports — отключить получение отчетов';

        this.sendMessage(chatId, message, true);
    }

    sendMessage(chatId, message, useMarkdown) {
        const fullOptions = { parse_mode: 'Markdown' };
        this._bot.sendMessage(chatId, message, useMarkdown ? fullOptions : {});

        const chat = Db.getChatValue(chatId);
        if (!chat) {
            this._bot.sendMessage(
                chatId,
                'Тебя почему-то нет в базе, выполни, пожалуйста, /start'
            );
        }
    }

    _getStatusMessage(chatId) {
        const chat = Db.getChatValue(chatId);
        let message = '';

        message += `Ветка: ${chat.branch}`;

        if (chat.watch) {
            message += '\n👁 Большой брат следит';
        }

        if (chat.cron) {
            message += `\n🕒 Включены регулярные уведомления: ${chat.cron}`;
        }

        return message;
    }
}

module.exports = Messenger;
