# Kontur.Billing TeamCity Telegram Bot

[![Build Status](https://travis-ci.org/vansosnin/billy-tc-bot.svg?branch=master)](https://travis-ci.org/vansosnin/billy-tc-bot)

Бот предназначен для мониторинга билдов в TeamCity. Для настройки нужно в корень положить файл config.json следующего вида:

```json
{
    "telegram-token": "YOUR_TOKEN",
    "teamcity-url": "TC_URL",
    "unit-tests-build-type": "BUILD_ID_FOR_UNIT_TESTS",
    "auth": {
        "username": "username",
        "password": "password"
    }
}
```
