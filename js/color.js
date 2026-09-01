const state = {
  mode: 'solo',
  bo: -1,
  round: 0,
  maxRounds: 999,
  targetR: 0, targetG: 0, targetB: 0,
  p1H: 0, p1S: 50, p1V: 80,
  p2H: 0, p2S: 50, p2V: 80,
  p1Score: 0, p2Score: 0,
  p1History: [],
  roundActive: false,
};

const $       = id => document.getElementById(id);
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  v = clamp(v, 0, 100) / 100;
  const c  = v * s;
  const hh = h / 60;
  const x  = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if      (hh < 1) { r = c; g = x; }
  else if (hh < 2) { r = x; g = c; }
  else if (hh < 3) { g = c; b = x; }
  else if (hh < 4) { g = x; b = c; }
  else if (hh < 5) { r = x; b = c; }
  else             { r = c; b = x; }
  const m = v - c;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('').toUpperCase();
}

function rgbToLab(r, g, b) {
  let rn = r / 255, gn = g / 255, bn = b / 255;
  const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  rn = toLin(rn); gn = toLin(gn); bn = toLin(bn);
  let X = rn * 0.4124 + gn * 0.3576 + bn * 0.1805;
  let Y = rn * 0.2126 + gn * 0.7152 + bn * 0.0722;
  let Z = rn * 0.0193 + gn * 0.1192 + bn * 0.9505;
  X /= 0.95047; Y /= 1; Z /= 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

function deltaE(r1, g1, b1, r2, g2, b2) {
  const [l1, a1, b1v] = rgbToLab(r1, g1, b1);
  const [l2, a2, b2v] = rgbToLab(r2, g2, b2);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1v - b2v) ** 2);
}

function getGrade(de) {
  if (de <= 3)  return { label: 'S+', colorClass: 'text-skyblue' };
  if (de <= 7.5)  return { label: 'S',  colorClass: 'text-orange'  };
  if (de <= 12.5)  return { label: 'A',  colorClass: 'text-purple'  };
  if (de <= 17.5) return { label: 'B',  colorClass: 'text-blue'    };
  if (de <= 20) return { label: 'C',  colorClass: 'text-red'     };
  return              { label: 'D',  colorClass: 'text-gray'    };
}

function showModal(t, h) {
  $('modalTitle').textContent = t;
  $('modalBody').innerHTML    = h;
  $('modalOverlay').classList.remove('hidden');
}
function closeModal() {
  $('modalOverlay').classList.add('hidden');
}

function showGame() {
  $('modeSelect').classList.add('hidden');
  $('boSelect').classList.add('hidden');
  $('gameContainer').classList.remove('hidden');
  $('ruleTip').classList.add('hidden');
}
function backToModeSelect() {
  $('modeSelect').classList.remove('hidden');
  $('boSelect').classList.add('hidden');
  $('gameContainer').classList.add('hidden');
  $('ruleTip').classList.remove('hidden');
  resetGame();
}
function showBoSelect() {
  $('modeSelect').classList.add('hidden');
  $('boSelect').classList.remove('hidden');
}

function startSolo() {
  state.mode = 'solo';
  state.bo = 1;
  state.maxRounds = 999;
  showGame();
  initSoloUI();
  setFlowTip('点击「开始」生成目标颜色');
  $('btnStart').classList.remove('hidden');
  $('btnConfirm').classList.add('hidden');
  $('btnNext').classList.add('hidden');
}

function startBattle(bo) {
  state.mode = 'battle';
  state.bo = bo;
  state.maxRounds = bo > 0 ? bo : 999;
  showGame();
  initBattleUI();
  setFlowTip('双人 Battle 已就绪！点击「开始」生成目标颜色');
  $('btnStart').classList.remove('hidden');
  $('btnConfirm').classList.add('hidden');
  $('btnNext').classList.add('hidden');
}

document.querySelectorAll('.bo-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.bo-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    setTimeout(() => startBattle(parseInt(this.dataset.bo)), 200);
  });
});

