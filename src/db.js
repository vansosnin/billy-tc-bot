const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const config = require('../config.json');

const DB_LOCATION = './db.json';

class Db {
    constructor() {
        this._schema = {
            chats: 'chats',
            chat: {
                id: 'id',
                branch: 'branch',
                watch: 'watch',
                user: 'user',
                lastTestsResult: 'lastTestsResult'
            }
        };

        this._db = lowdb(new FileSync(DB_LOCATION));
        this._db
            .defaults({
                [this._schema.chats]: []
            })
            .write();
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
        const existingChat = this.getChatValue(chatId);

        if (existingChat) {
            return existingChat
                .assign({
                    [this._schema.chat.branch]: config['default-branch']
                })
                .set(this._schema.chat.user, user)
                .write();
        }

        return this.getChats()
            .push({
                [this._schema.chat.id]: chatId,
                [this._schema.chat.branch]: config['default-branch'],
                [this._schema.chat.user]: user
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

    getAllWatchers() {
        return this.getChats()
            .filter({ [this._schema.chat.watch]: true })
            .value();
    }
}

module.exports = Db;
