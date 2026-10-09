/**
 * ТАРАСВІТ · приймання заявок із сайту в Google Таблицю.
 * Кожна заявка з форми = один рядок на аркуші «Заявки».
 * Встановлення: README.md, розділ «Заявки в Google Таблицю».
 *
 * @OnlyCurrentDoc  Скрипт має доступ лише до цієї таблиці.
 */

const SHEET_NAME = 'Заявки';
const TIME_ZONE = 'Europe/Kyiv';
const MAX_LEADS_PER_10_MIN = 30; // захист від флуду: понад ліміт заявки відхиляються, сайт покаже резервний варіант
const MIN_FILL_MS = 1500;        // форму, надіслану швидше за 1,5 с після відкриття сторінки, вважаємо ботом

const HEADERS = [
  'Дата і час', 'Статус', 'Ім’я', 'Телефон', 'E-mail', 'Компанія', 'Напрямки', 'Коментар',
  'Кнопка / товар', 'Сторінка', 'Звідки прийшов',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ID заявки'
];

/** Приймає заявку із сайту. Тіло запиту: JSON як text/plain. */
function doPost(e) {
  let data;
  try {
    const raw = e && e.postData ? String(e.postData.contents || '') : '';
    if (!raw || raw.length > 20000) return reply_({ ok: false, error: 'empty' });
    data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return reply_({ ok: false, error: 'bad_json' });
  } catch (err) {
    return reply_({ ok: false, error: 'bad_json' });
  }

  // Пастка для ботів: поле website приховане від людей. Відповідаємо «ок» і нічого не записуємо.
  if (data.website || Number(data.t) < MIN_FILL_MS) return reply_({ ok: true });

  const name = text_(data.name, 100);
  const phone = text_(data.phone, 30);
  if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
    return reply_({ ok: false, error: 'invalid' });
  }
  const id = text_(data.id, 64) || Utilities.getUuid();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return reply_({ ok: false, error: 'busy' });
  }
  try {
    const cache = CacheService.getScriptCache();
    // Повторна відправка тієї самої заявки (наприклад, після збою зв’язку) не створює дубль.
    if (cache.get('lead:' + id)) return reply_({ ok: true, duplicate: true });

    const bucket = 'rate:' + Math.floor(Date.now() / 600000);
    const count = Number(cache.get(bucket) || 0);
    if (count >= MAX_LEADS_PER_10_MIN) return reply_({ ok: false, error: 'rate_limited' });

    sheet_().appendRow([
      new Date(),
      'Нова',
      safe_(name),
      safe_(phone),
      safe_(text_(data.email, 120)),
      safe_(text_(data.company, 150)),
      safe_(text_(data.interests, 200)),
      safe_(text_(data.comment, 2000, true)),
      safe_(text_(data.item, 500)),
      safe_(text_(data.page, 500)),
      safe_(text_(data.referrer, 500)),
      safe_(text_(data.utm_source, 150)),
      safe_(text_(data.utm_medium, 150)),
      safe_(text_(data.utm_campaign, 150)),
      safe_(text_(data.utm_term, 150)),
      safe_(text_(data.utm_content, 150)),
      safe_(id)
    ]);
    SpreadsheetApp.flush();
    cache.put(bucket, String(count + 1), 900);
    cache.put('lead:' + id, '1', 21600);
    return reply_({ ok: true });
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

/** Перевірка розгортання: відкрийте URL веб-застосунку в браузері, має бути {"ok":true,...}. */
function doGet() {
  return reply_({ ok: true, service: 'tarasvit-leads' });
}

/** Запустіть один раз вручну з редактора: створює аркуш «Заявки» із заголовками й запитує доступ. */
function setup() {
  const sh = sheet_();
  console.log('Готово: аркуш «' + sh.getName() + '», заголовків: ' + sh.getLastColumn());
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    const sheets = ss.getSheets();
    // Порожній перший аркуш (Sheet1 / Аркуш1) перейменовуємо, щоб у таблиці не лишалося зайвого.
    sh = (sheets.length === 1 && sheets[0].getLastRow() === 0)
      ? sheets[0].setName(SHEET_NAME)
      : ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    ss.setSpreadsheetTimeZone(TIME_ZONE);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.getRange('A2:A').setNumberFormat('dd.mm.yyyy hh:mm');
    sh.setColumnWidth(8, 320);
  }
  return sh;
}

/** Рядок без керівних символів, обрізаний до max. Переноси рядків лишаються лише в коментарі. */
function text_(value, max, multiline) {
  let s = value == null ? '' : String(value);
  s = multiline
    ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return s.trim().slice(0, max);
}

/** Захист від формул: значення, що починається з = + - @, таблиця збереже як текст. */
function safe_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
