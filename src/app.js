(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: hairline after scroll */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  const menuBtn = $('#menuBtn');
  const mnav = $('#mnav');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    mnav.hidden = !open;
    document.documentElement.classList.toggle('lock', open);
    menuBtn.innerHTML = open
      ? '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
      : '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16M4 12h16M4 16.5h16"/></svg>';
    if (open) { const first = $('a', mnav); if (first) first.focus({ preventScroll: true }); }
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 980 && !mnav.hidden) setMenu(false); });

  /* Catalog tabs */
  const catalog = $('#catalog');
  const tabs = $$('.tab', catalog);
  const panels = { tara: $('#tara'), ukuporka: $('#ukuporka'), komplekty: $('#komplekty') };
  const sectionToPanel = { dozatory: 'ukuporka', tryhery: 'ukuporka', kryshky: 'ukuporka', inshi: 'ukuporka' };

  function activate(key, focusTab) {
    tabs.forEach((t) => {
      const on = t.dataset.key === key;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    let changed = null;
    Object.entries(panels).forEach(([k, p]) => {
      const on = k === key;
      if (on && !p.classList.contains('is-active')) changed = p;
      p.classList.toggle('is-active', on);
    });
    if (changed) document.dispatchEvent(new CustomEvent('tara:tabchange', { detail: { panel: changed } }));
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activate(t.dataset.key));
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); activate(tabs[j].dataset.key, true); }
    });
  });

  /* In-page navigation: catalog anchors open their tab */
  function scrollToEl(el) {
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function goTo(id) {
    const panelKey = panels[id] ? id : sectionToPanel[id];
    if (panelKey) {
      activate(panelKey);
      if (sectionToPanel[id]) { scrollToEl(document.getElementById(id)); return; }
      scrollToEl($('.tabbar', catalog));
      return;
    }
    const el = document.getElementById(id);
    if (el) scrollToEl(el);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    if (!mnav.hidden) setMenu(false);
    if (a.dataset.lead) { e.preventDefault(); prefill(a.dataset.lead, a.dataset.item || ''); return; }
    if (!document.getElementById(id)) return;
    e.preventDefault();
    goTo(id);
  });
  if (location.hash) {
    const id = location.hash.slice(1);
    if (panels[id] || sectionToPanel[id]) setTimeout(() => goTo(id), 60);
  }

  /* CTA → form prefill */
  const form = $('#leadForm');
  const formCard = $('#formCard');
  const comment = $('#f-comment');
  const items = new Set(); // товари з кнопок, якими відвідувач прийшов до форми
  function showPanel(which) {
    form.hidden = which !== 'form';
    $('#leadDone').hidden = which !== 'done';
    $('#leadSent').hidden = which !== 'sent';
  }
  function clearRequest() {
    $$('input[name="interest"]', form).forEach((b) => { b.checked = false; });
    comment.value = ''; comment.dataset.auto = '0';
    items.clear();
  }
  function prefill(interest, item) {
    if (!$('#leadSent').hidden) clearRequest();
    if (form.hidden) showPanel('form');
    leadId = null;
    interest.split(',').forEach((v) => { const box = $(`#i-${v.trim()}`); if (box) box.checked = true; });
    if (item) {
      items.add(item);
      const line = `Цікавить: ${item}`;
      if (!comment.value.trim() || comment.dataset.auto === '1') { comment.value = line; comment.dataset.auto = '1'; }
      else if (!comment.value.includes(item)) { comment.value += `\n${line}`; }
    }
    scrollToEl(formCard);
    const name = $('#f-name');
    window.setTimeout(() => {
      name.focus({ preventScroll: true });
      if (!reduce) {
        formCard.classList.add('is-flash');
        window.setTimeout(() => formCard.classList.remove('is-flash'), 900);
      }
    }, reduce ? 0 : 450);
  }
  comment.addEventListener('input', () => { comment.dataset.auto = '0'; });

  /* Validation */
  // Цифри номера → 380XXXXXXXXX. Приймає 068…, 8068…, +380 068… (локальний номер після автопрефікса), +380 380…
  function phoneDigits(v) {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('380380')) d = d.slice(3);
    if (d.length === 13 && d.startsWith('3800')) d = '380' + d.slice(4);
    if (d.length === 11 && d.startsWith('80')) d = '3' + d;
    if (d.length === 10 && d.startsWith('0')) d = '38' + d;
    return d;
  }
  const rules = {
    name: (v) => v.trim().length >= 2 || 'Вкажіть ім’я, щоб менеджер знав, як до вас звертатися',
    phone: (v) => {
      const d = phoneDigits(v);
      return (d.length === 12 && d.startsWith('380')) || 'Вкажіть номер у форматі +380 XX XXX XX XX';
    },
    email: (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Перевірте e-mail: потрібні @ і домен, наприклад name@company.ua'
  };
  function check(input) {
    const rule = rules[input.name];
    if (!rule) return true;
    const res = rule(input.value);
    const err = $(`#${input.name}-err`);
    if (res === true) { input.removeAttribute('aria-invalid'); err.hidden = true; return true; }
    input.setAttribute('aria-invalid', 'true');
    $('span', err).textContent = res;
    err.hidden = false;
    return false;
  }
  function formatPhone(v) {
    const d = phoneDigits(v);
    if (!d.startsWith('380') || d.length !== 12) return v;
    return `+380 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  }
  ['name', 'phone', 'email'].forEach((n) => {
    const input = form.elements[n];
    input.addEventListener('blur', () => {
      if (n === 'phone') {
        if (input.value.trim() === '+380') input.value = '';
        input.value = formatPhone(input.value);
      }
      if (input.value.trim()) check(input);
    });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) check(input); });
  });
  form.elements.phone.addEventListener('focus', (e) => { if (!e.target.value) e.target.value = '+380 '; });

  const LABELS = { tara: 'Тара', ukuporka: 'Укупорка', komplekty: 'Комплекти', price: 'Прайс', samples: 'Зразки' };
  const interestList = () => $$('input[name="interest"]:checked', form).map((i) => LABELS[i.value]).filter(Boolean);
  function buildLead() {
    const f = form.elements;
    const interests = interestList();
    const lines = ['Заявка з сайту ТАРАСВІТ', '', `Ім’я: ${f.name.value.trim()}`, `Телефон: ${f.phone.value.trim()}`];
    if (f.email.value.trim()) lines.push(`E-mail: ${f.email.value.trim()}`);
    if (f.company.value.trim()) lines.push(`Компанія: ${f.company.value.trim()}`);
    if (interests.length) lines.push(`Напрямки: ${interests.join(', ')}`);
    if (f.comment.value.trim()) lines.push('', f.comment.value.trim());
    return lines.join('\n');
  }

  /* Sending: Google Apps Script web app (data-endpoint). Empty endpoint = text-only mode. */
  const endpoint = (form.dataset.endpoint || '').trim();
  const live = /^https?:\/\//.test(endpoint);
  const openedAt = Date.now();
  const submitBtn = $('#submitBtn');
  let leadId = null; // один ID на зміст заявки: повтор після збою не створює дубль у таблиці
  let busy = false;
  form.addEventListener('input', () => { leadId = null; });
  form.addEventListener('change', () => { leadId = null; });
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

  function payload() {
    const f = form.elements;
    const q = new URLSearchParams(location.search);
    const data = {
      id: leadId,
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      company: f.company.value.trim(),
      interests: interestList().join(', '),
      comment: f.comment.value.trim(),
      item: Array.from(items).join('; '),
      page: location.href,
      referrer: document.referrer,
      website: f.website.value,
      t: Date.now() - openedAt
    };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => { data[k] = q.get(k) || ''; });
    // Нерозривні пробіли (5 л, 38 мм) → звичайні, щоб у таблиці працювали пошук і фільтри.
    Object.keys(data).forEach((k) => { if (typeof data[k] === 'string') data[k] = data[k].replace(/ /g, ' '); });
    return data;
  }
  async function post(data) {
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 15000) : 0;
    try {
      // Рядок у тілі = Content-Type text/plain: простий запит без preflight, Apps Script його приймає.
      const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify(data), redirect: 'follow', signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) return false;
      const json = await res.json();
      return !!(json && json.ok === true);
    } catch (err) {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  }
  function setBusy(on) {
    busy = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-loading', on);
    form.setAttribute('aria-busy', String(on));
    $('.btn-label', submitBtn).textContent = on ? 'Надсилаємо…' : (live ? 'Надіслати заявку' : 'Сформувати заявку');
  }
  function showText(mode) {
    const text = buildLead();
    const done = $('#leadDone');
    const failed = mode === 'error';
    $('#leadText').textContent = text;
    const subject = `Заявка з сайту: ${form.elements.company.value.trim() || form.elements.name.value.trim()}`;
    $('#leadMail').href = `mailto:sales.tarasvit@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    done.classList.toggle('is-error', failed);
    $('#leadDoneTitle').textContent = failed ? 'Не вдалося надіслати заявку' : 'Заявку сформовано';
    $('#leadDoneText').textContent = failed
      ? 'Не отримали підтвердження від сервера. Спробуйте ще раз або надішліть заявку менеджеру на sales.tarasvit@gmail.com.'
      : 'Залишився один крок: надішліть її менеджеру. Скопіюйте текст і відправте на sales.tarasvit@gmail.com або напишіть листа кнопкою нижче.';
    $('#leadRetry').hidden = !failed;
    $('#leadCopy').classList.toggle('btn-primary', !failed);
    $('#leadCopy').classList.toggle('btn-outline', failed);
    showPanel('done');
    done.focus({ preventScroll: true });
    scrollToEl(formCard);
  }
  function showSent() {
    $('#leadSentText').textContent = `Менеджер зателефонує на ${form.elements.phone.value.trim()}, щоб уточнити деталі.`;
    showPanel('sent');
    const sent = $('#leadSent');
    sent.focus({ preventScroll: true });
    scrollToEl(formCard);
    document.dispatchEvent(new CustomEvent('tara:leadsent'));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    form.elements.phone.value = formatPhone(form.elements.phone.value);
    const bad = ['name', 'phone', 'email'].map((n) => form.elements[n]).filter((i) => !check(i));
    if (bad.length) { bad[0].focus(); return; }
    if (!live) { showText('copy'); return; }
    if (!leadId) leadId = newId();
    setBusy(true);
    const ok = await post(payload());
    setBusy(false);
    if (ok) { leadId = null; showSent(); } else showText('error');
  });
  $('#leadRetry').addEventListener('click', () => { showPanel('form'); submitBtn.click(); });
  $('#leadNew').addEventListener('click', () => { clearRequest(); showPanel('form'); $('#f-name').focus(); });
  $('#leadCopy').addEventListener('click', () => {
    const btn = $('#leadCopy'); const label = $('span', btn);
    const ok = () => { label.textContent = 'Скопійовано'; window.setTimeout(() => { label.textContent = 'Скопіювати заявку'; }, 1800); };
    const fallback = () => {
      const range = document.createRange(); range.selectNodeContents($('#leadText'));
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      label.textContent = 'Текст виділено, скопіюйте його';
      window.setTimeout(() => { label.textContent = 'Скопіювати заявку'; }, 2400);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText($('#leadText').textContent).then(ok, fallback);
      else fallback();
    } catch (err) { fallback(); }
  });
  $('#leadAgain').addEventListener('click', () => { showPanel('form'); $('#f-name').focus(); });

  /* Copy buttons */
  $$('.copy-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const label = $('span', b);
      const done = () => {
        b.classList.add('is-done'); label.textContent = 'Скопійовано';
        window.setTimeout(() => { b.classList.remove('is-done'); label.textContent = 'Копіювати'; }, 1600);
      };
      const fallback = () => {
        const val = b.parentElement.querySelector('.val');
        if (!val) return;
        const range = document.createRange(); range.selectNodeContents(val);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        label.textContent = 'Виділено';
        window.setTimeout(() => { label.textContent = 'Копіювати'; }, 1600);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.copy).then(done, fallback);
        else fallback();
      } catch (err) { fallback(); }
    });
  });

  /* Mobile action bar: hide over the contact section and while typing */
  const mbar = $('#mbar');
  let inContacts = false; let typing = false;
  const sync = () => mbar.classList.toggle('is-hidden', inContacts || typing);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { entries.forEach((en) => { inContacts = en.isIntersecting; sync(); }); }, { threshold: 0.12 })
      .observe($('#kontakty'));
  }
  document.addEventListener('focusin', (e) => { if (e.target.matches('input, textarea')) { typing = true; sync(); } });
  document.addEventListener('focusout', (e) => { if (e.target.matches('input, textarea')) { typing = false; sync(); } });
})();
