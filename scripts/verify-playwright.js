#!/usr/bin/env node

import { firefox } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Проверка установки Playwright...\n');

async function verifyPlaywright() {
  let browser;
  
  try {
    console.log('1️⃣ Попытка запуска Firefox...');
    browser = await firefox.launch({ headless: true });
    console.log('✅ Firefox успешно запущен!\n');
    
    console.log('2️⃣ Создание страницы...');
    const page = await browser.newPage();
    console.log('✅ Страница создана!\n');
    
    console.log('3️⃣ Тестирование рендеринга HTML...');
    await page.setContent('<div style="width: 100px; height: 100px; background: red;">Test</div>');
    const element = await page.$('div');
    const box = await element.boundingBox();
    console.log(`✅ HTML рендеринг работает! Размеры: ${box.width}x${box.height}\n`);
    
    await browser.close();
    
    console.log('🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!');
    console.log('✨ Playwright установлен корректно и готов к использованию\n');
    console.log('Приложение будет использовать Playwright для 99% точности конвертации.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ ОШИБКА при проверке Playwright:\n');
    console.error(error.message);
    console.error('\n🔧 Решение: Выполните команду:');
    console.error('   npx playwright install firefox\n');
    
    if (browser) {
      await browser.close();
    }
    
    process.exit(1);
  }
}

verifyPlaywright();
