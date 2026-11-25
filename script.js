/* ============================================================
   FU'ANLI — interaction, sound, and the slow turn of a house
   ============================================================ */

(() => {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!window.location.hash) window.scrollTo(0, 0);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const pad2 = n => String(n).padStart(2, '0');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safeMode = new URLSearchParams(window.location.search).has('safe');
  const body = document.body;
  const html = document.documentElement;

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const todayDots = `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`;
  const todayChinese = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;

  const state = {
    name: '',
    booked: false,
    visited: false,
    jumpArmed: false,
    jumped: false,
    thresholdFlashed: false,
    corridorFlashed: false,
    night: false,
    ended: false,
    longestRoom: '',
    lastCorridorCue: -1,
    lastFinaleCue: -1,
    scrollCount: 0,
    firstScroll: true
  };

  /* ------------------------------------------------------------
     References
  ------------------------------------------------------------ */
  const refs = {
    loader: $('#loader'),
    loaderCount: $('#loader-count'),
    header: $('#topbar'),
    progressBar: $('#scroll-progress-bar'),
    threshold: $('#threshold'),
    history: $('#history'),
    corridor: $('#corridor'),
    ledger: $('#ledger'),
    finale: $('#finale'),
    aftermath: $('#aftermath'),
    top: $('#top'),
    footer: $('.footer'),
    soundToggle: $('#sound-toggle'),
    soundLabel: $('.sound-pill__text'),
    soundNudge: $('#sound-nudge'),
    soundNudgeBtn: $('#sound-nudge-btn'),
    soundNudgeClose: $('#sound-nudge-close'),
    menuBtn: $('#menu-btn'),
    menuClose: $('#menu-close'),
    mobileMenu: $('#mobile-menu'),
    headerCta: $('#header-cta'),
    visitorName: $('#visitor-name'),
    visitorDate: $('#visitor-date'),
    bookingForm: $('#booking-form'),
    formError: $('#form-error'),
    formSuccess: $('#form-success'),
    successName: $('#success-name'),
    successRoom: $('#success-room'),
    afterBook: $('#after-book'),
    ledgerYourName: $('#ledger-your-name'),
    finaleName: $('#finale-name'),
    contractName: $('#contract-name'),
    contractDate: $('#contract-date'),
    finaleScene: $('#finale-scene'),
    portraitZoom: $('.portrait-zoom'),
    portraitFrame: $('#portrait-frame'),
    portraitOpen: $('#portrait-open'),
    portraitClosed: $('#portrait-closed'),
    finaleIntro: $('#finale-intro'),
    finaleCaption: $('#finale-caption'),
    finaleCaptionNo: $('#finale-caption-no'),
    finaleCaptionText: $('#finale-caption-text'),
    finaleCertificate: $('#finale-certificate'),
    finaleHint: $('#finale-hint'),
    finaleVeil: $('#portrait-veil'),
    finaleBlackout: $('#finale-blackout'),
    corridorGhost: $('#corridor-ghost'),
    corridorCopy: $('#corridor-copy'),
    corridorTitle: $('#corridor-title'),
    corridorLine: $('#corridor-line'),
    corridorStep: $('#corridor-step'),
    corridorWarn: $('#corridor-warn'),
    corridorWhiteout: $('#corridor-whiteout'),
    hudTimer: $('#hud-timer'),
    liveClock: $('#live-clock'),
    liveUpdate: $('#live-update'),
    sessionStart: $('#session-start'),
    sessionDuration: $('#session-duration'),
    sessionScrolls: $('#session-scrolls'),
    sessionScreen: $('#session-screen'),
    sessionDevice: $('#session-device'),
    sessionRoom: $('#session-room'),
    sessionLate: $('#session-late'),
    dossier: $('#dossier'),
    dossierNo: $('#dossier-no'),
    dossierName: $('#dossier-name'),
    dossierEn: $('#dossier-en'),
    dossierFields: $('#dossier-fields'),
    dossierNote: $('#dossier-note'),
    dossierStamp: $('#dossier-stamp'),
    openTerms: $('#open-terms'),
    closeTerms: $('#close-terms'),
    termsDialog: $('#terms-dialog'),
    revisit: $('#revisit'),
    aftermathResidents: $('#aftermath-residents'),
    aftermathVacancy: $('#aftermath-vacancy'),
    lateMessage: $('#late-message')
  };

  /* ------------------------------------------------------------
     Time and session details
  ------------------------------------------------------------ */
  refs.sessionStart.textContent = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  refs.contractDate.textContent = todayDots;
  $('.js-year').textContent = now.getFullYear();
  if (refs.visitorDate) {
    refs.visitorDate.min = todayISO;
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    refs.visitorDate.value = `${inThreeDays.getFullYear()}-${pad2(inThreeDays.getMonth() + 1)}-${pad2(inThreeDays.getDate())}`;
  }

  function updateLiveClock() {
    const d = new Date();
    refs.liveClock.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    refs.liveClock.setAttribute('datetime', d.toISOString());
    refs.hudTimer.textContent = `03:17:${pad2(d.getSeconds())}`;
  }
  updateLiveClock();
  window.setInterval(updateLiveClock, 1000);

  const sessionStarted = Date.now();
  function updateSessionDuration() {
    const secs = Math.floor((Date.now() - sessionStarted) / 1000);
    refs.sessionDuration.textContent = `${pad2(Math.floor(secs / 60))}:${pad2(secs % 60)}`;
  }
  updateSessionDuration();
  window.setInterval(updateSessionDuration, 1000);

  function detectDevice() {
    const ua = navigator.userAgent;
    let os = '本机';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = '浏览器';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\//i.test(ua)) browser = 'Opera';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    return `${os} · ${browser}`;
  }

  function updateScreenDetails() {
    refs.sessionScreen.textContent = `${window.innerWidth} × ${window.innerHeight}`;
    refs.sessionDevice.textContent = detectDevice();
  }
  updateScreenDetails();
  window.addEventListener('resize', updateScreenDetails, { passive: true });

  /* ------------------------------------------------------------
     Return visits
  ------------------------------------------------------------ */
  try {
    state.visited = sessionStorage.getItem('fuanli_seen') === '1';
    sessionStorage.setItem('fuanli_seen', '1');
  } catch (err) {
    state.visited = false;
  }

  if (state.visited) {
    body.classList.add('is-revisit');
    const loaderNote = $('.loader__note');
    if (loaderNote) loaderNote.textContent = '灯还亮着。您回来了。';
  }

  /* ------------------------------------------------------------
     Loader
  ------------------------------------------------------------ */
  let loaderFinished = false;
  let pageLoaded = document.readyState === 'complete';
  let loaderStart = 0;

  window.addEventListener('load', () => { pageLoaded = true; }, { passive: true });

  function finishLoader() {
    if (loaderFinished) return;
    loaderFinished = true;
    refs.loader.classList.add('is-done');
    refs.loader.setAttribute('aria-hidden', 'true');
    html.classList.remove('is-loading');
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    window.setTimeout(() => {
      if (refs.loader && refs.loader.parentNode) refs.loader.remove();
    }, 1300);
    startReveals();
    if (state.visited) showReturnNote();
  }

  function loaderLoop(ts) {
    if (!loaderStart) loaderStart = ts;
    const elapsed = ts - loaderStart;
    const count = Math.min(99, Math.floor(easeOutCubic(clamp(elapsed / 2100, 0, 1)) * 99));
    refs.loaderCount.textContent = pad2(count);
    if ((pageLoaded && elapsed > 1900) || elapsed > 3600) {
      refs.loaderCount.textContent = '100';
      finishLoader();
      return;
    }
    window.requestAnimationFrame(loaderLoop);
  }
  window.requestAnimationFrame(loaderLoop);

  function showReturnNote() {
    const note = document.createElement('p');
    note.className = 'revisit-note';
    note.textContent = '您回来了。茶还是温的。';
    document.body.appendChild(note);
    window.setTimeout(() => note.classList.add('is-visible'), 500);
    window.setTimeout(() => note.classList.remove('is-visible'), 7600);
    window.setTimeout(() => note.remove(), 9200);
  }

  /* ------------------------------------------------------------
     Reveal-on-scroll
  ------------------------------------------------------------ */
  let revealsStarted = false;
  function startReveals() {
    if (revealsStarted) return;
    revealsStarted = true;
    const items = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-inview'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
    items.forEach(el => observer.observe(el));
  }

  /* ------------------------------------------------------------
     Navigation
  ------------------------------------------------------------ */
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    refs.mobileMenu.classList.toggle('is-open', open);
    refs.mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    refs.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.classList.toggle('menu-open', open);
    if (open) {
      const firstLink = refs.mobileMenu.querySelector('a');
      if (firstLink) window.setTimeout(() => firstLink.focus(), 80);
    } else {
      refs.menuBtn.focus();
    }
  }
  refs.menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  refs.menuClose.addEventListener('click', () => setMenu(false));
  $$('#mobile-menu a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
  });

  /* ------------------------------------------------------------
     Booking form
  ------------------------------------------------------------ */
  function selectedRoom() {
    const checked = refs.bookingForm.querySelector('input[name="room"]:checked');
    return checked ? checked.value : '听雨';
  }

  function applyVisitorName(name) {
    state.name = name;
    const display = name || '您';
    const formal = name || '到访者';
    if (refs.ledgerYourName) refs.ledgerYourName.textContent = display;
    if (refs.finaleName) refs.finaleName.textContent = formal;
    if (refs.contractName) refs.contractName.textContent = formal;
    const youRow = $('.ledger__row--you');
    if (youRow) youRow.setAttribute('aria-label', `当前住客：${display}，房号03归晚`);
    if (refs.sessionLate) {
      refs.sessionLate.textContent = name ? `${name}，需要为您再添一副碗筷吗？` : '需要为您，再添一副碗筷吗？';
    }
    const greeting = $('#late-greeting');
    if (greeting && name) greeting.textContent = `${name}，欢迎回家。`;
  }

  refs.bookingForm.addEventListener('submit', e => {
    e.preventDefault();
    const raw = refs.visitorName.value.trim();
    if (!raw) {
      refs.formError.textContent = '请留下一个称呼。我们总得知道，该叫谁。';
      refs.bookingForm.classList.add('has-error');
      refs.visitorName.setAttribute('aria-invalid', 'true');
      refs.visitorName.focus();
      return;
    }
    refs.bookingForm.classList.remove('has-error');
    refs.visitorName.removeAttribute('aria-invalid');
    refs.formError.textContent = '';

    const safeName = raw.slice(0, 20);
    state.name = safeName;
    state.booked = true;
    applyVisitorName(safeName);

    const room = selectedRoom();
    const roomLabel = room === '听雨' ? '听雨 · 01' : room === '留白' ? '留白 · 02' : '归晚 · 03';
    refs.successName.textContent = `${safeName}，您好。`;
    refs.successRoom.textContent = roomLabel;
    const warn = refs.formSuccess.querySelector('.success-warn');
    if (warn) {
      warn.textContent = room === '归晚'
        ? '请准时。她不喜欢等。'
        : '请准时。门不会等太久。';
    }
    refs.bookingForm.classList.add('is-booked');
    refs.formSuccess.setAttribute('tabindex', '-1');
    window.setTimeout(() => refs.formSuccess.focus({ preventScroll: true }), 120);
    body.classList.add('has-booked');
    updateDossier('you', true);
  });

  refs.visitorName.addEventListener('input', () => {
    if (!refs.formError.textContent) return;
    refs.formError.textContent = '';
    refs.bookingForm.classList.remove('has-error');
    refs.visitorName.removeAttribute('aria-invalid');
  });

  refs.afterBook.addEventListener('click', () => {
    refs.threshold.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  applyVisitorName('');

  /* ------------------------------------------------------------
     Ledger dossier
  ------------------------------------------------------------ */
  const people = {
    wanqing: {
      no: 'NO. 0001',
      name: '林婉卿',
      en: 'LIN WANQING',
      fields: [
        ['生卒', '民国六年 — 民国二十六年'],
        ['入住', '民国二十六年 霜降'],
        ['退房', '—'],
        ['遗留物', '一只未绣完的绣鞋']
      ],
      note: '出嫁前第七天，她开始给自己绣鞋。\n只绣完了一只。',
      stamp: '未<br>退<br>房'
    },
    xiaoman: {
      no: 'NO. 0002',
      name: '顾小满',
      en: 'GU XIAOMAN',
      fields: [
        ['生卒', '民国二十一年 — 1958'],
        ['入住', '1958 年 立秋'],
        ['退房', '—'],
        ['遗留物', '一只绣花的右鞋']
      ],
      note: '她说她只是来借住一晚。\n第二天下了一场很大的雨。',
      stamp: '未<br>退<br>房'
    },
    suyue: {
      no: 'NO. 0003',
      name: '苏 月',
      en: 'SU YUE',
      fields: [
        ['生卒', '1946 — 1974'],
        ['入住', '1974 年 寒露'],
        ['退房', '—'],
        ['遗留物', '一本点名册']
      ],
      note: '她是小学老师。点名册的最后一页，\n写着全班学生的名字。\n也写着她的。',
      stamp: '未<br>退<br>房'
    },
    chenmo: {
      no: 'NO. 0004',
      name: '陈 默',
      en: 'CHEN MO',
      fields: [
        ['生卒', '1967 — 1992'],
        ['入住', '1992 年 谷雨'],
        ['退房', '—'],
        ['遗留物', '128 张室内照片']
      ],
      note: '他说自己是摄影师。\n他说这间房，不上相。\n128 张照片里，一个人也没有。',
      stamp: '未<br>退<br>房'
    },
    zhaochun: {
      no: 'NO. 0005',
      name: '赵春生',
      en: 'ZHAO CHUNSHENG',
      fields: [
        ['生卒', '1971 — 2006'],
        ['入住', '2006 年 冬至'],
        ['退房', '—'],
        ['遗留物', '一只怀表']
      ],
      note: '他修了一辈子表。\n最后一天，他把店里的钟都停了。\n怀表停在 03:17。',
      stamp: '未<br>退<br>房'
    },
    zhouwan: {
      no: 'NO. 0006',
      name: '周 晚',
      en: 'ZHOU WAN',
      fields: [
        ['生卒', '1996 — 2021'],
        ['入住', '2021 年 霜降'],
        ['退房', '—'],
        ['遗留物', '一部还在录像的手机']
      ],
      note: '最后一段视频里，她对着镜头说：\n「妈，我明天就搬。」\n视频后面还有四十分钟。',
      stamp: '未<br>退<br>房'
    },
    you: {
      no: 'NO. 0007',
      name: '您',
      en: 'THE SEVENTH',
      fields: [
        ['生卒', '—'],
        ['入住', todayChinese],
        ['退房', '—'],
        ['遗留物', '还没有']
      ],
      note: '您还没有留下东西。\n别急。头七还没到。',
      stamp: '已<br>登<br>记'
    }
  };

  function renderDossier(key) {
    const person = key === 'you' ? {
      ...people.you,
      name: state.name || '您',
      en: state.name ? 'THE SEVENTH VISITOR' : 'THE SEVENTH'
    } : people[key];
    if (!person) return;

    refs.dossier.classList.add('is-changing');
    window.setTimeout(() => {
      refs.dossierNo.textContent = person.no;
      refs.dossierName.textContent = person.name;
      refs.dossierEn.textContent = person.en;
      refs.dossierFields.replaceChildren(...person.fields.map(([label, value]) => {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        return row;
      }));
      refs.dossierNote.replaceChildren(...person.note.split('\n').flatMap((line, i) => {
        const nodes = [document.createTextNode(line)];
        if (i < person.note.split('\n').length - 1) nodes.push(document.createElement('br'));
        return nodes;
      }));
      refs.dossierStamp.innerHTML = person.stamp;
      refs.dossier.classList.remove('is-changing');
    }, reduceMotion ? 0 : 130);
  }

  function updateDossier(key, force = false) {
    if (!force && key === updateDossier.lastKey) return;
    updateDossier.lastKey = key;
    renderDossier(key);
  }

  $$('.ledger__row').forEach(row => {
    row.setAttribute('aria-pressed', row.classList.contains('is-active') ? 'true' : 'false');
    row.addEventListener('click', () => {
      $$('.ledger__row').forEach(r => {
        r.classList.remove('is-active');
        r.setAttribute('aria-pressed', 'false');
      });
      row.classList.add('is-active');
      row.setAttribute('aria-pressed', 'true');
      updateDossier(row.dataset.person);
    });
  });

  /* ------------------------------------------------------------
     Terms dialog
  ------------------------------------------------------------ */
  if (refs.openTerms && refs.termsDialog) {
    refs.openTerms.addEventListener('click', () => {
      if (typeof refs.termsDialog.showModal === 'function') refs.termsDialog.showModal();
      else refs.termsDialog.setAttribute('open', '');
    });
    refs.closeTerms.addEventListener('click', () => refs.termsDialog.close());
    refs.termsDialog.addEventListener('click', e => {
      if (e.target === refs.termsDialog) refs.termsDialog.close();
    });
  }

  if (refs.revisit) {
    refs.revisit.addEventListener('click', e => {
      e.preventDefault();
      try { sessionStorage.setItem('fuanli_seen', '1'); } catch (err) {}
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (err) {}
      window.scrollTo(0, 0);
      window.location.reload();
    });
  }

  /* ------------------------------------------------------------
     Sound engine — all synthesized, no files
  ------------------------------------------------------------ */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.ambientBus = null;
      this.noiseBuffer = null;
      this.enabled = false;
      this.intensity = 0;
      this.heartTimer = null;
      this.heartStep = 0;
      this.ghostTimer = null;
      this.lastStepAt = 0;
      this.oscillators = [];
    }

    makeNoise(seconds = 3) {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * seconds);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      return buffer;
    }

    build() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio unavailable');
      this.ctx = new AudioCtx();
      const ctx = this.ctx;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -26;
      compressor.knee.value = 18;
      compressor.ratio.value = 11;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.24;

      this.master = ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(compressor);
      compressor.connect(ctx.destination);

      this.noiseBuffer = this.makeNoise(4);

      this.ambientBus = ctx.createGain();
      this.ambientBus.gain.value = 0.0001;
      this.ambientBus.connect(this.master);

      // low room tone
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 190;
      noiseFilter.Q.value = 0.4;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.055;
      noise.connect(noiseFilter).connect(noiseGain).connect(this.ambientBus);
      noise.start();
      this.noiseSource = noise;

      // house hum
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.024;
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 260;
      droneGain.connect(droneFilter).connect(this.ambientBus);
      [46, 69, 92.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.8 : i === 1 ? 0.36 : 0.18;
        osc.connect(g).connect(droneGain);
        osc.start();
        this.oscillators.push(osc);
      });

      // slow beating air
      const air = ctx.createBufferSource();
      air.buffer = this.makeNoise(5);
      air.loop = true;
      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.value = 470;
      airFilter.Q.value = 0.45;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.015;
      air.connect(airFilter).connect(airGain).connect(this.ambientBus);
      air.start();
      this.air = air;

      this.ambientNoiseFilter = noiseFilter;
      this.ambientDroneGain = droneGain;
      this.ambientAirGain = airGain;
    }

    async enable() {
      if (!this.ctx) this.build();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.enabled = true;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), t);
      this.master.gain.exponentialRampToValueAtTime(0.52, t + 1.1);
      this.setIntensity(this.intensity || 1, true);
      this.scheduleGhostSound();
    }

    disable() {
      if (!this.ctx) return;
      this.enabled = false;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      this.stopHeartbeat();
      if (this.ghostTimer) {
        window.clearTimeout(this.ghostTimer);
        this.ghostTimer = null;
      }
    }

    setIntensity(level, force = false) {
      const next = clamp(level, 0, 3);
      if (!force && next === this.intensity) return;
      this.intensity = next;
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const target = [0.019, 0.032, 0.056, 0.077][next] || 0.02;
      const filter = [180, 230, 340, 430][next] || 200;
      this.ambientBus.gain.cancelScheduledValues(t);
      this.ambientBus.gain.setTargetAtTime(target, t, 1.3);
      this.ambientNoiseFilter.frequency.setTargetAtTime(filter, t, 1.6);
      if (next >= 3) this.startHeartbeat();
      else this.stopHeartbeat();
    }

    async toggle() {
      if (this.enabled) {
        this.disable();
        return false;
      }
      await this.enable();
      return true;
    }

    whisper() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.05;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100 + Math.random() * 1200;
      filter.Q.value = 4.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.036, t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7 + Math.random() * 0.5);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.random() * 2 - 1;
        src.connect(filter).connect(gain).connect(pan).connect(this.master);
      } else {
        src.connect(filter).connect(gain).connect(this.master);
      }
      src.start(t, Math.random() * 2.4, 1.3);
    }

    creak() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.02;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(72 + Math.random() * 30, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.5);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      filter.Q.value = 6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.014, t + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(filter).connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.6);
    }

    scheduleGhostSound() {
      if (!this.enabled) return;
      if (this.ghostTimer) window.clearTimeout(this.ghostTimer);
      this.ghostTimer = window.setTimeout(() => {
        if (this.enabled && this.intensity >= 2) {
          if (Math.random() < 0.68) this.whisper();
          else this.creak();
        }
        this.scheduleGhostSound();
      }, 6500 + Math.random() * 10000);
    }

    tone(freq, duration, volume, type = 'sine', detune = 0) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    }

    bell() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const partials = [
        [171, 0.09, 3.2],
        [337, 0.045, 2.8],
        [512, 0.024, 2.2],
        [788, 0.014, 1.8]
      ];
      partials.forEach(([f, v, d]) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(v, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + d + 0.1);
      });
    }

    thump(when, volume = 0.19, freq = 56) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, when);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, when + 0.18);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(volume, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.36);
      osc.connect(gain).connect(this.master);
      osc.start(when);
      osc.stop(when + 0.42);
    }

    startHeartbeat() {
      if (!this.enabled || this.heartTimer) return;
      this.heartStep = 0;
      const beat = () => {
        if (!this.enabled || this.intensity < 3) return;
        const ctx = this.ctx;
        if (ctx && ctx.state === 'running') {
          const t = ctx.currentTime + 0.02;
          this.thump(t, 0.22, 54);
          this.thump(t + 0.16, 0.13, 48);
        }
        this.heartTimer = window.setTimeout(beat, this.heartStep > 2 ? 1050 : 1280);
        this.heartStep += 1;
      };
      this.heartTimer = window.setTimeout(beat, 300);
    }

    stopHeartbeat() {
      if (this.heartTimer) {
        window.clearTimeout(this.heartTimer);
        this.heartTimer = null;
      }
    }

    step() {
      if (!this.enabled || !this.ctx) return;
      const nowMs = performance.now();
      if (nowMs - this.lastStepAt < 460) return;
      this.lastStepAt = nowMs;
      const ctx = this.ctx;
      const t = ctx.currentTime + 0.01;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 160;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.04, t + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.random() * 0.7 - 0.35;
        src.connect(filter).connect(gain).connect(pan).connect(this.master);
      } else {
        src.connect(filter).connect(gain).connect(this.master);
      }
      src.start(t, 0, 0.2);
    }

    knock() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const base = ctx.currentTime + 0.15;
      [0, 0.34, 0.68].forEach((offset, i) => {
        const t = base + offset;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(92 - i * 5, t);
        osc.frequency.exponentialRampToValueAtTime(48, t + 0.1);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.13, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.27);
      });
    }

    openEyes() {
      if (!this.enabled || !this.ctx) return;
      this.tone(880, 1.4, 0.014, 'sine');
      this.tone(1318, 1.1, 0.007, 'sine', 4);
    }

    sting() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;
      this.stopHeartbeat();

      // noise hit
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2700, t);
      bp.frequency.exponentialRampToValueAtTime(260, t + 0.45);
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.38, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      src.connect(bp).connect(g).connect(this.master);
      src.start(t, 0, 0.9);

      // falling body
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(37, t + 0.8);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(lp).connect(og).connect(this.master);
      osc.start(t);
      osc.stop(t + 1);

      // bright scrape
      const shriek = ctx.createOscillator();
      shriek.type = 'triangle';
      shriek.frequency.setValueAtTime(2600, t);
      shriek.frequency.exponentialRampToValueAtTime(740, t + 0.32);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.exponentialRampToValueAtTime(0.055, t + 0.01);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      shriek.connect(sg).connect(this.master);
      shriek.start(t);
      shriek.stop(t + 0.5);
    }

    silenceRoom() {
      if (!this.enabled || !this.ctx) return;
      this.stopHeartbeat();
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(0.0001, t, 1.4);
    }
  }

  const sound = new SoundEngine();
  let soundNudgeShown = false;
  let soundNudgeDismissed = false;

  function setSoundUI(on) {
    refs.soundToggle.classList.toggle('is-on', on);
    refs.soundToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    refs.soundLabel.textContent = on ? '声音 · 开' : '声音 · 关';
    refs.soundToggle.setAttribute('aria-label', on ? '关闭环境音' : '开启环境音');
    refs.soundToggle.title = on ? '关闭环境音' : '开启环境音';
  }

  async function toggleSound() {
    try {
      const on = await sound.toggle();
      setSoundUI(on);
      if (on) hideSoundNudge();
    } catch (err) {
      refs.soundLabel.textContent = '声音 · 不可用';
    }
  }

  refs.soundToggle.addEventListener('click', toggleSound);
  refs.soundNudgeBtn.addEventListener('click', toggleSound);

  function showSoundNudge() {
    if (state.night || body.classList.contains('is-night') || soundNudgeShown || soundNudgeDismissed || sound.enabled) return;
    soundNudgeShown = true;
    refs.soundNudge.classList.add('is-visible');
    window.setTimeout(() => {
      if (!sound.enabled) hideSoundNudge();
    }, 6500);
  }

  function hideSoundNudge() {
    refs.soundNudge.classList.remove('is-visible');
  }

  refs.soundNudgeClose.addEventListener('click', () => {
    soundNudgeDismissed = true;
    hideSoundNudge();
  });

  // Audio controls shouldn't remember or leak information: memory only.
  document.addEventListener('visibilitychange', () => {
    if (!sound.ctx) return;
    if (document.hidden) {
      sound.ctx.suspend().catch(() => {});
    } else if (sound.enabled) {
      sound.ctx.resume().catch(() => {});
    }
  });

  /* ------------------------------------------------------------
     Canvas motes / ash
  ------------------------------------------------------------ */
  const canvas = $('#motes');
  const ctx2d = canvas.getContext('2d');
  let particles = [];
  let canvasW = 0;
  let canvasH = 0;
  let lastFrame = performance.now();
  let nightMix = 0;

  function makeParticles() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width = Math.floor(canvasW * dpr);
    canvas.height = Math.floor(canvasH * dpr);
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = clamp(Math.round((canvasW * canvasH) / 26000), 28, 84);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      size: Math.random() * 1.5 + 0.35,
      speed: Math.random() * 0.16 + 0.035,
      drift: Math.random() * 0.22 - 0.11,
      alpha: Math.random() * 0.25 + 0.06,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function drawMotes(ts) {
    const dt = Math.min(48, ts - lastFrame);
    lastFrame = ts;
    nightMix = lerp(nightMix, body.classList.contains('is-night') ? 1 : 0, 0.025);
    ctx2d.clearRect(0, 0, canvasW, canvasH);
    particles.forEach(p => {
      p.y -= p.speed * dt * 0.055;
      p.x += (p.drift + Math.sin(p.phase + ts * 0.00016) * 0.06) * dt * 0.045;
      if (p.y < -8) {
        p.y = canvasH + 8;
        p.x = Math.random() * canvasW;
      }
      if (p.x < -8) p.x = canvasW + 8;
      if (p.x > canvasW + 8) p.x = -8;
      const alpha = p.alpha * (0.65 + Math.sin(p.phase + ts * 0.0005) * 0.35);
      ctx2d.beginPath();
      if (nightMix > 0.35) {
        ctx2d.fillStyle = `rgba(180, ${Math.round(48 + 50 * (1 - nightMix))}, ${Math.round(36 + 30 * (1 - nightMix))}, ${alpha * 0.55})`;
      } else {
        ctx2d.fillStyle = `rgba(113, 92, 57, ${alpha * 0.45})`;
      }
      ctx2d.arc(p.x, p.y, p.size * (1 + nightMix * 0.4), 0, Math.PI * 2);
      ctx2d.fill();
    });
    if (!reduceMotion) window.requestAnimationFrame(drawMotes);
  }

  makeParticles();
  window.addEventListener('resize', () => {
    makeParticles();
    measureFinaleScale();
  }, { passive: true });
  if (!reduceMotion) window.requestAnimationFrame(drawMotes);
  else drawMotes(0);

  /* ------------------------------------------------------------
     Pointer glow and eye glints
  ------------------------------------------------------------ */
  const pointerGlow = $('#pointer-glow');
  let pointerFrame = 0;
  let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      pointerGlow.style.transform = `translate3d(${lastPointer.x}px, ${lastPointer.y}px, 0)`;
      updateEyeGlints(lastPointer.x, lastPointer.y);
    });
  }, { passive: true });

  function updateEyeGlints(x, y) {
    if (!refs.portraitFrame || !refs.finaleScene.classList.contains('eyes-open')) return;
    const rect = refs.portraitFrame.getBoundingClientRect();
    if (!rect.width) return;
    const dx = clamp((x - (rect.left + rect.width / 2)) / rect.width, -0.35, 0.35) * 10;
    const dy = clamp((y - (rect.top + rect.height * 0.4)) / rect.height, -0.35, 0.35) * 6;
    refs.finaleScene.style.setProperty('--gx', `${dx.toFixed(2)}px`);
    refs.finaleScene.style.setProperty('--gy', `${dy.toFixed(2)}px`);
  }

  /* ------------------------------------------------------------
     Scroll tracking + chapter choreography
  ------------------------------------------------------------ */
  function pinProgress(el) {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const denom = Math.max(1, el.offsetHeight - window.innerHeight);
    return clamp((-rect.top) / denom, 0, 1);
  }

  function rectAtTop(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top <= 24 && rect.bottom > 24;
  }

  const corridorCues = [
    {
      at: 0,
      kicker: '监 控 回 放 · 03',
      title: '走廊尽头，23:47',
      line: '画面里没有人。只有走廊尽头的灯，亮着。'
    },
    {
      at: 0.16,
      kicker: '监 控 回 放 · 03',
      title: '您往前走了十二步',
      line: '屏幕里的她，也往前走了十二步。'
    },
    {
      at: 0.33,
      kicker: '监 控 回 放 · 03',
      title: '走廊没有变短',
      line: '是您，走进去了。'
    },
    {
      at: 0.49,
      kicker: '监 控 回 放 · 03',
      title: '灯一盏一盏灭了',
      line: '她还在那里。'
    },
    {
      at: 0.65,
      kicker: '监 控 回 放 · 03',
      title: '请停下',
      line: '不是因为您累了。是因为她，已经到门口了。'
    },
    {
      at: 0.8,
      kicker: '最 后 一 段 录 像',
      title: '不要回头',
      line: '她不喜欢您看别的地方。'
    },
    {
      at: 0.91,
      kicker: '最 后 一 段 录 像',
      title: '她到门口了',
      line: '向下。为她开门。'
    }
  ];

  const finaleCues = [
    { at: 0, no: '01', html: '民国二十六年，霜降。<br>林家嫁女。' },
    { at: 0.16, no: '02', html: '新郎没有来。<br>婚书上，空着一个名字。' },
    { at: 0.32, no: '03', html: '他们等了八十九年。<br>等到房子都学会了招租。' },
    { at: 0.46, no: '04', html: '现在，最后一个名字，<br>也写上了。' },
    { at: 0.6, no: '05', html: '盖头下面的人，<br>一直在看您。' },
    { at: 0.74, no: '06', html: '不要移开眼睛。' },
    { at: 0.86, no: '07', html: '她已经，<br>站在您面前了。' }
  ];

  let corridorCueTimer = null;
  let finaleCueTimer = null;
  let finaleMaxScale = 3.2;
  let lastCorridorStep = -1;
  let lastDwellFrame = performance.now();
  const roomDwell = {};

  function measureFinaleScale() {
    if (!refs.portraitFrame) return;
    const h = refs.portraitFrame.offsetHeight || 1;
    const desired = window.innerHeight * 1.08;
    finaleMaxScale = clamp(desired / (h * 0.53), 2.8, 6.2);
  }
  measureFinaleScale();
  window.addEventListener('load', measureFinaleScale, { passive: true });
  window.setTimeout(measureFinaleScale, 600);

  function setCorridorCue(index) {
    if (index === state.lastCorridorCue) return;
    state.lastCorridorCue = index;
    const cue = corridorCues[index];
    if (!cue) return;
    if (reduceMotion) {
      $('.corridor__kicker').textContent = cue.kicker;
      refs.corridorTitle.textContent = cue.title;
      refs.corridorLine.textContent = cue.line;
      return;
    }
    if (corridorCueTimer) window.clearTimeout(corridorCueTimer);
    refs.corridorCopy.classList.add('is-changing');
    corridorCueTimer = window.setTimeout(() => {
      $('.corridor__kicker').textContent = cue.kicker;
      refs.corridorTitle.textContent = cue.title;
      refs.corridorLine.textContent = cue.line;
      refs.corridorCopy.classList.remove('is-changing');
    }, 230);
  }

  function setFinaleCue(index) {
    if (index === state.lastFinaleCue) return;
    state.lastFinaleCue = index;
    const cue = finaleCues[index];
    if (!cue) return;
    let html = cue.html;
    if (state.name && cue.no === '06') {
      html = `${escapeHTML(state.name)}，<br>不要移开眼睛。`;
    } else if (state.name && cue.no === '07') {
      html = `${escapeHTML(state.name)}，<br>她已经站在您面前了。`;
    }
    if (reduceMotion) {
      refs.finaleCaptionNo.textContent = cue.no;
      refs.finaleCaptionText.innerHTML = html;
      return;
    }
    if (finaleCueTimer) window.clearTimeout(finaleCueTimer);
    refs.finaleCaption.classList.add('is-changing');
    finaleCueTimer = window.setTimeout(() => {
      refs.finaleCaptionNo.textContent = cue.no;
      refs.finaleCaptionText.innerHTML = html;
      refs.finaleCaption.classList.remove('is-changing');
    }, 220);
  }

  function updateThreshold() {
    if (!refs.threshold) return;
    const p = pinProgress(refs.threshold);
    const cover = smoothstep(0.035, 0.265, p);
    const dayfade = 1 - smoothstep(0.09, 0.295, p);
    const nightness = smoothstep(0.255, 0.45, p);
    const sealc = smoothstep(0.88, 0.995, p);
    refs.threshold.style.setProperty('--cover', cover.toFixed(4));
    refs.threshold.style.setProperty('--dayfade', dayfade.toFixed(4));
    refs.threshold.style.setProperty('--nightness', nightness.toFixed(4));
    refs.threshold.style.setProperty('--sealc', sealc.toFixed(4));

    if (p > 0.3 && !state.night) {
      state.night = true;
      body.classList.add('is-night');
      hideSoundNudge();
      if (refs.headerCta) refs.headerCta.setAttribute('href', '#finale');
      updateFavicon();
    }

    if (p > 0.33 && !state.thresholdFlashed) {
      state.thresholdFlashed = true;
      refs.threshold.classList.add('is-turned');
      if (!reduceMotion) {
        refs.threshold.classList.add('is-flashing');
        window.setTimeout(() => refs.threshold.classList.remove('is-flashing'), 1300);
      }
      if (sound.enabled) sound.bell();
    }

    const ritualP = smoothstep(0.36, 0.94, p);
    const active = Math.min(3, Math.floor(ritualP * 4));
    $$('.ritual__steps li').forEach((li, i) => {
      li.classList.toggle('is-active', i === active && p > 0.34);
      li.classList.toggle('is-passed', i < active && p > 0.36);
    });

    return p;
  }

  function updateCorridor() {
    if (!refs.corridor) return 0;
    const p = pinProgress(refs.corridor);
    const walk = smoothstep(0, 0.94, p);
    const eased = Math.pow(walk, 1.55);
    const ghostH = refs.corridorGhost.offsetHeight || window.innerHeight * 0.78;
    const isSmall = window.innerWidth < 700;
    const baseTarget = window.innerHeight * (isSmall ? 1.52 : 1.92);
    const maxScale = clamp(baseTarget / ghostH, 1.7, 3.15);
    const scale = 0.13 + eased * (maxScale - 0.13);
    const startTop = isSmall ? 64 : 58;
    const finalTop = ((window.innerHeight * 0.43) - ghostH * maxScale * 0.23) / window.innerHeight * 100;
    const topPct = lerp(startTop, finalTop, eased);
    const brightness = 0.2 + eased * 0.24;
    const blur = 2.1 * (1 - eased);

    refs.corridor.style.setProperty('--gs', scale.toFixed(4));
    refs.corridor.style.setProperty('--gtop', `${topPct.toFixed(2)}%`);
    refs.corridor.style.setProperty('--gl', brightness.toFixed(3));
    refs.corridor.style.setProperty('--gc', (1.08 + eased * 0.26).toFixed(3));
    refs.corridor.style.setProperty('--gb', `${blur.toFixed(2)}px`);
    refs.corridor.style.setProperty('--cam', (1.015 + walk * 0.135).toFixed(4));
    refs.corridor.style.setProperty('--walk', walk.toFixed(4));
    refs.corridor.style.setProperty('--warn', smoothstep(0.72, 0.9, p).toFixed(4));

    const step = Math.min(47, Math.round(walk * 47));
    if (step !== lastCorridorStep) {
      lastCorridorStep = step;
      refs.corridorStep.textContent = String(step).padStart(3, '0');
      if (sound.enabled && p > 0.12) sound.step();
    }

    let cueIndex = 0;
    corridorCues.forEach((cue, i) => { if (p >= cue.at) cueIndex = i; });
    setCorridorCue(cueIndex);

    const corridorRect = refs.corridor.getBoundingClientRect();
    const corridorVisible = corridorRect.top < window.innerHeight && corridorRect.bottom > 0;
    if (p > 0.93 && !state.corridorFlashed && corridorVisible) {
      state.corridorFlashed = true;
      if (!reduceMotion) {
        refs.corridor.classList.add('is-flashing');
        window.setTimeout(() => refs.corridorWhiteout.classList.add('is-on'), 560);
        window.setTimeout(() => refs.corridor.classList.remove('is-flashing'), 1000);
      } else {
        refs.corridorWhiteout.classList.add('is-on');
      }
    }
    if (p < 0.42 && state.corridorFlashed) {
      state.corridorFlashed = false;
      refs.corridor.classList.remove('is-flashing');
      refs.corridorWhiteout.classList.remove('is-on');
    }
    return p;
  }

  function armFinaleJump() {
    if (state.jumpArmed || state.jumped) return;
    state.jumpArmed = true;
    window.setTimeout(() => {
      if (state.jumped) return;
      if (!isFinaleInView()) {
        state.jumpArmed = false;
        return;
      }
      triggerFinaleJump();
    }, reduceMotion ? 2000 : 2400);
  }

  function isFinaleInView() {
    if (!refs.finale) return false;
    const rect = refs.finale.getBoundingClientRect();
    return rect.top <= 0 && rect.bottom >= window.innerHeight * 0.35;
  }

  function triggerFinaleJump() {
    if (state.jumped || !refs.finale) return;
    state.jumped = true;
    state.ended = true;

    if (sound.enabled && !safeMode) sound.sting();

    const blackoutLine = refs.finaleBlackout ? refs.finaleBlackout.querySelector('.blackout__line') : null;
    if (blackoutLine && state.name) blackoutLine.textContent = `${state.name}，您可以走了。`;

    if (reduceMotion || safeMode) {
      refs.finale.classList.add('is-blackout');
      body.classList.add('is-ended');
      document.title = '看房结束。';
      if (refs.corridorWhiteout) refs.corridorWhiteout.classList.add('is-on');
      return;
    }

    refs.finale.classList.add('is-flashing');
    window.setTimeout(() => {
      refs.finale.classList.add('is-jumping');
    }, 90);
    window.setTimeout(() => {
      refs.finale.classList.remove('is-jumping');
      refs.finale.classList.add('is-blackout');
      body.classList.add('is-ended');
      document.title = '看房结束。';
      if (sound.ctx) {
        sound.setIntensity(1, true);
        sound.stopHeartbeat();
      }
    }, 620);
    window.setTimeout(() => refs.finale.classList.remove('is-flashing'), 1300);
  }

  function updateFinale() {
    if (!refs.finale) return 0;
    const p = pinProgress(refs.finale);
    const zoomT = clamp(p / 0.86, 0, 1);
    const zoom = 0.94 + Math.pow(zoomT, 1.22) * (finaleMaxScale - 0.94);
    const veil = smoothstep(0.42, 0.65, p);
    const intro = 1 - smoothstep(0.02, 0.13, p);
    const cert = 1 - smoothstep(0.22, 0.4, p);
    const plaque = 1 - smoothstep(0.18, 0.34, p);
    const hint = 1 - smoothstep(0.34, 0.46, p);

    refs.finale.style.setProperty('--zoom', zoom.toFixed(4));
    refs.finale.style.setProperty('--veil', veil.toFixed(4));
    refs.finale.style.setProperty('--intro', intro.toFixed(4));
    refs.finale.style.setProperty('--cert', cert.toFixed(4));
    refs.finale.style.setProperty('--plaque', plaque.toFixed(4));
    refs.finale.style.setProperty('--hint', hint.toFixed(4));

    if (p > 0.66) refs.finaleScene.classList.add('veil-lifted');
    if (p > 0.78 && !refs.finaleScene.classList.contains('eyes-open')) {
      refs.finaleScene.classList.add('eyes-open');
      if (sound.enabled) sound.openEyes();
    }

    let cueIndex = 0;
    finaleCues.forEach((cue, i) => { if (p >= cue.at) cueIndex = i; });
    setFinaleCue(cueIndex);

    if (p > 0.87) armFinaleJump();

    return p;
  }

  function updateFavicon() {
    const icon = document.querySelector('link[rel="icon"]');
    if (!icon) return;
    icon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='4' fill='%23140706'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-family='serif' font-size='38' fill='%23b5362c'%3E%E5%A5%A0%3C/text%3E%3C/svg%3E";
  }

  const darkSections = [refs.history, refs.corridor, refs.ledger, refs.finale, refs.aftermath];
  let titleState = '';
  let onDarkState = false;

  function updateThemeAndTitle(thresholdP) {
    let onDark = false;
    if (thresholdP > 0.25 && refs.threshold) {
      const r = refs.threshold.getBoundingClientRect();
      if (r.top < 30 && r.bottom > 30) onDark = true;
    }
    if (!onDark) {
      darkSections.forEach(el => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top <= 70 && r.bottom > 70) onDark = true;
      });
    }
    if (!onDark && refs.footer) {
      const r = refs.footer.getBoundingClientRect();
      if (r.top <= 70 && r.bottom > 0) onDark = true;
    }
    const thresholdRectNow = refs.threshold ? refs.threshold.getBoundingClientRect() : null;
    const corridorRectNow = refs.corridor ? refs.corridor.getBoundingClientRect() : null;
    const finaleRectNow = refs.finale ? refs.finale.getBoundingClientRect() : null;
    const immersive = Boolean(
      (thresholdP > 0.33 && thresholdRectNow && thresholdRectNow.top <= 0 && thresholdRectNow.bottom >= window.innerHeight * 0.5) ||
      (corridorRectNow && corridorRectNow.top <= 0 && corridorRectNow.bottom >= window.innerHeight * 0.5) ||
      (finaleRectNow && finaleRectNow.top <= 0 && finaleRectNow.bottom >= window.innerHeight * 0.5)
    );
    body.classList.toggle('is-immersive', immersive);
    if (onDark !== onDarkState) {
      onDarkState = onDark;
      body.classList.toggle('on-dark', onDark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', onDark ? '#070605' : '#f2ecdf');
    }

    let nextTitle = '福安里 · 城西长租院落';
    if (state.ended) nextTitle = '看房结束。';
    else if (refs.finale && rectAtTop(refs.finale)) nextTitle = '福安里 · 吉时已到';
    else if (refs.ledger && rectAtTop(refs.ledger)) nextTitle = '福安里 · 住客登记簿';
    else if (refs.corridor && rectAtTop(refs.corridor)) nextTitle = '福安里 · 走廊东侧';
    else if (refs.history && rectAtTop(refs.history)) nextTitle = '福安里 · 旧事';
    else if (refs.aftermath && rectAtTop(refs.aftermath)) nextTitle = '谢谢看房。';
    else if (thresholdP > 0.2) nextTitle = '福安里 · 吉时';
    else if (body.classList.contains('is-night')) nextTitle = '福安里 · 灯一直亮着';
    if (nextTitle !== titleState) {
      titleState = nextTitle;
      document.title = nextTitle;
    }
  }

  function trackRooms(nowTs) {
    const dt = Math.min(0.4, Math.max(0, (nowTs - lastDwellFrame) / 1000));
    lastDwellFrame = nowTs;
    $$('.room-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const key = card.dataset.room;
        roomDwell[key] = (roomDwell[key] || 0) + dt;
      }
    });
    let bestKey = '';
    let best = 0;
    Object.entries(roomDwell).forEach(([key, value]) => {
      if (value > best) { best = value; bestKey = key; }
    });
    if (best > 1.2) {
      const labels = {
        tingyu: '「听雨」01 号房',
        liubai: '「留白」02 号房',
        guiwan: '「归晚」03 号房'
      };
      refs.sessionRoom.textContent = labels[bestKey] || '「归晚」03号房';
    }
  }

  function updateAudioIntensity(thresholdP, corridorP, finaleP) {
    if (!sound.enabled) return;
    let intensity = 0;
    if (body.classList.contains('is-dusk')) intensity = 1;
    if (body.classList.contains('is-night')) intensity = 2;
    if (!state.ended && refs.corridor && rectAtTop(refs.corridor)) intensity = 2;
    if (!state.ended && refs.ledger && rectAtTop(refs.ledger)) intensity = 2;
    if (!state.ended && refs.finale && rectAtTop(refs.finale)) intensity = 3;
    if (state.ended) intensity = 1;
    sound.setIntensity(intensity);
  }

  let lastUpdate = 0;
  function updateScroll(ts = performance.now()) {
    lastUpdate = ts;
    const y = window.scrollY || window.pageYOffset || 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const globalP = clamp(y / max, 0, 1);
    refs.progressBar.style.transform = `scaleX(${globalP.toFixed(4)})`;
    refs.header.classList.toggle('is-scrolled', y > 26);

    const thresholdRect = refs.threshold ? refs.threshold.getBoundingClientRect() : null;
    const visitRect = $('#visit') ? $('#visit').getBoundingClientRect() : null;
    const duskApproaching = Boolean(
      (thresholdRect && thresholdRect.top < window.innerHeight * 0.92) ||
      (visitRect && visitRect.top < window.innerHeight * 0.58)
    );
    if (duskApproaching && !body.classList.contains('is-dusk')) {
      body.classList.add('is-dusk');
      window.setTimeout(showSoundNudge, 1600);
    }

    const thresholdP = updateThreshold();
    if (thresholdP > 0.02 && !soundNudgeShown) {
      window.setTimeout(showSoundNudge, 1100);
    }
    const corridorP = updateCorridor();
    const finaleP = updateFinale();
    updateThemeAndTitle(thresholdP);
    trackRooms(ts);
    updateAudioIntensity(thresholdP, corridorP, finaleP);
  }

  let rafPending = false;
  function scheduleUpdate() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(ts => {
      rafPending = false;
      updateScroll(ts);
    });
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });

  /* ------------------------------------------------------------
     Wheel / touch telemetry (local only)
  ------------------------------------------------------------ */
  let lastScrollCount = 0;
  function countScroll() {
    const nowMs = performance.now();
    if (nowMs - lastScrollCount < 90) return;
    lastScrollCount = nowMs;
    state.scrollCount += 1;
    refs.sessionScrolls.textContent = String(state.scrollCount);
  }
  window.addEventListener('wheel', e => { if (e.deltaY !== 0) countScroll(); }, { passive: true });
  window.addEventListener('touchmove', () => countScroll(), { passive: true });
  window.addEventListener('keydown', e => {
    if (['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'].includes(e.key)) countScroll();
  });

  /* ------------------------------------------------------------
     Special moments observed when sections come into view
  ------------------------------------------------------------ */
  let momentsSetup = false;
  function setupMomentObservers() {
    if (momentsSetup || !('IntersectionObserver' in window)) return;
    momentsSetup = true;

    const ledgerObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        window.setTimeout(() => {
          refs.sessionLate.classList.add('is-visible');
        }, 8000);
        ledgerObserver.disconnect();
      });
    }, { threshold: 0.25 });
    if (refs.ledger) ledgerObserver.observe(refs.ledger);

    let aftermathStarted = false;
    const aftermathObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || aftermathStarted) return;
        aftermathStarted = true;
        if (sound.enabled) {
          window.setTimeout(() => sound.knock(), 3600);
        }
        window.setTimeout(() => {
          refs.lateMessage.classList.add('is-visible');
          refs.aftermathResidents.textContent = '12';
          refs.aftermathVacancy.textContent = '0';
          const residency = $$('#resident-count, #file-resident-count');
          residency.forEach(el => { el.textContent = '12'; });
          $$('#vacancy-count, #file-vacancy-count').forEach(el => { el.textContent = '0'; });
          const greeting = $('#late-greeting');
          if (greeting) {
            greeting.textContent = state.name ? `${state.name}，欢迎回家。` : '欢迎回家。';
            window.setTimeout(() => greeting.classList.add('is-visible'), 1300);
          }
          if (sound.enabled) sound.setIntensity(1, true);
        }, 6500);
        aftermathObserver.disconnect();
      });
    }, { threshold: 0.3 });
    if (refs.aftermath) aftermathObserver.observe(refs.aftermath);
  }

  /* ------------------------------------------------------------
     Initialize
  ------------------------------------------------------------ */
  updateScreenDetails();
  renderDossier('wanqing');
  // Trigger a first pass now, and again once the page has fully settled.
  updateScroll(performance.now());
  window.addEventListener('load', () => {
    measureFinaleScale();
    scheduleUpdate();
    setupMomentObservers();
  }, { passive: true });
  setupMomentObservers();
  window.setTimeout(() => { measureFinaleScale(); scheduleUpdate(); }, 800);
  window.setInterval(() => trackRooms(performance.now()), 500);
  window.setTimeout(scheduleUpdate, 2000);

  // A tiny fallback: if the loader somehow cannot finish, don't trap the page.
  window.setTimeout(() => {
    if (!loaderFinished) {
      pageLoaded = true;
      finishLoader();
    }
  }, 4200);
})();




