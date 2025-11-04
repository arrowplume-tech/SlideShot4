# Инструкция по развертыванию SlideShot 2.0

## После клонирования из GitHub

После клонирования репозитория необходимо выполнить следующие шаги:

### 1. Установка зависимостей
```bash
npm install
```

### 2. Установка браузеров Playwright (ОБЯЗАТЕЛЬНО!)
```bash
npx playwright install firefox
```

**Важно:** Playwright требует отдельной установки браузерных бинарников. Без этого шага конвертация будет работать через fallback (JSDOM) с точностью ~70% вместо точного браузерного рендеринга.

### 3. Настройка базы данных (если используется)
```bash
npm run db:push
```

### 4. Запуск в режиме разработки
```bash
npm run dev
```

Сервер запустится на `http://localhost:5000`

## Развертывание на продакшене

### Replit
После импорта проекта в Replit:
1. Откройте Shell
2. Выполните: `npx playwright install firefox`
3. Перезапустите workflow

### Другие платформы
Убедитесь что в CI/CD pipeline добавлен шаг:
```yaml
- name: Install Playwright browsers
  run: npx playwright install firefox
```

## Технические детали

### Почему Playwright требует отдельной установки браузеров?

Playwright устанавливается как npm пакет, но сами браузеры (Firefox, Chromium, WebKit) скачиваются отдельно в `~/.cache/ms-playwright/`. Это сделано для:
- Уменьшения размера npm пакета
- Возможности выбора только нужных браузеров
- Изоляции версий браузеров от обновлений системы

### Что делает Playwright в проекте?

Playwright используется для точного рендеринга HTML:
- Запускает headless Firefox
- Рендерит HTML с CSS
- Собирает точные координаты и размеры всех элементов
- Возвращает данные для конвертации в PPTX

### Fallback на JSDOM

Если Playwright недоступен, система автоматически переключается на JSDOM парсер:
- Точность ~70% вместо ~95%
- Не требует браузерных бинарников
- Быстрее, но менее точно

## Исправленные проблемы

### ✅ Утечка памяти Playwright (ИСПРАВЛЕНО)
**Проблема:** Браузер Firefox не закрывался после каждой конвертации.

**Решение:** Добавлен `finally` блок в `server/routes.ts` который всегда вызывает `pipeline.cleanup()`.

```typescript
finally {
  await pipeline.cleanup();
  console.log("[API] Pipeline cleanup completed");
}
```

### ✅ Timeout при загрузке Google Fonts (ИСПРАВЛЕНО)
**Проблема:** Браузер зависал на 30 секунд ожидая `networkidle` из-за Google Fonts.

**Решение:** Используется `waitUntil: "load"` вместо `networkidle` в `playwright-layout-collector.ts` (строка 79).

## Решение проблем

### Ошибка: "Executable doesn't exist"
```
browserType.launch: Executable doesn't exist at /path/to/firefox
```

**Решение:**
```bash
npx playwright install firefox
```

**Причина:** После `npm install` устанавливается только Playwright пакет, но не браузерные бинарники.

### Timeout при конвертации
Если конвертация все еще зависает:
- Проверьте что используется `waitUntil: "load"` (не `networkidle`) в строке 79
- Увеличьте timeout в `playwright-layout-collector.ts` (строка 80)

### Проблемы с памятью
При конвертации очень больших HTML:
- Увеличьте лимит памяти Node.js: `NODE_OPTIONS=--max-old-space-size=4096 npm run dev`
- Оптимизируйте HTML (уменьшите количество элементов)
- Проверьте что `pipeline.cleanup()` вызывается в `finally` блоке
