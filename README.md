# Kontur.Billing TeamCity Telegram Bot

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
