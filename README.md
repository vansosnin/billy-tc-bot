# TeamCity Telegram Bot

[![Build Status](https://travis-ci.org/vansosnin/billy-tc-bot.svg?branch=master)](https://travis-ci.org/vansosnin/billy-tc-bot)

[Telegram](https://telegram.org/) bot for monitoring builds in [TeamCity](https://www.jetbrains.com/teamcity/). To setup you have to place a file `config.json` similar with [config-example.json](https://github.com/vansosnin/billy-tc-bot/blob/master/config-example.json) into root directory.

Some subtle settings:
- `check-interval-ms` - interval to request TeamCity API
- `auth` - username/password for TeamCity
- `admin-chat-id` - see below

## Administrator's capabilities

You have to setup `admin-chat-id` to use this.

- Bot sends a message about restart
- You can make a broadcast for all users using command `/broadcast`

## Commands to setup a bot using BotFather

##### en
```
help - Get info about commands
branch - Setup active branch
status - Check bot status
tests - Check builds
watchon - Watch on branch's builds (reports if something changes)
watchoff - Stop watching on branch's builds
receivereports - Setup timetable on receiving reports about builds in default branch (no arguments — monday to friday at 9 AM)
removereports - Turn off receiving regular reports
```

##### rus
```
help - Информация по командам
branch - Задать ветку
status - Проверить статус
tests - Проверить билды
watchon - Наблюдать за билдами ветки (уведомляет, если что-то изменилось)
watchoff - Перестать наблюдать за билдами ветки
receivereports - Задать расписание отчетов билдов по дефолтной ветке (без аргументов — по будням в 9 утра)
removereports - Отключить получение регулярных отчетов
```
