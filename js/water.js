const state = {
  mode: 'solo',
  bo: -1,
  round: 0,
  maxRounds: 999,
  targetPct: 0,
  p1Pct: 0,
  p2Pct: 0,
  p1Score: 0,
  p2Score: 0,
  p1History: [],
  roundActive: false,
  fillSpeed: 20,
};

const $       = id => document.getElementById(id);
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pctDiff = (a, b) => Math.abs(a - b);

function getGrade(d) {
  if (d <= 1)  return { label: 'S+', colorClass: 'text-skyblue' };
  if (d <= 3)  return { label: 'S',  colorClass: 'text-orange'  };
  if (d <= 5)  return { label: 'A',  colorClass: 'text-purple'  };
  if (d <= 10) return { label: 'B',  colorClass: 'text-blue'    };
  if (d <= 20) return { label: 'C',  colorClass: 'text-red'     };
  return                { label: 'D',  colorClass: 'text-gray'    };
}

function showModal(t, h) {
  $('modalTitle').textContent = t;
  $('modalBody').innerHTML   = h;
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
  setFlowTip('点击「开始」生成目标水位');
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
  setFlowTip('双人Battle已就绪！点击「开始」生成目标水位');
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
  $('targetDisplay').classList.add('hidden');
  $('cupsArea').classList.add('hidden');
  $('roundInfo').classList.add('hidden');
  $('scoreBoard').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('progressText').textContent = '';
  state.p1Score = 0;
  state.p1History = [];
  state.round = 0;
  buildCups(1);
}

function initBattleUI() {
  $('targetLabel').classList.add('hidden');
  $('targetDisplay').classList.add('hidden');
  $('cupsArea').classList.add('hidden');
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
  buildCups(2);
}

function buildCups(count) {
  const area = $('cupsArea');
  area.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const p = i + 1;
    const wrap = document.createElement('div');
    wrap.className = 'cup-wrapper';
    wrap.innerHTML = `
      <div class="cup-name ${p === 1 ? 'p1' : 'p2'}">${count === 1 ? '🥤 你的水杯' : `玩家 ${p}`}</div>
      <div class="canvas-container"><canvas id="canvas_p${p}" width="160" height="260"></canvas></div>
      <div class="hold-hint">长按注水 ↑</div>`;
    area.appendChild(wrap);
  }
  if (count >= 1) {
    state.p1Pct = 0;
    drawCup('canvas_p1', () => state.p1Pct);
    bindCup('canvas_p1', () => state.p1Pct, v => { state.p1Pct = v; });
  }
  if (count >= 2) {
    state.p2Pct = 0;
    drawCup('canvas_p2', () => state.p2Pct);
    bindCup('canvas_p2', () => state.p2Pct, v => { state.p2Pct = v; });
  }
}

function drawCup(canvasId, getPct) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const padX = 30;
  const cupW = W - padX * 2;
  const cupTop = 30;
  const cupBot = H - 20;
  const cupH = cupBot - cupTop;
  const leftX = padX;
  const rightX = W - padX;

  function draw() {
    const raw = getPct();
    const pct = clamp(raw, 0, 100);
    const overflow = raw > 100;

    ctx.clearRect(0, 0, W, H);

    if (pct > 0) {
      const fillH = (pct / 100) * cupH;
      const waterTop = cupBot - fillH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(leftX, waterTop, cupW, fillH);
      ctx.clip();

      const g = ctx.createLinearGradient(0, waterTop, 0, cupBot);
      g.addColorStop(0, 'rgba(0,255,200,0.5)');
      g.addColorStop(0.4, 'rgba(0,180,255,0.6)');
      g.addColorStop(1, 'rgba(0,100,200,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(leftX - 2, waterTop, cupW + 4, fillH + 2);

      ctx.beginPath();
      ctx.moveTo(leftX, waterTop);
      ctx.lineTo(rightX, waterTop);
      ctx.strokeStyle = 'rgba(150,230,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const bc = Math.floor(pct / 8);
      for (let i = 0; i < bc; i++) {
        const bx = leftX + cupW * Math.random();
        const by = waterTop + 4 + Math.random() * fillH * 0.85;
        ctx.beginPath();
        ctx.arc(bx, by, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,240,255,${0.15 + Math.random() * 0.2})`;
        ctx.fill();
      }
      ctx.restore();
    }

    if (overflow) {
      const extra = clamp(raw - 100, 0, 12);
      const spillY = cupTop - extra * 1.8;
      ctx.beginPath();
      ctx.ellipse(W / 2, spillY, cupW * 0.4 * (extra / 12), 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,200,255,${0.2 + extra * 0.04})`;
      ctx.fill();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(leftX, cupTop);
    ctx.lineTo(leftX, cupBot);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX, cupTop);
    ctx.lineTo(rightX, cupBot);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftX, cupBot);
    ctx.lineTo(rightX, cupBot);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftX, cupTop);
    ctx.lineTo(rightX, cupTop);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  draw();
  canvas._redraw = draw;
}

