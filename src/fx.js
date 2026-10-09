/* ТАРАСВІТ · анімації (Motion). Прогресивне покращення:
   - клас .fx на <html> ставить інлайн-скрипт у <head>, лише якщо користувач не просив «зменшити рух»;
   - без JS, при помилці завантаження або через 3 с без цього файла клас знімається і весь контент видно;
   - анімуються лише transform і opacity. Токени: 150 / 250 / 400 мс, ease-out, stagger 40 мс. */
(() => {
  const root = document.documentElement;
  const M = window.Motion;
  if (!M || !root.classList.contains('fx')) { root.classList.remove('fx'); return; }
  window.__fx = true;
  const { animate, inView, scroll, stagger } = M;
  const EASE = [0.2, 0.7, 0.2, 1];
  const D2 = 0.25, D3 = 0.4, STEP = 0.04, RISE = 'translateY(16px)';
  const capStagger = (max) => (i) => Math.min(i, max) * STEP;
  const show = (el) => { el.classList.add('is-in'); };

  /* 1. Поява заголовків секцій та окремих блоків */
  inView('[data-rv]', (el) => {
    animate(el, { opacity: [0, 1], transform: [RISE, 'none'] }, { duration: D3, ease: EASE }).finished.then(() => show(el));
  }, { amount: 0.2 });

  /* 2. Групи: картки по черзі (не довше 10 кроків, щоб довгі списки не «тягнулися») */
  inView('[data-rv-group]', (group) => {
    const items = group.querySelectorAll('[data-rv-item]');
    if (!items.length) return;
    animate(items, { opacity: [0, 1], transform: [RISE, 'none'] }, { duration: D3, ease: EASE, delay: capStagger(10) })
      .finished.then(() => items.forEach(show));
  }, { amount: 0.1 });

  /* 3. Каталог: плавна зміна панелі при перемиканні вкладок */
  document.addEventListener('tara:tabchange', (e) => {
    const panel = e.detail && e.detail.panel;
    if (panel) animate(panel, { opacity: [0, 1], transform: ['translateY(8px)', 'none'] }, { duration: D2, ease: EASE });
  });

  /* 4. «Усі характеристики»: вміст з’являється, а не стрибає */
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open) return;
    const body = Array.from(d.children).filter((c) => c.tagName !== 'SUMMARY');
    if (body.length) animate(body, { opacity: [0, 1], transform: ['translateY(-4px)', 'none'] }, { duration: D2, ease: EASE, delay: stagger(STEP) });
  }, true);

  /* 5. Форма: підтвердження заявки */
  document.addEventListener('tara:leadsent', () => {
    const ic = document.querySelector('#leadSent .done-ic');
    if (!ic) return;
    animate(ic, { transform: ['scale(.6)', 'scale(1.06)', 'scale(1)'], opacity: [0, 1, 1] }, { duration: D3, ease: EASE });
    const path = ic.querySelector('path');
    if (path && path.getTotalLength) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      animate(path, { strokeDashoffset: [len, 0] }, { duration: D3, delay: 0.12, ease: EASE });
    }
  });

  /* 6. Таймлайн «Як замовити»: лінія заповнюється разом із прокруткою */
  document.querySelectorAll('[data-fx-progress]').forEach((track) => {
    const bar = track.querySelector('[data-fx-bar]');
    const steps = track.querySelectorAll('[data-fx-step]');
    if (!bar) return;
    const vertical = getComputedStyle(bar).getPropertyValue('--axis').trim() === 'y';
    scroll(animate(bar, { transform: [vertical ? 'scaleY(0)' : 'scaleX(0)', vertical ? 'scaleY(1)' : 'scaleX(1)'] }, { ease: 'linear' }),
      { target: track, offset: ['start 80%', 'end 55%'] });
    if (steps.length) {
      scroll((p) => {
        steps.forEach((s, i) => s.classList.toggle('is-on', p >= (i / steps.length) - 0.001));
      }, { target: track, offset: ['start 80%', 'end 55%'] });
    }
  });

  /* 7. Лічильник у смузі цифр (лише для чисел ≥ 10, малі числа просто з’являються) */
  inView('[data-fx-count]', (el) => {
    const to = parseInt(el.getAttribute('data-fx-count'), 10);
    if (!(to >= 10)) return;
    const t0 = performance.now(), dur = 900;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { amount: 0.6 });
})();
