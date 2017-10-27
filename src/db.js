const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

let instance = null;
const DB_LOCATION = './db.json';

class Db {
    constructor() {
        this._schema= {
            chats: 'chats',
            chat: {
                id: 'id',
                branch: 'branch',
                watch: 'watch'
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

    chatRecordValue(chatId) {
        const existingChat = this.getChat(chatId).value();

        return existingChat ? existingChat : this.getChats().push({ [this._schema.chat.id]: chatId }).write();
    }

    chatRecord(chatId) {
        const chat = this.chatRecordValue(chatId);

        return this.getChat(chat.id);
    }

    setBranch(chatId, branch) {
        const chat = this.chatRecord(chatId);

        return chat.assign({ [this._schema.chat.branch]: branch }).write();
    }

    setWatching(chatId, isWatching) {
        const chat = this.chatRecord(chatId);

        return chat.assign({ [this._schema.chat.watch]: isWatching }).write();
    }
}

module.exports = Db.instance();