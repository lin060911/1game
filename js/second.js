const state = {
  mode: 'solo',
  bo: -1,
  round: 0,
  maxRounds: 999,
  targetSec: 0,
  p1Running: false, p1Start: 0, p1Elapsed: 0,
  p2Running: false, p2Start: 0, p2Elapsed: 0,
  p1Phase: 'idle',  p2Phase: 'idle',
  p1Started: false, p2Started: false,
  p1Score: 0, p2Score: 0,
  p1History: [],
  roundActive: false,
};

const $       = id => document.getElementById(id);
const randFloat = (a, b) => Math.random() * (b - a) + a;
const clamp     = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt       = s => s.toFixed(3) + 's';

const PLAYER_KEY = { 1: 'F', 2: 'J' };

function getGrade(err) {
  if (err <= 0.1) return { label: 'S+', colorClass: 'text-skyblue' };
  if (err <= 0.3) return { label: 'S',  colorClass: 'text-orange'  };
  if (err <= 0.5) return { label: 'A',  colorClass: 'text-purple'  };
  if (err <= 1.0) return { label: 'B',  colorClass: 'text-blue'    };
  if (err <= 2.0) return { label: 'C',  colorClass: 'text-red'     };
  return                  { label: 'D',  colorClass: 'text-gray'    };
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
  setFlowTip('点击「开始」准备游戏');
  $('btnStart').classList.remove('hidden');
  $('btnNext').classList.add('hidden');
  refreshDots();
}

function startBattle(bo) {
  state.mode = 'battle';
  state.bo = bo;
  state.maxRounds = bo > 0 ? bo : 999;
  showGame();
  initBattleUI();
  setFlowTip('双人 Battle 已就绪！点击「开始」准备');
  $('btnStart').classList.remove('hidden');
  $('btnNext').classList.add('hidden');
  refreshDots();
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
  $('playersArea').classList.add('hidden');
  $('roundInfo').classList.add('hidden');
  $('scoreBoard').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('progressText').textContent = '';
  state.p1Score = 0;
  state.p1History = [];
  state.round = 0;
  state.p1Phase = 'idle';
  state.p2Phase = 'idle';
  state.p1Started = false;
  state.p2Started = false;
  buildPlayers(1);
}

function initBattleUI() {
  $('targetLabel').classList.add('hidden');
  $('targetDisplay').classList.add('hidden');
  $('playersArea').classList.add('hidden');
  $('roundInfo').classList.add('hidden');
  $('scoreBoard').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('progressText').textContent = '';
  state.p1Score = 0;
  state.p2Score = 0;
  state.round = 0;
  state.p1Phase = 'idle';
  state.p2Phase = 'idle';
  state.p1Started = false;
  state.p2Started = false;
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
    const key  = PLAYER_KEY[p];
    const wrap = document.createElement('div');
    wrap.className = 'player-panel';
    wrap.dataset.player = p;
    wrap.innerHTML = `
      <div class="player-name ${cls}">玩家 ${p}</div>
      <div class="status-dot idle" id="dot_p${p}" data-player="${p}" role="button" aria-label="玩家${p} 计时操作区">
        <span class="dot-label"></span>
      </div>
      <div class="key-hint">${count === 1
        ? '按 <kbd>空格</kbd> 或点击圆点'
        : `按 <kbd>${key}</kbd> 或点击圆点`}</div>`;
    area.appendChild(wrap);
    bindTapArea(wrap, p);
  }
  [1, 2].forEach(renderDot);
}

function bindTapArea(panel, p) {
  panel.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') e.preventDefault();
    if (e.button != null && e.button !== 0) return;
    onPlayerAction(p, 'tap');
  });
  if (!window.PointerEvent) {
    panel.addEventListener('touchstart', e => {
      e.preventDefault();
      onPlayerAction(p, 'tap');
    }, { passive: false });
    panel.addEventListener('mousedown', e => {
      if (e.button === 0) onPlayerAction(p, 'tap');
    });
  }
}

function isStartable() {
  const btn = $('btnStart');
  return !!btn
    && !btn.classList.contains('hidden')
    && !$('gameContainer').classList.contains('hidden');
}

function onPlayerAction(p, via) {
  const phase = getPlayerPhase(p);
  if      (phase === 'target')  beginCount(p);
  else if (phase === 'running') stopWatch(p);
  else if (isStartable())       firstPress();
  else {
    bumpPanel(p);
    if (via === 'tap') {
      setFlowTip(state.mode === 'battle'
        ? '本回合已结束，等待「下一回合」继续'
        : '本回合已结束，点击「下一回合」继续');
    }
  }
  buzz();
}

