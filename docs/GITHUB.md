# GitHub — рабочий процесс VOID

Репозиторий: https://github.com/kazakavtobus/void-site
Ветка: `main`. Сайт пока **не публикуется** автоматически.

## Проверка изменений

После каждого push и pull request workflow `VOID — проверки и сборка` выполняет `npm run check`, собирает `dist/` и сохраняет 7-дневный артефакт `void-site`.

## Локальная работа (при необходимости)

```bash
git clone https://github.com/kazakavtobus/void-site.git
cd void-site
npm run check
npm run preview
```

После правок:

```bash
git add .
git commit -m "Update VOID site"
git push
```

Через подключённый GitHub изменения можно делать без локального терминала. Не помещайте ключи, пароли или клиентские персональные данные в коммиты.

## Публикация

После настройки Object Storage публикация запускается вручную: `Actions → VOID — публикация в Yandex Cloud → Run workflow`, с явным подтверждением. `dist/` в Git не добавляем: её создаёт CI. Для этого нужны только секреты GitHub Actions, указанные в `docs/DEPLOY-YANDEX.md`.