function bindCup(canvasId, getPct, setPct) {
  const canvas = document.getElementById(canvasId);
  let holding = false, rafId = null, lastTick = 0;

  function startFill() {
    if (!state.roundActive) return;
    holding = true;
    lastTick = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(fillLoop);
  }

  function fillLoop(now) {
    if (!holding) return;
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    let cur = getPct() + state.fillSpeed * dt;
    cur = Math.min(cur, 115);
    setPct(cur);
    canvas._redraw();
    if (holding && cur < 115) rafId = requestAnimationFrame(fillLoop);
    else holding = false;
  }

  function stopFill() {
    holding = false;
    cancelAnimationFrame(rafId);
  }

  canvas.addEventListener('mousedown', startFill);
  canvas.addEventListener('mouseup', stopFill);
  canvas.addEventListener('mouseleave', stopFill);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); startFill(); }, { passive: false });
  canvas.addEventListener('touchend', stopFill);
  canvas.addEventListener('touchcancel', stopFill);
}

function redrawAll() {
  document.querySelectorAll('canvas').forEach(c => { if (c._redraw) c._redraw(); });
}

function startRound() {
  state.round++;
  state.targetPct = randInt(0, 100);
  state.p1Pct = 0;
  state.p2Pct = 0;
  state.roundActive = true;

  $('targetLabel').classList.remove('hidden');
  $('targetDisplay').classList.remove('hidden');
  $('cupsArea').classList.remove('hidden');
  $('targetDisplay').textContent = state.targetPct + '%';
  $('btnStart').classList.add('hidden');
  $('btnConfirm').classList.remove('hidden');
  $('btnNext').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';

  if (state.mode === 'solo') {
    setFlowTip('💧 目标已生成！长按水杯注水，松手锁定，尽量接近目标！');
    $('progressText').textContent = `第 ${state.round} 回合`;
  } else {
    setFlowTip('💧 目标已生成！两名玩家分别长按各自杯子注水，准备好后点击确定。');
    $('roundInfo').classList.remove('hidden');
    $('scoreBoard').classList.remove('hidden');
    $('roundInfo').textContent = state.bo > 0
      ? `第 ${state.round}/${state.bo} 回合`
      : `第 ${state.round} 回合（无限模式）`;
    $('progressText').textContent = '';
  }
  redrawAll();
}

function confirmWater() {
  if (!state.roundActive) return;
  state.roundActive = false;
  const p1 = clamp(Math.round(state.p1Pct), 0, 100);
  const d1 = pctDiff(p1, state.targetPct);
  if (state.mode === 'solo') handleSoloResult(p1, d1);
  else {
    const p2 = clamp(Math.round(state.p2Pct), 0, 100);
    const d2 = pctDiff(p2, state.targetPct);
    handleBattleResult(p1, p2, d1, d2);
  }
}

function nextRound() {
  if (state.mode === 'battle' && state.round >= state.maxRounds) { showBattleFinal(); return; }
  startRound();
}

function handleSoloResult(pct, diff) {
  state.p1History.push(diff);
  const g = getGrade(diff);
  $('feedbackText').innerHTML = `
    你的水位：<span class="text-green">${pct}%</span> ·
    误差：<span class="${g.colorClass}">${diff.toFixed(1)}%</span> ·
    <span class="${g.colorClass}">${g.label}</span>`;
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('btnConfirm').classList.add('hidden');
  $('btnNext').classList.remove('hidden');
  setFlowTip('点击「下一回合」继续挑战，或返回菜单结束游戏');
}

function handleBattleResult(v1, v2, d1, d2) {
  let w = 0;
  if (d1 < d2) { w = 1; state.p1Score++; }
  else if (d2 < d1) { w = 2; state.p2Score++; }

  $('p1Score').textContent = state.p1Score;
  $('p2Score').textContent = state.p2Score;

  const c1 = d1 <= 3 ? 'text-green' : d1 <= 10 ? 'text-yellow' : 'text-red';
  const c2 = d2 <= 3 ? 'text-green' : d2 <= 10 ? 'text-yellow' : 'text-red';

  let html = `
    <div style="margin-bottom:8px;">
      <span class="p1-color" style="font-weight:700;">玩家1</span>：${v1}%（误差 <span class="${c1}">${d1.toFixed(1)}%</span>）
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <span class="p2-color" style="font-weight:700;">玩家2</span>：${v2}%（误差 <span class="${c2}">${d2.toFixed(1)}%</span>）
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
    body  = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span>&nbsp;:&nbsp;<span class="highlight p2-color">${b} 玩家2</span></div><div>玩家1 获得了胜利！</div>`;
  } else if (b > a) {
    title = '🎉 玩家2 赢了！';
    body  = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span>&nbsp;:&nbsp;<span class="highlight p2-color">${b} 玩家2</span></div><div>玩家2 获得了胜利！</div>`;
  } else {
    title = '🤝 平局';
    body  = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span>&nbsp;:&nbsp;<span class="highlight p2-color">${b} 玩家2</span></div><div>实力相当！势均力敌！</div>`;
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