function bumpPanel(p) {
  const panel = $('dot_p' + p) && $('dot_p' + p).closest('.player-panel');
  if (!panel) return;
  panel.classList.remove('shake');
  void panel.offsetWidth;
  panel.classList.add('shake');
  setTimeout(() => panel.classList.remove('shake'), 320);
}

function buzz() {
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}
}

function actionKey(p) {
  return state.mode === 'solo' ? '空格' : PLAYER_KEY[p];
}

function getPlayerPhase(p) { return p === 1 ? state.p1Phase : state.p2Phase; }

const refreshDots = () => [1, 2].forEach(renderDot);

function setPlayerPhase(p, val) {
  if (p === 1) state.p1Phase = val; else state.p2Phase = val;
  renderDot(p);
}

function renderDot(p) {
  const d = $('dot_p' + p);
  if (!d) return;
  const phase = getPlayerPhase(p);
  const key   = actionKey(p);
  let cls = 'status-dot', main = '待机', sub = '';

  if      (phase === 'target')  { cls += ' ready pressable';   main = `点击 / ${key}`; sub = '开始计时'; }
  else if (phase === 'running') { cls += ' running pressable'; main = `点击 / ${key}`; sub = '掐表';     }
  else if (phase === 'stopped') { cls += ' stopped';           main = '已停'; }
  else if (isStartable())       { cls += ' idle pressable';    main = '点击 / 开始回合'; }
  else                          { cls += ' idle';              main = '待机'; }

  d.className = cls;
  d.querySelector('.dot-label').innerHTML =
    `<span class="dl-main">${main}</span>` + (sub ? `<span class="dl-sub">${sub}</span>` : '');

  const panel = d.closest('.player-panel');
  if (panel) panel.classList.toggle('pressable', cls.includes('pressable'));
}

function firstPress() {
  state.round++;
  state.targetSec  = randFloat(0, 30);
  state.p1Elapsed   = 0;
  state.p2Elapsed   = 0;
  state.p1Phase     = 'target';
  state.p2Phase     = 'target';
  state.p1Started   = false;
  state.p2Started   = false;

  $('targetLabel').classList.remove('hidden');
  $('targetDisplay').classList.remove('hidden');
  $('targetDisplay').textContent = fmt(state.targetSec);
  $('playersArea').classList.remove('hidden');

  [1, 2].forEach(renderDot);

  $('btnStart').classList.add('hidden');
  $('btnNext').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';

  if (state.mode === 'solo') {
    setFlowTip('⏱️ 按 空格键 或点击圆点 开始计时');
    $('progressText').textContent = `第 ${state.round} 回合`;
  } else {
    setFlowTip('⏱️ P1按 [F]、P2按 [J]，或各自点击圆点开始');
    $('roundInfo').classList.remove('hidden');
    $('scoreBoard').classList.remove('hidden');
    $('roundInfo').textContent = state.bo > 0
      ? `第 ${state.round}/${state.bo} 回合`
      : `第 ${state.round} 回合（无限模式）`;
    $('progressText').textContent = '';
  }
}

function beginCount(p) {
  if (getPlayerPhase(p) !== 'target') return;
  setPlayerPhase(p, 'running');

  if (p === 1) { state.p1Running = true;  state.p1Start = performance.now(); state.p1Started = true; }
  else         { state.p2Running = true;  state.p2Start = performance.now(); state.p2Started = true; }

  if (state.mode === 'solo') {
    setFlowTip('⏱️ 计时中！默数到目标时长后，按 空格键 或点击圆点掐表');
  } else {
    setFlowTip('⏱️ 计时中！各自默数，按自己的键或点击自己的圆点掐表');
  }
}

function stopWatch(p) {
  if (getPlayerPhase(p) !== 'running') return;
  if (p === 1 && !state.p1Running) return;
  if (p === 2 && !state.p2Running) return;

  if (p === 1) { state.p1Running = false; state.p1Elapsed = (performance.now() - state.p1Start) / 1000; }
  else         { state.p2Running = false; state.p2Elapsed = (performance.now() - state.p2Start) / 1000; }

  setPlayerPhase(p, 'stopped');

  if (state.mode === 'solo') {
    setTimeout(() => confirmResult(), 80);
  } else {
    const otherStarted = p === 1 ? state.p2Started : state.p1Started;
    const otherRunning = p === 1 ? state.p2Running : state.p1Running;

    if (!otherStarted) {
      setFlowTip(p === 1 ? '⏱️ 玩家1已掐表，等待玩家2开始...' : '⏱️ 玩家2已掐表，等待玩家1开始...');
    } else if (otherRunning) {
      setFlowTip(p === 1 ? '⏱️ 玩家1已掐表，等待玩家2掐表...' : '⏱️ 玩家2已掐表，等待玩家1掐表...');
    }

    if (state.p1Started && !state.p1Running && state.p2Started && !state.p2Running) {
      setTimeout(() => confirmResult(), 120);
    }
  }
}

