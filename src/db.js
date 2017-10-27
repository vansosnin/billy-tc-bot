const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const config = require('../config.json');

const DB_LOCATION = './db.json';

class Db {
    constructor() {
        this._schema = {
            chats: 'chats',
            adminChatId: 'adminChatId',
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
                [this._schema.chats]: [],
                [this._schema.adminChatId]: 115238607
            })
            .write();
    }

    getChats() {
        return this._db.get(this._schema.chats);
    }

    getChat(chatId) {
        return this.getChats().find({ id: chatId });
    }

    chatRecordValue(chatId) {
        const existingChat = this.getChat(chatId).value();

        return existingChat ? existingChat : this.getChats().push({ [this._schema.chat.id]: chatId }).write()[0];
    }

    chatRecord(chatId) {
        const chat = this.chatRecordValue(chatId);

        return this.getChat(chat.id);
    }

    createChat(chatId, user) {
        return this.chatRecord(chatId)
            .assign({
                [this._schema.chat.branch]: config['default-branch']
            })
            .set(this._schema.chat.user, user)
            .write();
    }

    setBranch(chatId, branch) {
        const chat = this.chatRecord(chatId);

        return chat.assign({ [this._schema.chat.branch]: branch }).write();
    }

    setWatching(chatId, isWatching) {
        const chat = this.chatRecord(chatId);

        return chat.assign({ [this._schema.chat.watch]: isWatching }).write();
    }

    setTestsResult(chatId, result) {
        return this.getChat(chatId).assign({ [this._schema.chat.lastTestsResult]: result }).write();
    }

    getAllWatchers() {
        return this.getChats()
            .filter({ [this._schema.chat.watch]: true })
            .value();
    }

    getAdminId() {
        return this._db.get(this._schema.adminChatId).value();
    }

    isAdmin(chatId) {
        return this.getAdminId() === chatId;
    }
}

module.exports = Db;
