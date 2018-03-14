const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const config = require('../config.json');

const DB_LOCATION = './db.json';

let instance = null;

class Db {
    constructor() {
        this._schema = {
            chats: 'chats',
            chat: {
                id: 'id',
                branch: 'branch',
                watch: 'watch',
                user: 'user',
                lastTestsResult: 'lastTestsResult',
                cron: 'cron',
                lastChangesCount: 'lastChangesCount'
            }
        };

        this._db = lowdb(new FileSync(DB_LOCATION));
        this._db
            .defaults({
                [this._schema.chats]: []
            })
            .write();
    }

    static instance() {
        if (!instance) {
            instance = new Db();
        }

        return instance;
    }

    getChats() {
        return this._db.get(this._schema.chats);
    }

    getChat(chatId) {
        return this.getChats().find({ id: chatId });
    }

    getChatValue(chatId) {
        return this.getChat(chatId).value();
    }

    createChatUnobtrusive(chatId, user) {
        const existingChat = this.getChat(chatId);

        if (existingChat.value()) {
            return existingChat
                .assign({
                    [this._schema.chat.branch]: config['default-branch']
                })
                .set(this._schema.chat.user, user)
                .set(this._schema.chat.watch, true)
                .write();
        }

        return this.getChats()
            .push({
                [this._schema.chat.id]: chatId,
                [this._schema.chat.branch]: config['default-branch'],
                [this._schema.chat.user]: user,
                [this._schema.chat.watch]: true,
                [this._schema.chat.lastChangesCount]: 0
            })
            .write();
    }

    setBranch(chatId, branch) {
        return this.getChat(chatId)
            .assign({ [this._schema.chat.branch]: branch })
            .write();
    }

    setWatching(chatId, isWatching) {
        return this.getChat(chatId)
            .assign({ [this._schema.chat.watch]: isWatching })
            .write();
    }

    setTestsResult(chatId, result) {
        return this.getChat(chatId)
            .assign({ [this._schema.chat.lastTestsResult]: result })
            .write();
    }

    setCron(chatId, cron) {
        return this.getChat(chatId)
            .assign({ [this._schema.chat.cron]: cron })
            .write();
    }

    getAllWatchers() {
        return this.getChats()
            .filter({ [this._schema.chat.watch]: true })
            .value();
    }

    getAllCronTasks() {
        return this.getChats()
            .filter((c) => !!c[this._schema.chat.cron])
            .value();
    }

    setLastChangesCount(chatId, count) {
        return this.getChat(chatId)
            .assign({ [this._schema.chat.lastChangesCount]: count })
            .write();
    }
}

module.exports = Db.instance();
