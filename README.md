# Kontur.Billing TeamCity Telegram Bot

[![Build Status](https://travis-ci.org/vansosnin/billy-tc-bot.svg?branch=master)](https://travis-ci.org/vansosnin/billy-tc-bot)

Бот предназначен для мониторинга билдов в TeamCity. Для настройки нужно в корень положить файл config.json по аналогии с [config-example.json](https://github.com/vansosnin/billy-tc-bot/blob/master/config-example.json).

Некоторые неочевидные настройки:
- `check-interval-ms` - с таким интервалом будет опрашиваться TeamCity
- `auth` - логин/пароль для TeamCity
- `admin-chat-id` - см. ниже

## Возможности администратора

Чтобы этим пользоваться, нужно настроить `admin-chat-id`.

- Бот сообщает о перезапуске
- Можно делать рассылку на всех пользователей при помощи команды `/broadcast`

## Команды для настройки бота в BotFather

```
branch - Задать ветку
status - Проверить статус
tests - Проверить тесты
watchon - Наблюдать за билдами ветки (уведомляет, если что-то изменилось)
watchoff - Перестать наблюдать за билдами ветки
receivereports - Задать расписание отчетов по дефолтной ветке (без аргументов — по будням в 9 утра)
removereports - Отключить получение регулярных отчетов
```