function confirmResult() {
  if (state.mode === 'battle') {
    if (!state.p1Started || !state.p2Started) return;
    if (state.p1Running  || state.p2Running)  return;
  }

  if (state.p1Running) { state.p1Running = false; state.p1Elapsed = (performance.now() - state.p1Start) / 1000; }
  if (state.p2Running) { state.p2Running = false; state.p2Elapsed = (performance.now() - state.p2Start) / 1000; }

  const e1 = Math.abs(state.p1Elapsed - state.targetSec);
  if (state.mode === 'solo') handleSoloResult(e1);
  else {
    const e2 = Math.abs(state.p2Elapsed - state.targetSec);
    handleBattleResult(e1, e2);
  }
}

function nextRound() {
  if (state.mode === 'battle' && state.round >= state.maxRounds) { showBattleFinal(); return; }

  $('targetLabel').classList.add('hidden');
  $('targetDisplay').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('btnNext').classList.add('hidden');
  $('btnStart').classList.remove('hidden');
  state.p1Started = false;
  state.p2Started = false;

  [1, 2].forEach(p => {
    if ($('dot_p' + p)) setPlayerPhase(p, 'idle');
  });

  setFlowTip('点击「开始」进入下一回合');
}

function handleSoloResult(err) {
  state.p1History.push(err);
  const g = getGrade(err);
  $('feedbackText').innerHTML =
    `你数了 <span class="text-green">${fmt(state.p1Elapsed)}</span> · ` +
    `误差 <span class="${g.colorClass}">${err.toFixed(3)}s</span> · ` +
    `<span class="${g.colorClass}">${g.label}</span>`;
  $('btnNext').classList.remove('hidden');
  setFlowTip('点击「下一回合」继续挑战，或返回菜单结束');
}

function handleBattleResult(e1, e2) {
  let w = 0;
  if (e1 < e2)      { w = 1; state.p1Score++; }
  else if (e2 < e1) { w = 2; state.p2Score++; }

  $('p1Score').textContent = state.p1Score;
  $('p2Score').textContent = state.p2Score;

  const c1 = e1 <= 0.3 ? 'text-green' : e1 <= 1 ? 'text-yellow' : 'text-red';
  const c2 = e2 <= 0.3 ? 'text-green' : e2 <= 1 ? 'text-yellow' : 'text-red';

  let html = `
    <div style="margin-bottom:8px;">
      <span class="p1-color" style="font-weight:700;">玩家1</span>：${fmt(state.p1Elapsed)}
      (误差 <span class="${c1}">${e1.toFixed(3)}s</span>)
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <span class="p2-color" style="font-weight:700;">玩家2</span>：${fmt(state.p2Elapsed)}
      (误差 <span class="${c2}">${e2.toFixed(3)}s</span>)
    </div>`;

  if      (w === 1) html += `<div class="text-green"  style="font-size:18px;font-weight:700;">👍 玩家1 此回合获胜！</div>`;
  else if (w === 2) html += `<div class="text-green"  style="font-size:18px;font-weight:700;">👍 玩家2 此回合获胜！</div>`;
  else              html += `<div class="text-yellow" style="font-size:18px;font-weight:700;">🤝 此回合平局！</div>`;

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
  state.p1Running = false;
  state.p2Running = false;
  state.p1Phase = 'idle';
  state.p2Phase = 'idle';
  state.p1Started = false;
  state.p2Started = false;
  $('p1Score').textContent = '0';
  $('p2Score').textContent = '0';
  [1, 2].forEach(renderDot);
}

document.addEventListener('keydown', e => {
  if (e.repeat) return;
  const code = e.code;
  let player = null;

  if (state.mode === 'solo') {
    if (code === 'Space') { e.preventDefault(); player = 1; }
  } else {
    if      (code === 'KeyF') { e.preventDefault(); player = 1; }
    else if (code === 'KeyJ') { e.preventDefault(); player = 2; }
  }

  if (!player) return;
  onPlayerAction(player, 'key');
});
