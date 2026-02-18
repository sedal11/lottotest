(function () {
  'use strict';

  // ===== Storage Keys =====
  const STORAGE = {
    SAVED: 'lotto_saved',
    HISTORY: 'lotto_history',
    STATS: 'lotto_stats',
    THEME: 'lotto_theme',
  };

  // ===== Utility Functions =====
  function getBallClass(num) {
    if (num <= 10) return 'ball-1-10';
    if (num <= 20) return 'ball-11-20';
    if (num <= 30) return 'ball-21-30';
    if (num <= 40) return 'ball-31-40';
    return 'ball-41-45';
  }

  function createBallEl(num, options = {}) {
    const el = document.createElement('span');
    el.className = `ball ${getBallClass(num)}`;
    if (options.animate) {
      el.classList.add('ball-animate');
      el.style.animationDelay = `${(options.index || 0) * 0.08}s`;
    }
    if (options.matched === true) el.classList.add('matched');
    if (options.matched === false) el.classList.add('not-matched');
    el.textContent = num;
    return el;
  }

  function generateNumbers() {
    const numbers = [];
    while (numbers.length < 6) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(n)) numbers.push(n);
    }
    return numbers.sort((a, b) => a - b);
  }

  function loadStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  function saveStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function getRank(myNumbers, winNumbers, bonus) {
    const matchCount = myNumbers.filter(n => winNumbers.includes(n)).length;
    const hasBonus = myNumbers.includes(bonus);
    if (matchCount === 6) return { rank: 1, label: '1등 🏆', matchCount };
    if (matchCount === 5 && hasBonus) return { rank: 2, label: '2등 🥈', matchCount, bonus: true };
    if (matchCount === 5) return { rank: 3, label: '3등 🥉', matchCount };
    if (matchCount === 4) return { rank: 4, label: '4등', matchCount };
    if (matchCount === 3) return { rank: 5, label: '5등', matchCount };
    return { rank: 0, label: '낙첨', matchCount };
  }

  function updateStats(numbersArray) {
    const stats = loadStorage(STORAGE.STATS);
    const counts = {};
    for (let i = 1; i <= 45; i++) counts[i] = 0;
    stats.forEach(s => { counts[s.num] = s.count; });
    numbersArray.forEach(nums => {
      nums.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    });
    const updated = Object.entries(counts).map(([num, count]) => ({ num: +num, count }));
    saveStorage(STORAGE.STATS, updated);
  }

  function addToHistory(numbersArray) {
    const history = loadStorage(STORAGE.HISTORY);
    const now = new Date().toISOString();
    numbersArray.forEach(nums => {
      history.unshift({ numbers: nums, date: now });
    });
    if (history.length > 100) history.length = 100;
    saveStorage(STORAGE.HISTORY, history);
  }

  // ===== DOM Elements =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ===== Theme =====
  function initTheme() {
    const saved = localStorage.getItem(STORAGE.THEME);
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : preferDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    $('#themeToggle').textContent = dark ? '☀️' : '🌙';
  }

  $('#themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE.THEME, next);
    $('#themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  });

  // ===== Tabs =====
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`#tab-${tab.dataset.tab}`).classList.add('active');

      if (tab.dataset.tab === 'saved') renderSaved();
      if (tab.dataset.tab === 'stats') renderStats();
    });
  });

  // ===== Generate Tab =====
  let currentGenerated = [];

  $('#generateBtn').addEventListener('click', () => {
    const count = parseInt($('#gameCount').value);
    currentGenerated = [];
    const container = $('#generatedResults');
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const nums = generateNumbers();
      currentGenerated.push(nums);

      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `<span class="game-label">${String.fromCharCode(65 + i)}</span><div class="balls"></div><button class="save-single" title="저장">💾</button>`;

      const ballsDiv = row.querySelector('.balls');
      nums.forEach((n, idx) => {
        ballsDiv.appendChild(createBallEl(n, { animate: true, index: i * 6 + idx }));
      });

      row.querySelector('.save-single').addEventListener('click', () => {
        saveNumbers(nums);
        showToast('번호가 저장되었습니다!');
      });

      container.appendChild(row);
    }

    $('#saveAllBtn').style.display = 'block';
    const shareBtns = $('#shareButtons');
    if (shareBtns) shareBtns.style.display = 'flex';
    updateStats(currentGenerated);
    addToHistory(currentGenerated);
  });

  $('#saveAllBtn').addEventListener('click', () => {
    currentGenerated.forEach(nums => saveNumbers(nums));
    showToast(`${currentGenerated.length}게임이 저장되었습니다!`);
  });

  // ===== Manual Tab =====
  const manualSelected = [];

  function initNumberGrid() {
    const grid = $('#numberGrid');
    for (let i = 1; i <= 45; i++) {
      const btn = document.createElement('button');
      btn.className = `grid-num ${getBallClass(i)}`;
      btn.textContent = i;
      btn.addEventListener('click', () => toggleManualNumber(i, btn));
      grid.appendChild(btn);
    }
  }

  function toggleManualNumber(num, btn) {
    const idx = manualSelected.indexOf(num);
    if (idx >= 0) {
      manualSelected.splice(idx, 1);
      btn.classList.remove('selected');
    } else if (manualSelected.length < 6) {
      manualSelected.push(num);
      btn.classList.add('selected');
    }
    renderManualSelected();
  }

  function renderManualSelected() {
    const container = $('#manualSelected');
    container.innerHTML = '';
    const sorted = [...manualSelected].sort((a, b) => a - b);
    sorted.forEach(n => container.appendChild(createBallEl(n)));

    for (let i = sorted.length; i < 6; i++) {
      const placeholder = document.createElement('span');
      placeholder.className = 'ball';
      placeholder.style.cssText = 'background: var(--border); color: var(--text-secondary); box-shadow: none;';
      placeholder.textContent = '?';
      container.appendChild(placeholder);
    }

    $('#selectedCount').textContent = manualSelected.length;
    $('#manualSaveBtn').disabled = manualSelected.length !== 6;
  }

  $('#manualResetBtn').addEventListener('click', () => {
    manualSelected.length = 0;
    $$('.grid-num').forEach(btn => btn.classList.remove('selected'));
    renderManualSelected();
  });

  $('#manualSaveBtn').addEventListener('click', () => {
    if (manualSelected.length !== 6) return;
    const nums = [...manualSelected].sort((a, b) => a - b);
    saveNumbers(nums);
    updateStats([nums]);
    addToHistory([nums]);
    showToast('번호가 저장되었습니다!');
    manualSelected.length = 0;
    $$('.grid-num').forEach(btn => btn.classList.remove('selected'));
    renderManualSelected();
  });

  // ===== Saved Tab =====
  function saveNumbers(numbers) {
    const saved = loadStorage(STORAGE.SAVED);
    saved.unshift({ numbers, date: new Date().toISOString() });
    saveStorage(STORAGE.SAVED, saved);
  }

  function renderSaved() {
    const saved = loadStorage(STORAGE.SAVED);
    const container = $('#savedList');
    container.innerHTML = '';
    $('#savedCount').textContent = saved.length;

    if (saved.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>저장된 번호가 없습니다<br>번호를 생성하고 저장해보세요!</p></div>';
      $('#clearAllBtn').style.display = 'none';
      return;
    }

    saved.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'saved-item';
      const ballsDiv = document.createElement('div');
      ballsDiv.className = 'balls';
      item.numbers.forEach(n => ballsDiv.appendChild(createBallEl(n)));

      const dateSpan = document.createElement('span');
      dateSpan.className = 'saved-date';
      dateSpan.textContent = formatDate(item.date);

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        saved.splice(i, 1);
        saveStorage(STORAGE.SAVED, saved);
        renderSaved();
        showToast('삭제되었습니다');
      });

      row.appendChild(ballsDiv);
      row.appendChild(dateSpan);
      row.appendChild(delBtn);
      container.appendChild(row);
    });

    $('#clearAllBtn').style.display = 'block';
  }

  $('#clearAllBtn').addEventListener('click', () => {
    if (!confirm('저장된 번호를 모두 삭제하시겠습니까?')) return;
    saveStorage(STORAGE.SAVED, []);
    renderSaved();
    showToast('모두 삭제되었습니다');
  });

  // ===== Check Tab =====
  $('#checkBtn').addEventListener('click', () => {
    const inputs = $$('.winning-num:not(.bonus)');
    const winNumbers = [];
    let valid = true;

    inputs.forEach(input => {
      const v = parseInt(input.value);
      if (isNaN(v) || v < 1 || v > 45) valid = false;
      else winNumbers.push(v);
    });

    const bonus = parseInt($('#bonusNum').value);
    if (isNaN(bonus) || bonus < 1 || bonus > 45) valid = false;

    if (!valid || winNumbers.length !== 6) {
      showToast('당첨 번호를 모두 정확히 입력해주세요');
      return;
    }

    if (new Set(winNumbers).size !== 6) {
      showToast('중복된 번호가 있습니다');
      return;
    }

    if (winNumbers.includes(bonus)) {
      showToast('보너스 번호가 당첨 번호와 중복됩니다');
      return;
    }

    const saved = loadStorage(STORAGE.SAVED);
    const container = $('#checkResults');
    container.innerHTML = '';

    if (saved.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>저장된 번호가 없습니다<br>먼저 번호를 저장해주세요!</p></div>';
      return;
    }

    saved.forEach((item, i) => {
      const result = getRank(item.numbers, winNumbers, bonus);
      const div = document.createElement('div');
      div.className = 'check-result-item';

      const ballsDiv = document.createElement('div');
      ballsDiv.className = 'balls';
      item.numbers.forEach(n => {
        const isMatch = winNumbers.includes(n);
        ballsDiv.appendChild(createBallEl(n, { matched: isMatch }));
      });

      const rankClass = result.rank > 0 ? `rank-${result.rank}` : 'rank-none';
      const info = document.createElement('div');
      info.innerHTML = `<span class="rank-badge ${rankClass}">${result.label}</span><span class="match-info">${result.matchCount}개 일치${result.bonus ? ' + 보너스' : ''}</span>`;

      div.appendChild(ballsDiv);
      div.appendChild(info);
      container.appendChild(div);
    });
  });

  // ===== Stats Tab =====
  function renderStats() {
    const stats = loadStorage(STORAGE.STATS);
    const chart = $('#statsChart');
    chart.innerHTML = '';

    const counts = {};
    for (let i = 1; i <= 45; i++) counts[i] = 0;
    stats.forEach(s => { counts[s.num] = s.count; });

    const maxCount = Math.max(1, ...Object.values(counts));

    for (let i = 1; i <= 45; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'stat-bar-wrapper';

      const barContainer = document.createElement('div');
      barContainer.className = 'stat-bar-container';

      const bar = document.createElement('div');
      bar.className = `stat-bar ${getBallClass(i)}`;
      const pct = (counts[i] / maxCount) * 100;
      bar.style.height = `${Math.max(3, pct)}%`;

      barContainer.appendChild(bar);

      const numLabel = document.createElement('span');
      numLabel.className = 'stat-num';
      numLabel.textContent = i;

      const countLabel = document.createElement('span');
      countLabel.className = 'stat-count';
      countLabel.textContent = counts[i] || '';

      wrapper.appendChild(countLabel);
      wrapper.appendChild(barContainer);
      wrapper.appendChild(numLabel);
      chart.appendChild(wrapper);
    }

    // Recent history
    const history = loadStorage(STORAGE.HISTORY);
    const historyContainer = $('#recentHistory');
    historyContainer.innerHTML = '';

    if (history.length === 0) {
      historyContainer.innerHTML = '<div class="empty-state"><p>생성 이력이 없습니다</p></div>';
      return;
    }

    history.slice(0, 10).forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const ballsDiv = document.createElement('div');
      ballsDiv.className = 'balls';
      item.numbers.forEach(n => ballsDiv.appendChild(createBallEl(n)));

      const dateSpan = document.createElement('span');
      dateSpan.className = 'history-date';
      dateSpan.textContent = formatDate(item.date);

      row.appendChild(ballsDiv);
      row.appendChild(dateSpan);
      historyContainer.appendChild(row);
    });
  }

  // ===== Contact Form =====
  const contactForm = $('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = '전송 중...';

      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { 'Accept': 'application/json' }
        });

        if (res.ok) {
          contactForm.style.display = 'none';
          $('#contactSuccess').style.display = 'block';
        } else {
          showToast('전송에 실패했습니다. 다시 시도해주세요.');
        }
      } catch {
        showToast('네트워크 오류가 발생했습니다.');
      }

      btn.disabled = false;
      btn.textContent = '📩 문의 보내기';
    });
  }

  const contactReset = $('#contactReset');
  if (contactReset) {
    contactReset.addEventListener('click', () => {
      contactForm.reset();
      contactForm.style.display = 'block';
      $('#contactSuccess').style.display = 'none';
    });
  }

  // ===== Latest Lottery Results =====
  async function fetchLatestResult() {
    const container = $('#latestResult');
    if (!container) return;
    try {
      // Use a CORS proxy to fetch from 동행복권 API
      const round = Math.floor((Date.now() - new Date('2002-12-07').getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      // Try recent rounds (current estimate might be off by 1-2)
      let data = null;
      for (let r = round; r >= round - 3; r--) {
        try {
          const res = await fetch(`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${r}`);
          const json = await res.json();
          if (json.returnValue === 'success') { data = json; break; }
        } catch { continue; }
      }
      if (!data) return;

      const nums = [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6].sort((a, b) => a - b);
      const bonus = data.bnusNo;

      container.querySelector('.latest-round').textContent = `제${data.drwNo}회`;
      container.querySelector('.latest-date').textContent = data.drwNoDate;

      const ballsDiv = container.querySelector('.latest-balls');
      ballsDiv.innerHTML = '';
      nums.forEach(n => ballsDiv.appendChild(createBallEl(n)));

      const bonusBall = container.querySelector('.latest-bonus-ball');
      bonusBall.innerHTML = '';
      bonusBall.appendChild(createBallEl(bonus));

      container.style.display = 'block';
    } catch { /* silently fail */ }
  }

  // ===== Social Sharing =====
  const shareTwitterBtn = $('#shareTwitter');
  if (shareTwitterBtn) {
    shareTwitterBtn.addEventListener('click', () => {
      if (currentGenerated.length === 0) return;
      const text = currentGenerated.map((nums, i) =>
        `${String.fromCharCode(65 + i)}: ${nums.join(', ')}`
      ).join('\n');
      const msg = `🎱 로또 6/45 번호 생성 결과\n${text}\n\nhttps://sedal11.github.io/lottotest/`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

  const shareCopyBtn = $('#shareCopy');
  if (shareCopyBtn) {
    shareCopyBtn.addEventListener('click', () => {
      if (currentGenerated.length === 0) return;
      const text = currentGenerated.map((nums, i) =>
        `${String.fromCharCode(65 + i)}: ${nums.join(', ')}`
      ).join('\n');
      const msg = `🎱 로또 6/45 번호 생성 결과\n${text}`;
      navigator.clipboard.writeText(msg).then(() => {
        showToast('번호가 클립보드에 복사되었습니다!');
      }).catch(() => {
        showToast('복사에 실패했습니다.');
      });
    });
  }

  // ===== Disqus Lazy Loading =====
  function loadDisqus() {
    if (window._disqusLoaded) return;
    window._disqusLoaded = true;
    const d = document, s = d.createElement('script');
    s.src = 'https://setak.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
  }

  const disqusSection = $('#disqus-section');
  if (disqusSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadDisqus();
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });
    observer.observe(disqusSection);
  }

  // ===== PWA Service Worker =====
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/lottotest/sw.js').catch(() => {});
  }

  // ===== Init =====
  initTheme();
  initNumberGrid();
  renderManualSelected();
  fetchLatestResult();
})();