function initSoloUI() {
  $('targetLabel').classList.add('hidden');
  $('targetSwatch').classList.add('hidden');
  $('playersArea').classList.add('hidden');
  $('compareArea').classList.add('hidden');
  $('roundInfo').classList.add('hidden');
  $('scoreBoard').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('progressText').textContent = '';
  state.p1Score = 0;
  state.p1History = [];
  state.round = 0;
  buildPlayers(1);
}

function initBattleUI() {
  $('targetLabel').classList.add('hidden');
  $('targetSwatch').classList.add('hidden');
  $('playersArea').classList.add('hidden');
  $('compareArea').classList.add('hidden');
  $('roundInfo').classList.add('hidden');
  $('scoreBoard').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('progressText').textContent = '';
  state.p1Score = 0;
  state.p2Score = 0;
  state.round = 0;
  $('p1Score').textContent = '0';
  $('p2Score').textContent = '0';
  buildPlayers(2);
}

function buildPlayers(count) {
  const area = $('playersArea');
  area.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const p    = i + 1;
    const cls  = p === 1 ? 'p1' : 'p2';
    const wrap = document.createElement('div');
    wrap.className = 'player-panel';
    wrap.innerHTML = `
      <div class="player-name ${cls}">${count === 1 ? '🌈 你的调色盘' : `玩家 ${p}`}</div>
      <div class="color-preview" id="preview_p${p}"></div>
      <div class="picker-wrap">
        <div class="hue-bar" id="hueBar_p${p}">
          <div class="hue-thumb" id="hueThumb_p${p}"></div>
        </div>
        <div class="sv-canvas" id="svCanvas_p${p}">
          <div class="sv-overlay-white"></div>
          <div class="sv-overlay-black"></div>
          <div class="sv-thumb" id="svThumb_p${p}"></div>
        </div>
        <div class="hue-label" id="hueLabel_p${p}">H:0° S:50% V:80%</div>
      </div>`;
    area.appendChild(wrap);
  }
  if (count >= 1) { bindPicker(1); updatePreview(1); }
  if (count >= 2) { bindPicker(2); updatePreview(2); }
}

function getH(p) { return p === 1 ? state.p1H : state.p2H; }
function getS(p) { return p === 1 ? state.p1S : state.p2S; }
function getV(p) { return p === 1 ? state.p1V : state.p2V; }
function setHSV(p, h, s, v) {
  if (p === 1) { state.p1H = h; state.p1S = s; state.p1V = v; }
  else         { state.p2H = h; state.p2S = s; state.p2V = v; }
}

function updatePreview(p) {
  const h = getH(p), s = getS(p), v = getV(p);
  const [r, g, b] = hsvToRgb(h, s, v);
  $(`preview_p${p}`).style.backgroundColor = rgbToHex(r, g, b);
  $(`hueLabel_p${p}`).textContent = `H:${Math.round(h)}° S:${Math.round(s)}% V:${Math.round(v)}%`;
  const bar  = $(`hueBar_p${p}`);
  const brect = bar.getBoundingClientRect();
  $(`hueThumb_p${p}`).style.left = (h / 360 * brect.width) + 'px';
  const sv   = $(`svCanvas_p${p}`);
  const srect = sv.getBoundingClientRect();
  $(`svThumb_p${p}`).style.left = (s / 100 * srect.width) + 'px';
  $(`svThumb_p${p}`).style.top  = ((100 - v) / 100 * srect.height) + 'px';
  sv.style.backgroundColor = rgbToHex(...hsvToRgb(h, 100, 100));
}

