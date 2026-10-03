/* ShopLaptop — shared scripts (prototype: no backend, state kept in localStorage). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('uk-UA').replace(/ |,/g, ' ') + ' ₴';
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let tt;
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('show'), 3200); };
  window.toast = toast;

  /* ---------- phone mask + validation (UA: +380 (XX) XXX XX XX) ---------- */
  const OPS = ['39', '50', '63', '66', '67', '68', '73', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  function phoneDigits(v) {
    let d = String(v).replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('3800')) d = '380' + d.slice(4);
    if (d.startsWith('380')) { /* ok */ }
    else if (d.startsWith('80')) d = '3' + d;
    else if (d.startsWith('0')) d = '38' + d;
    else if (!'380'.startsWith(d)) d = '380' + d;
    return d.slice(0, 12);
  }
  function phoneFormat(d) {
    if (!d) return '';
    const r = d.slice(3);
    let out = '+380';
    if (r.length) out += ' (' + r.slice(0, 2) + (r.length >= 2 ? ')' : '');
    if (r.length > 2) out += ' ' + r.slice(2, 5);
    if (r.length > 5) out += ' ' + r.slice(5, 7);
    if (r.length > 7) out += ' ' + r.slice(7, 9);
    return out;
  }
  function phoneError(v) {
    const d = String(v).replace(/\D/g, '');
    if (!d || d === '380') return 'Вкажіть номер телефону';
    if (d.length < 12) return 'Номер закороткий — потрібно 9 цифр після +380';
    if (d.length > 12) return 'Номер задовгий — потрібно 9 цифр після +380';
    if (!OPS.includes(d.slice(3, 5))) return 'Невідомий код оператора (0' + d.slice(3, 5) + '). Перевірте номер';
    return '';
  }
  window.phoneError = phoneError;
  function bindPhone(inp) {
    if (inp._phone) return; inp._phone = true;
    inp.setAttribute('inputmode', 'tel'); inp.setAttribute('maxlength', '19');
    if (!inp.placeholder) inp.placeholder = '+380 (__) ___ __ __';
    let prev = phoneDigits(inp.value);
    inp.value = phoneFormat(prev);
    inp.addEventListener('focus', () => { if (!inp.value) { inp.value = '+380 ('; prev = '380'; } });
    inp.addEventListener('blur', () => { if (phoneDigits(inp.value).length <= 3) { inp.value = ''; prev = ''; } else if (inp.closest('.fld.bad')) check(inp); });
    inp.addEventListener('input', e => {
      let d = phoneDigits(inp.value);
      if (e.inputType && e.inputType.startsWith('delete') && d === prev) d = d.slice(0, -1);
      if (d.length < 3) d = d ? '380' : '';
      prev = d;
      inp.value = d.length <= 3 ? (d ? '+380 (' : '') : phoneFormat(d);
      const f = inp.closest('.fld');
      if (f) f.classList.toggle('good', !phoneError(inp.value));
      if (f && f.classList.contains('bad') && !phoneError(inp.value)) setErr(inp, '');
    });
  }
  $$('input[type=tel]').forEach(bindPhone);

  /* ---------- field errors ---------- */
  function setErr(el, msg) {
    const f = el.closest('.fld') || el;
    let e = $('.err', f);
    if (!e && msg) { e = document.createElement('small'); e.className = 'err'; f.appendChild(e); }
    if (e) e.textContent = msg || '';
    f.classList.toggle('bad', !!msg);
    return !msg;
  }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function check(inp) {
    const v = inp.value.trim();
    if (inp.type === 'tel') return setErr(inp, (inp.required || v) ? phoneError(v) : '');
    if (inp.type === 'email' && v && !EMAIL.test(v)) return setErr(inp, 'Невірний формат e-mail');
    if (inp.required && !v) return setErr(inp, 'Заповніть це поле');
    if (inp.type === 'password' && v.length < 6) return setErr(inp, 'Пароль має містити не менше 6 символів');
    return setErr(inp, '');
  }
  function validate(form, extra) {
    let ok = true;
    $$('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea', form).forEach(i => {
      if (i.closest('[hidden]') || i.classList.contains('pk-search') || i.closest('.otp')) return;
      if (!check(i)) ok = false;
    });
    if (extra && !extra()) ok = false;
    if (!ok) { const b = $('.bad', form); b && b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return ok;
  }
  document.addEventListener('input', e => { const f = e.target.closest('.fld.bad'); if (f && e.target.type !== 'tel') check(e.target); });

  /* ---------- counters: cart / wishlist / compare ---------- */
  const counts = { wish: 2, compare: 2 };
  function paint() {
    const c = store.get('sl_cart', { n: 0, sum: 0 });
    $$('[data-cart-count]').forEach(e => e.textContent = c.n);
    $$('[data-cart-sum]').forEach(e => e.textContent = fmt(c.sum));
    $$('[data-wish-count]').forEach(e => e.textContent = counts.wish);
    $$('[data-compare-count]').forEach(e => e.textContent = counts.compare);
  }
  paint();

  /* ---------- modals ---------- */
  function openModal(id) { const m = document.getElementById(id); if (!m) return; m.classList.add('open'); setTimeout(() => { const i = $('input:not([type=hidden])', m); i && i.focus(); }, 200); }
  function closeModals() { $$('.modal.open').forEach(m => { m.classList.remove('open'); m.dispatchEvent(new Event('closed')); }); }
  $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModals(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });

  /* ---------- global clicks ---------- */
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); e.stopPropagation(); const c = store.get('sl_cart', { n: 0, sum: 0 }); c.n++; c.sum += +add.dataset.price || 0; store.set('sl_cart', c); paint(); toast('Додано в кошик: ' + add.dataset.add); return; }
    const w = e.target.closest('[data-wish]');
    if (w) { e.preventDefault(); e.stopPropagation(); w.classList.toggle('on'); counts.wish += w.classList.contains('on') ? 1 : -1; paint(); toast(w.classList.contains('on') ? 'Додано до списку бажань' : 'Видалено зі списку бажань'); return; }
    const cmp = e.target.closest('[data-compare]');
    if (cmp) { e.preventDefault(); e.stopPropagation(); cmp.classList.toggle('on'); counts.compare += cmp.classList.contains('on') ? 1 : -1; paint(); toast(cmp.classList.contains('on') ? 'Додано до порівняння' : 'Видалено з порівняння'); return; }
    const cb = e.target.closest('[data-callback]');
    if (cb) { e.preventDefault(); openModal('callback'); return; }
    const op = e.target.closest('[data-open]');
    if (op) { e.preventDefault(); openModal(op.dataset.open); return; }
    const lo = e.target.closest('[data-logout]');
    if (lo) { e.preventDefault(); store.del('sl_user'); renderAuth(); toast('Ви вийшли з акаунта'); return; }
    const card = e.target.closest('[data-href]');
    if (card && !e.target.closest('a,button,input,label,select')) location.href = card.dataset.href;
  });

  /* ---------- simple forms (callback, contacts, reviews) ---------- */
  $$('[data-demo-form]').forEach(f => {
    f.setAttribute('novalidate', '');
    f.addEventListener('submit', e => { e.preventDefault(); if (!validate(f)) return; toast(f.dataset.demoForm); f.reset(); $$('.fld', f).forEach(x => x.classList.remove('good')); closeModals(); });
  });

  /* ---------- auth (demo) ---------- */
  function renderAuth() {
    const u = store.get('sl_user', null);
    document.body.classList.toggle('logged', !!u);
    const name = u && u.name ? u.name : 'Мій кабінет';
    const ini = u && u.name ? u.name.trim()[0].toUpperCase() : 'К';
    $$('[data-acct-name]').forEach(e => e.textContent = u ? (e.tagName === 'H2' && !u.name ? 'Вітаємо!' : name) : 'Мій кабінет');
    $$('[data-acct-phone]').forEach(e => e.textContent = u ? u.phone : '');
    $$('[data-acct-ini]').forEach(e => e.textContent = ini);
    $$('[data-auth-top]').forEach(e => e.textContent = u ? 'Мій кабінет · ' + u.phone : 'Вхід');
    $$('[data-auth-view]').forEach(s => s.hidden = (s.dataset.authView === 'in') !== !!u);
    const pf = $('#profileForm');
    if (pf && u) { pf.name.value = u.name || ''; pf.phone.value = u.phone; pf.email.value = u.email || ''; }
    const cp = $('#checkoutForm input[name=phone]');
    if (cp && u && !cp.value) { cp.value = u.phone; cp.dispatchEvent(new Event('input')); }
    const cn = $('#checkoutForm input[name=fname]');
    if (cn && u && u.name && !cn.value) cn.value = u.name;
  }
  renderAuth();

  const login = $('#loginForm');
  if (login) login.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(login)) return;
    store.set('sl_user', { phone: phoneFormat(phoneDigits(login.phone.value)), name: '', email: '' });
    login.reset(); renderAuth(); window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Ви увійшли в акаунт');
  });
  const prof = $('#profileForm');
  if (prof) prof.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(prof)) return;
    store.set('sl_user', { phone: phoneFormat(phoneDigits(prof.phone.value)), name: prof.name.value.trim(), email: prof.email.value.trim() });
    renderAuth(); toast('Дані збережено');
  });

  /* ---------- forgot password (demo flow) ---------- */
  const fp = $('#forgot');
  if (fp) {
    const step = n => $$('.fp-step', fp).forEach(s => s.hidden = +s.dataset.step !== n);
    const otp = $$('.otp input', fp);
    fp.addEventListener('closed', () => setTimeout(() => { step(1); $$('form', fp).forEach(f => f.reset()); $$('.fld', fp).forEach(f => f.classList.remove('bad', 'good')); }, 250));
    $('[data-fp="1"]', fp).addEventListener('submit', e => {
      e.preventDefault(); const f = e.target; if (!validate(f)) return;
      $('[data-fp-phone]', fp).textContent = phoneFormat(phoneDigits(f.phone.value));
      step(2); setTimeout(() => otp[0].focus(), 50); toast('Код надіслано в SMS');
    });
    $('[data-fp-back]', fp).addEventListener('click', () => step(1));
    $('[data-fp-resend]', fp).addEventListener('click', () => toast('Код надіслано ще раз'));
    otp.forEach((i, k) => {
      i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(-1); if (i.value && otp[k + 1]) otp[k + 1].focus(); $('.otp', fp).classList.remove('bad'); $('[data-otp-err]', fp).textContent = ''; });
      i.addEventListener('keydown', e => { if (e.key === 'Backspace' && !i.value && otp[k - 1]) otp[k - 1].focus(); });
      i.addEventListener('paste', e => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, ''); if (t.length >= 4) { e.preventDefault(); otp.forEach((x, j) => x.value = t[j]); otp[3].focus(); } });
    });
    $('[data-fp="2"]', fp).addEventListener('submit', e => {
      e.preventDefault(); const f = e.target;
      const code = otp.map(i => i.value).join('');
      const codeOk = code.length === 4;
      $('.otp', fp).classList.toggle('bad', !codeOk);
      $('[data-otp-err]', fp).textContent = codeOk ? '' : 'Введіть 4 цифри з SMS';
      if (!validate(f) || !codeOk) return;
      step(3);
    });
  }

  /* ---------- tabs / gallery / copy / rating ---------- */
  $$('[data-tabs]').forEach(t => $$('.tab-nav button', t).forEach(b => b.addEventListener('click', () => {
    $$('.tab-nav button', t).forEach(x => x.classList.toggle('on', x === b));
    $$('.tab-pane', t).forEach(p => p.classList.toggle('on', p.id === b.dataset.tab));
  })));
  $$('.thumb').forEach(t => t.addEventListener('click', () => { $$('.thumb').forEach(x => x.classList.toggle('on', x === t)); $('#pdMain').src = t.dataset.src; }));
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => { navigator.clipboard?.writeText(b.dataset.copy); b.classList.add('ok'); toast('Скопійовано'); setTimeout(() => b.classList.remove('ok'), 1500); }));
  $$('[data-rate]').forEach(r => { const bs = $$('button', r); bs.forEach(b => b.addEventListener('click', () => bs.forEach(x => x.classList.toggle('on', +x.dataset.v <= +b.dataset.v)))); bs.forEach(x => x.classList.add('on')); });
  $$('.fchip button').forEach(b => b.addEventListener('click', () => b.parentElement.remove()));

  /* ---------- wishlist / compare pages ---------- */
  const list = $('[data-saved-list]');
  if (list) {
    const showEmpty = () => { list.hidden = true; $('[data-empty]').hidden = false; };
    list.addEventListener('click', e => {
      const x = e.target.closest('[data-unsave]'); if (!x) return;
      const kind = x.dataset.unsave;
      counts[kind] = Math.max(0, counts[kind] - 1); paint();
      if (kind === 'wish') {
        const card = x.closest('[data-saved]'); card.classList.add('leaving');
        setTimeout(() => { card.remove(); if (!$('[data-saved]', list)) showEmpty(); }, 280);
        toast('Видалено зі списку бажань');
      } else {
        const td = x.closest('td'); const idx = [...td.parentElement.children].indexOf(td);
        $$('#cmpTable tr').forEach(tr => tr.children[idx] && tr.children[idx].remove());
        if (!$('[data-saved]', list)) showEmpty();
        toast('Прибрано з порівняння');
      }
    });
    const od = $('#onlyDiff');
    if (od) od.addEventListener('change', () => $('#cmpTable').classList.toggle('only-diff', od.checked));
  }

  /* ---------- cart page ---------- */
  const grid = $('#cartGrid');
  if (grid) {
    const recalc = () => {
      const rows = $$('.cart-row', grid); let n = 0, s = 0;
      rows.forEach(r => { const q = +$('input', r).value; n += q; const v = q * +r.dataset.price; s += v; $('.cr-sum', r).textContent = fmt(v); });
      $('[data-items]').textContent = n; $('[data-subtotal]').textContent = fmt(s); $('[data-total]').textContent = fmt(s);
      if (!rows.length) { grid.hidden = true; $('#cartEmpty').hidden = false; }
    };
    grid.addEventListener('click', e => {
      const q = e.target.closest('[data-qty]'); const rm = e.target.closest('[data-remove]');
      if (q) { const i = $('input', q.parentElement); i.value = Math.max(1, +i.value + +q.dataset.qty); recalc(); }
      if (rm) { rm.closest('.cart-row').remove(); recalc(); }
    });
  }

  /* ---------- checkout ---------- */
  const co = $('#checkoutForm');
  if (co) {
    const CITIES = [
      ['Київ', 'м. Київ', 1], ['Львів', 'Львівська обл.', 1], ['Одеса', 'Одеська обл.', 1], ['Харків', 'Харківська обл.', 1], ['Дніпро', 'Дніпропетровська обл.', 1],
      ['Запоріжжя', 'Запорізька обл.', 1], ['Вінниця', 'Вінницька обл.', 1], ['Полтава', 'Полтавська обл.', 1], ['Чернігів', 'Чернігівська обл.', 0], ['Черкаси', 'Черкаська обл.', 0],
      ['Житомир', 'Житомирська обл.', 0], ['Суми', 'Сумська обл.', 0], ['Хмельницький', 'Хмельницька обл.', 0], ['Чернівці', 'Чернівецька обл.', 0], ['Рівне', 'Рівненська обл.', 0],
      ['Івано-Франківськ', 'Івано-Франківська обл.', 0], ['Тернопіль', 'Тернопільська обл.', 0], ['Луцьк', 'Волинська обл.', 0], ['Ужгород', 'Закарпатська обл.', 0], ['Мукачево', 'Закарпатська обл.', 0],
      ['Кропивницький', 'Кіровоградська обл.', 0], ['Миколаїв', 'Миколаївська обл.', 0], ['Херсон', 'Херсонська обл.', 0], ['Кривий Ріг', 'Дніпропетровська обл.', 0], ['Кременчук', 'Полтавська обл.', 0],
      ['Біла Церква', 'Київська обл.', 0], ['Бровари', 'Київська обл.', 0], ['Бориспіль', 'Київська обл.', 0], ['Ірпінь', 'Київська обл.', 0], ['Буча', 'Київська обл.', 0],
      ['Дрогобич', 'Львівська обл.', 0], ['Стрий', 'Львівська обл.', 0], ['Трускавець', 'Львівська обл.', 0], ['Самбір', 'Львівська обл.', 0], ['Шептицький', 'Львівська обл.', 0],
      ['Яворів', 'Львівська обл.', 0], ['Мостиська', 'Львівська обл.', 0], ['Золочів', 'Львівська обл.', 0], ['Ковель', 'Волинська обл.', 0], ['Калуш', 'Івано-Франківська обл.', 0],
      ['Коломия', 'Івано-Франківська обл.', 0], ['Умань', 'Черкаська обл.', 0], ['Кам\'янець-Подільський', 'Хмельницька обл.', 0], ['Бердичів', 'Житомирська обл.', 0], ['Ніжин', 'Чернігівська обл.', 0],
      ['Павлоград', 'Дніпропетровська обл.', 0], ['Ізмаїл', 'Одеська обл.', 0], ['Олександрія', 'Кіровоградська обл.', 0], ['Кам\'янське', 'Дніпропетровська обл.', 0], ['Нововолинськ', 'Волинська обл.', 0]
    ];
    const cityBox = $('[data-city]'), cityIn = $('input', cityBox), cityList = $('.pk-list', cityBox);
    const whBox = $('[data-wh]'), whBtn = $('.pk-select', whBox), whList = $('.pk-items', whBox), whSearch = $('.pk-search', whBox), whVal = $('input[name=wh]', whBox);
    const addr = $('[data-addr]');
    let city = null, act = -1;
    const ship = () => $('input[name=ship]:checked', co).value;
    const norm = s => s.toLowerCase().replace(/['’`]/g, '');
    const hl = (t, q) => { const i = norm(t).indexOf(norm(q)); return i < 0 || !q ? t : t.slice(0, i) + '<mark>' + t.slice(i, i + q.length) + '</mark>' + t.slice(i + q.length); };

    function cityRender() {
      const q = cityIn.value.trim();
      let res = CITIES.filter(c => !q || norm(c[0]).includes(norm(q)));
      res.sort((a, b) => (norm(b[0]).startsWith(norm(q)) - norm(a[0]).startsWith(norm(q))) || (b[2] - a[2]));
      res = res.slice(0, 8); act = -1;
      cityList.innerHTML = res.length ? res.map(c => `<div class="pk-item" data-v="${c[0]}"><span>${hl(c[0], q)}</span><em>${c[1]}</em></div>`).join('') : '<div class="pk-empty">Місто не знайдено. Перевірте назву.</div>';
      cityBox.classList.add('open');
    }
    function pickCity(name) {
      city = CITIES.find(c => c[0] === name) || null;
      cityIn.value = name; cityBox.classList.remove('open'); setErr(cityIn, '');
      whVal.value = ''; $('em', whBtn).textContent = 'Оберіть ' + (ship() === 'npp' ? 'поштомат' : 'відділення'); whBtn.classList.remove('set');
      whBtn.disabled = !city;
    }
    cityIn.addEventListener('focus', () => { if (!cityIn.readOnly) cityRender(); });
    cityIn.addEventListener('input', () => { city = null; whBtn.disabled = true; $('em', whBtn).textContent = 'Спочатку оберіть місто'; whVal.value = ''; cityRender(); });
    cityIn.addEventListener('keydown', e => {
      const items = $$('.pk-item', cityList);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((x, i) => x.classList.toggle('act', i === act)); }
      if (e.key === 'Enter') { e.preventDefault(); const it = items[act >= 0 ? act : 0]; it && pickCity(it.dataset.v); }
    });
    cityList.addEventListener('mousedown', e => { const it = e.target.closest('.pk-item'); if (it) { e.preventDefault(); pickCity(it.dataset.v); } });
    cityIn.addEventListener('blur', () => setTimeout(() => {
      cityBox.classList.remove('open');
      if (!city && cityIn.value.trim()) { const m = CITIES.find(c => norm(c[0]) === norm(cityIn.value.trim())); if (m) pickCity(m[0]); }
    }, 120));

    function whItems() {
      if (!city) return [];
      const big = city[2], n = big ? 14 : 6, out = [];
      if (ship() === 'npp') {
        const seed = city[0].length * 97;
        for (let i = 0; i < n; i++) out.push([`Поштомат №${20000 + seed + i * 37}`, 'Цілодобово · до 20 кг']);
      } else {
        for (let i = 1; i <= n; i++) out.push([`Відділення №${i}`, i % 4 === 1 ? 'Вантажне · до 1000 кг' : 'Поштове · до 30 кг']);
      }
      return out;
    }
    function whRender() {
      const q = whSearch.value.trim();
      const res = whItems().filter(w => !q || norm(w[0] + ' ' + w[1]).includes(norm(q)));
      whList.innerHTML = res.length ? res.map(w => `<div class="pk-item" data-v="${w[0]}"><span>${hl(w[0], q)}</span><em>${w[1]}</em></div>`).join('') : '<div class="pk-empty">Нічого не знайдено</div>';
    }
    whBtn.addEventListener('click', () => { if (whBtn.disabled) return; whSearch.value = ''; whRender(); whBox.classList.toggle('open'); if (whBox.classList.contains('open')) setTimeout(() => whSearch.focus(), 30); });
    whSearch.addEventListener('input', whRender);
    whList.addEventListener('click', e => { const it = e.target.closest('.pk-item'); if (!it) return; whVal.value = it.dataset.v; $('em', whBtn).textContent = it.dataset.v + ' · ' + city[0]; whBtn.classList.add('set'); whBox.classList.remove('open'); setErr(whBtn, ''); });
    document.addEventListener('click', e => { if (!e.target.closest('[data-wh]')) whBox.classList.remove('open'); });

    function onShip() {
      const s = ship(), courier = s === 'npc' || s === 'lviv';
      whBox.hidden = courier; addr.hidden = !courier;
      $('[data-wh-label]', whBox).textContent = s === 'npp' ? 'Поштомат *' : 'Відділення *';
      if (s === 'lviv') { pickCity('Львів'); cityIn.readOnly = true; }
      else { if (cityIn.readOnly) { cityIn.readOnly = false; } if (city) pickCity(city[0]); }
      $$('[data-addr] input[name=street], [data-addr] input[name=house]', co).forEach(i => i.required = courier);
    }
    $$('input[name=ship]', co).forEach(r => r.addEventListener('change', onShip)); onShip();

    /* COD fee */
    const fee = $('[data-fee-row]'), tot = $('[data-total]'), base = +tot.dataset.base;
    const pay = () => $('input[name=pay]:checked', co).value;
    const updFee = () => { const cod = pay() === 'cod'; fee.style.display = cod ? '' : 'none'; tot.textContent = fmt(base + (cod ? Math.round(base * 0.01) : 0)); };
    $$('input[name=pay]', co).forEach(r => r.addEventListener('change', updFee)); updFee();

    co.addEventListener('submit', e => {
      e.preventDefault();
      const ok = validate(co, () => {
        let good = true;
        ['fname', 'lname'].forEach(n => { const i = co[n]; if (i.value.trim() && i.value.trim().length < 2) { setErr(i, 'Занадто коротко'); good = false; } });
        if (!city) { setErr(cityIn, cityIn.value.trim() ? 'Оберіть місто зі списку' : 'Вкажіть місто доставки'); good = false; }
        if (!whBox.hidden && !whVal.value) { setErr(whBtn, ship() === 'npp' ? 'Оберіть поштомат' : 'Оберіть відділення'); good = false; }
        return good;
      });
      if (!ok) { toast('Перевірте виділені поля'); return; }
      const SHIP = { np: 'Нова пошта, ' + whVal.value, npp: 'Нова пошта, ' + whVal.value, npc: 'Кур\'єр НП, ' + co.street.value + ', ' + co.house.value, lviv: 'Кур\'єр по Львову, ' + co.street.value + ', ' + co.house.value };
      const PAY = { cod: 'При отриманні (+1%)', card: 'На карту ПриватБанк', bank: 'Банківський переказ' };
      $('[data-done-name]').textContent = co.fname.value.trim();
      $('[data-done-no]').textContent = 'SL-' + String(Math.floor(10000 + Math.random() * 89999));
      $('[data-done-phone]').textContent = phoneFormat(phoneDigits(co.phone.value));
      $('[data-done-ship]').textContent = city[0] + ' · ' + SHIP[ship()];
      $('[data-done-pay]').textContent = PAY[pay()];
      $('[data-done-total]').textContent = tot.textContent;
      co.hidden = true; $('#orderDone').hidden = false;
      $$('.steps .step').forEach((s, i) => { s.className = 'step ' + (i < 2 ? 'done' : 'on'); if (i < 2) s.querySelector('i').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>'; });
      const h1 = $('.phead h1'); if (h1) h1.textContent = 'Замовлення оформлено';
      const k = $('.phead .kicker'); if (k) k.textContent = 'Крок 3 з 3';
      store.set('sl_cart', { n: 0, sum: 0 }); paint();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- home: hero slider ---------- */
  const slides = $$('.slide');
  if (slides.length) {
    const DUR = 7000; const tabs = $$('.tab'); let idx = 0, timer;
    slides.forEach((s, i) => {
      s.querySelector('.stamp').innerHTML =
        `<svg viewBox="0 0 140 140"><defs><path id="cp${i}" d="M70,70 m-56,0 a56,56 0 1,1 112,0 a56,56 0 1,1 -112,0"/></defs>
          <circle cx="70" cy="70" r="68" fill="#0d0b08" stroke="rgba(212,175,55,.55)"/>
          <text font-family="IBM Plex Mono" font-size="11.5" font-weight="600" letter-spacing="3" fill="#f0cc63"><textPath href="#cp${i}">${s.dataset.stamp}</textPath></text></svg>
         <div class="core"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.9L22 9.3l-5.5 4.7 1.7 7.1L12 17.3 5.8 21.1l1.7-7.1L2 9.3l7.1-.4z"/></svg></div>`;
    });
    const go = n => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === idx));
      tabs.forEach((t, i) => { t.classList.remove('active'); const b = t.querySelector('i'); b.style.animation = 'none'; b.offsetWidth; b.style.animation = ''; if (i === idx) t.classList.add('active'); });
      clearTimeout(timer); timer = setTimeout(() => go(idx + 1), DUR);
    };
    document.documentElement.style.setProperty('--dur', DUR / 1000 + 's');
    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    $('#prev').onclick = () => go(idx - 1); $('#next').onclick = () => go(idx + 1);
    go(0);
  }

  /* ---------- home: deals countdown ---------- */
  if ($('#tD')) {
    const pad = n => String(n).padStart(2, '0');
    const end = () => { const d = new Date(), e = new Date(d); e.setDate(d.getDate() + ((7 - d.getDay()) % 7)); e.setHours(23, 59, 59, 999); return e; };
    let target = end();
    const tick = () => { let ms = target - Date.now(); if (ms <= 0) { target = new Date(Date.now() + 7 * 864e5); ms = target - Date.now(); }
      const s = Math.floor(ms / 1000); $('#tD').textContent = pad(Math.floor(s / 86400)); $('#tH').textContent = pad(Math.floor(s % 86400 / 3600)); $('#tM').textContent = pad(Math.floor(s % 3600 / 60)); $('#tS').textContent = pad(s % 60); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- AI support widget (stub) ---------- */
  const body = $('#aiBody'), input = $('#aiInput'), hint = $('#aiHint');
  const TG = 'https://t.me/noytbook_meneger';
  let greeted = false;
  const CANNED = {
    pick: 'Із задоволенням допоможу! Скоро я зможу підбирати ноутбук під ваші задачі та бюджет. Поки що скористайтесь <b>фільтрами в каталозі</b> або напишіть менеджеру.',
    delivery: 'Доставляємо Новою поштою за <b>1–3 дні</b> (від 50 грн), кур\'єром по Львову — 100 грн. Оплата: при отриманні (<b>+1% комісії</b>), на карту або переказом.',
    order: 'Перевірка статусу замовлення з\'явиться тут найближчим часом. Зараз уточнити статус може менеджер у Telegram.',
    manager: 'Менеджер на зв\'язку: Пн–Пт 10:00–19:00, Сб 10:00–14:00. Телефон: <b>+380 (68) 117 83 11</b>.'
  };
  const LABELS = { pick: 'Підібрати ноутбук', delivery: 'Доставка і оплата', order: 'Статус замовлення', manager: 'Зв\'язатися з менеджером' };
  const add = (html, who) => { const m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html; body.appendChild(m); body.scrollTop = body.scrollHeight; };
  const typing = () => { const t = document.createElement('div'); t.className = 'msg bot typing'; t.innerHTML = '<i></i><i></i><i></i>'; body.appendChild(t); body.scrollTop = body.scrollHeight; return t; };
  const tgBtn = `<br><a class="inl" href="${TG}" target="_blank" rel="noopener">Написати в Telegram →</a>`;

  // Точка підключення ШІ: замініть тіло цієї функції на запит до вашого бекенду.
  async function askAssistant(text, intent) {
    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));
    if (intent && CANNED[intent]) return CANNED[intent] + (intent !== 'delivery' ? tgBtn : '');
    return 'Дякую за питання! Я ще навчаюсь — <b>штучний інтелект підключимо найближчим часом</b>. Поки що менеджер швидко відповість вам у месенджері.' + tgBtn;
  }
  async function send(text, intent) { if (!text.trim()) return; add(text.replace(/</g, '&lt;'), 'me'); const t = typing(); const r = await askAssistant(text, intent); t.remove(); add(r, 'bot'); }
  function open(state) {
    document.body.classList.toggle('ai-open', state); hint.classList.remove('show');
    if (state && !greeted) { greeted = true; add('Вітаю! 👋 Я помічник <b>ShopLaptop</b>. Допоможу з вибором техніки, доставкою та оплатою. Чим можу допомогти?', 'bot'); }
    if (state) setTimeout(() => input.focus(), 250);
  }
  $('#aiBtn').onclick = () => open(!document.body.classList.contains('ai-open'));
  $('#aiClose').onclick = () => open(false);
  $('#aiQuick').addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(LABELS[b.dataset.q], b.dataset.q); });
  $('#aiForm').addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  setTimeout(() => { if (!document.body.classList.contains('ai-open')) hint.classList.add('show'); }, 3500);
  setTimeout(() => hint.classList.remove('show'), 11000);
})();
