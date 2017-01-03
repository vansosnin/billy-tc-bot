# Kontur.Billing TeamCity Telegram Bot

Бот предназначен для мониторинга упавших тестов в TeamCity. Для настройки нужно в корень положить файл config.json следующего вида:

```json
{
    "telegram-token": "YOUR_TOKEN",
    "teamcity-url": "TC_URL",
    "auth": {
        "username": "username",
        "password": "password"
    }
}
```