function bindPicker(p) {
  const hueBar   = $(`hueBar_p${p}`);
  const svCanvas = $(`svCanvas_p${p}`);
  let drag = null;

  function hueFromPt(clientX) {
    if (!state.roundActive) return;
    const rect = hueBar.getBoundingClientRect();
    const pct  = clamp((clientX - rect.left) / rect.width, 0, 1);
    setHSV(p, pct * 360, getS(p), getV(p));
    updatePreview(p);
  }
  function svFromPt(clientX, clientY) {
    if (!state.roundActive) return;
    const rect = svCanvas.getBoundingClientRect();
    const s = clamp((clientX - rect.left) / rect.width,  0, 1) * 100;
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1) * 100;
    setHSV(p, getH(p), s, v);
    updatePreview(p);
  }
  const px = e => e.touches ? e.touches[0].clientX : e.clientX;
  const py = e => e.touches ? e.touches[0].clientY : e.clientY;

  hueBar.addEventListener('mousedown',    e => { drag = 'hue'; hueFromPt(px(e)); });
  hueBar.addEventListener('touchstart',   e => { drag = 'hue'; hueFromPt(px(e)); e.preventDefault(); }, { passive: false });
  svCanvas.addEventListener('mousedown',  e => { drag = 'sv';  svFromPt(px(e), py(e)); });
  svCanvas.addEventListener('touchstart',  e => { drag = 'sv';  svFromPt(px(e), py(e)); e.preventDefault(); }, { passive: false });

  document.addEventListener('mousemove', e => {
    if (drag === 'hue')      hueFromPt(px(e));
    else if (drag === 'sv')  svFromPt(px(e), py(e));
  });
  document.addEventListener('touchmove', e => {
    if (!drag) return;
    if (drag === 'hue') hueFromPt(px(e));
    else                svFromPt(px(e), py(e));
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('mouseup',   () => { drag = null; });
  document.addEventListener('touchend',  () => { drag = null; });
}

function startRound() {
  state.round++;
  state.targetR = randInt(0, 255);
  state.targetG = randInt(0, 255);
  state.targetB = randInt(0, 255);
  state.p1H = 0; state.p1S = 50; state.p1V = 80;
  state.p2H = 0; state.p2S = 50; state.p2V = 80;
  state.roundActive = true;

  const hex = rgbToHex(state.targetR, state.targetG, state.targetB);
  $('targetLabel').classList.remove('hidden');
  $('targetSwatch').classList.remove('hidden');
  $('playersArea').classList.remove('hidden');
  $('compareArea').classList.add('hidden');
  $('targetSwatch').style.backgroundColor = hex;

  updatePreview(1);
  if (state.mode === 'battle') updatePreview(2);

  $('btnStart').classList.add('hidden');
  $('btnConfirm').classList.remove('hidden');
  $('btnNext').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';

  if (state.mode === 'solo') {
    setFlowTip('🌈 目标颜色已生成！用色相条+色板调配，尽量接近后点击「确定」');
    $('progressText').textContent = `第 ${state.round} 回合`;
  } else {
    setFlowTip('🌈 目标颜色已生成！两名玩家分别调配，准备好后点击「确定」');
    $('roundInfo').classList.remove('hidden');
    $('scoreBoard').classList.remove('hidden');
    $('roundInfo').textContent = state.bo > 0
      ? `第 ${state.round}/${state.bo} 回合`
      : `第 ${state.round} 回合（无限模式）`;
    $('progressText').textContent = '';
  }
}

function confirmColor() {
  if (!state.roundActive) return;
  state.roundActive = false;
  const [r1, g1, b1] = hsvToRgb(state.p1H, state.p1S, state.p1V);
  const d1 = deltaE(r1, g1, b1, state.targetR, state.targetG, state.targetB);
  if (state.mode === 'solo') {
    handleSoloResult(d1, r1, g1, b1);
  } else {
    const [r2, g2, b2] = hsvToRgb(state.p2H, state.p2S, state.p2V);
    const d2 = deltaE(r2, g2, b2, state.targetR, state.targetG, state.targetB);
    handleBattleResult(d1, r1, g1, b1, d2, r2, g2, b2);
  }
}

function nextRound() {
  if (state.mode === 'battle' && state.round >= state.maxRounds) { showBattleFinal(); return; }
  startRound();
}

function handleSoloResult(de, r, g, b) {
  state.p1History.push(de);
  const grade = getGrade(de);
  const tHex  = rgbToHex(state.targetR, state.targetG, state.targetB);
  const mHex  = rgbToHex(r, g, b);

  $('compareArea').classList.remove('hidden');
  $('compareArea').innerHTML = `
    <div class="compare-item"><div class="compare-label">目标</div><div class="compare-swatch" id="cmpT"></div></div>
    <div class="compare-item"><div class="compare-label">你的</div><div class="compare-swatch" id="cmpM"></div></div>`;
  document.getElementById('cmpT').style.backgroundColor = tHex;
  document.getElementById('cmpM').style.backgroundColor = mHex;

  $('feedbackText').innerHTML =
    `ΔE：<span class="${grade.colorClass}">${de.toFixed(1)}</span> · ` +
    `<span class="${grade.colorClass}">${grade.label}</span>`;

  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('btnConfirm').classList.add('hidden');
  $('btnNext').classList.remove('hidden');
  setFlowTip('点击「下一回合」继续挑战，或返回菜单结束游戏');
}

function handleBattleResult(d1, r1, g1, b1, d2, r2, g2, b2) {
  let w = 0;
  if (d1 < d2) { w = 1; state.p1Score++; }
  else if (d2 < d1) { w = 2; state.p2Score++; }

  $('p1Score').textContent = state.p1Score;
  $('p2Score').textContent = state.p2Score;

  const c1 = d1 <= 2 ? 'text-green' : d1 <= 8 ? 'text-yellow' : 'text-red';
  const c2 = d2 <= 2 ? 'text-green' : d2 <= 8 ? 'text-yellow' : 'text-red';

  let html = `
    <div style="margin-bottom:8px;">
      <span class="p1-color" style="font-weight:700;">玩家1</span>：ΔE <span class="${c1}">${d1.toFixed(1)}</span>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <span class="p2-color" style="font-weight:700;">玩家2</span>：ΔE <span class="${c2}">${d2.toFixed(1)}</span>
    </div>`;
  if (w === 1) html += `<div class="text-green"  style="font-size:18px;font-weight:700;">👍 玩家1 此回合获胜！</div>`;
  else if (w === 2) html += `<div class="text-green"  style="font-size:18px;font-weight:700;">👍 玩家2 此回合获胜！</div>`;
  else html += `<div class="text-yellow" style="font-size:18px;font-weight:700;">🤝 此回合平局！</div>`;

  $('feedbackText').innerHTML = '';
  $('resultContainer').classList.remove('hidden');
  $('resultContainer').innerHTML = `
    <div class="stats-group">
      <div class="stats-group-title">⚔️ 本回合结果</div>
      <div style="text-align:center;line-height:2;">${html}</div>
      <div class="stats" style="margin-top:10px;">
        <div class="stat-item"><div class="stat-label">玩家1 胜场</div><div class="stat-value" style="color:var(--color-accent)">${state.p1Score}</div></div>
        <div class="stat-item"><div class="stat-label">玩家2 胜场</div><div class="stat-value" style="color:var(--color-success)">${state.p2Score}</div></div>
      </div>
    </div>`;

  $('btnConfirm').classList.add('hidden');
  if (state.round >= state.maxRounds) {
    $('btnNext').classList.add('hidden');
    setTimeout(showBattleFinal, 800);
  } else {
    $('btnNext').classList.remove('hidden');
  }
  setFlowTip('点击「下一回合」继续比赛！');
}

function showBattleFinal() {
  const a = state.p1Score, b = state.p2Score;
  let title, body;
  if (a > b) {
    title = '🎉 玩家1 赢了！';
    body  = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span> : <span class="highlight p2-color">${b} 玩家2</span></div><div>玩家1 获得了胜利！</div>`;
  } else if (b > a) {
    title = '🎉 玩家2 赢了！';
    body  = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span> : <span class="highlight p2-color">${b} 玩家2</span></div><div>玩家2 获得了胜利！</div>`;
  } else {
    title = '🤝 平局';
    body  = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span> : <span class="highlight p2-color">${b} 玩家2</span></div><div>实力相当！势均力敌！</div>`;
  }
  showModal(title, body + `<div style="margin-top:16px;"><button class="btn btn-primary" onclick="backToModeSelect();closeModal();">返回</button></div>`);
  $('btnNext').classList.add('hidden');
  $('btnStart').classList.remove('hidden');
}

function setFlowTip(t) { $('flowTip').textContent = t; }

function resetGame() {
  state.round = 0;
  state.p1Score = 0;
  state.p2Score = 0;
  state.p1History = [];
  state.roundActive = false;
  $('p1Score').textContent = '0';
  $('p2Score').textContent = '0';
}
