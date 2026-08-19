const LadderState = {
  mode: 'solo',
  bo: -1,
  round: 0,
  maxRounds: 999,
  targetDist: 0,
  p1Angle: 0,
  p1Len: 0,
  p2Angle: 0,
  p2Len: 0,
  p1Score: 0,
  p2Score: 0,
  p1History: [],
  roundActive: false,
  animating: false,
};

const $L = id => document.getElementById(id);
const randIntL = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clampL = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

function getLadderGrade(d) {
  if (d <= 3)   return { label: 'S+', colorClass: 'text-skyblue' };
  if (d <= 10)  return { label: 'S',  colorClass: 'text-orange'  };
  if (d <= 25)  return { label: 'A',  colorClass: 'text-purple'  };
  if (d <= 60)  return { label: 'B',  colorClass: 'text-blue'    };
  if (d <= 100) return { label: 'C',  colorClass: 'text-red'     };
  return                { label: 'D',  colorClass: 'text-gray'    };
}

function showLadderModal(t, h) {
  $L('modalTitle').textContent = t;
  $L('modalBody').innerHTML = h;
  $L('modalOverlay').classList.remove('hidden');
}
function closeLadderModal() {
  $L('modalOverlay').classList.add('hidden');
}

function showLadderGame() {
  $L('modeSelect').classList.add('hidden');
  $L('boSelect').classList.add('hidden');
  $L('gameContainer').classList.remove('hidden');
  $L('ruleTip').classList.add('hidden');
}
function backToLadderMenu() {
  $L('modeSelect').classList.remove('hidden');
  $L('boSelect').classList.add('hidden');
  $L('gameContainer').classList.add('hidden');
  $L('ruleTip').classList.remove('hidden');
  resetLadderGame();
}
function showLadderBoSelect() {
  $L('modeSelect').classList.add('hidden');
  $L('boSelect').classList.remove('hidden');
}

function startLadderSolo() {
  LadderState.mode = 'solo';
  LadderState.bo = 1;
  LadderState.maxRounds = 999;
  showLadderGame();
  initLadderSoloUI();
  setLadderFlowTip('点击「开始」生成目标点');
  $L('btnStart').classList.remove('hidden');
  $L('btnConfirm').classList.add('hidden');
  $L('btnNext').classList.add('hidden');
}

function startLadderBattle(bo) {
  LadderState.mode = 'battle';
  LadderState.bo = bo;
  LadderState.maxRounds = bo > 0 ? bo : 999;
  showLadderGame();
  initLadderBattleUI();
  setLadderFlowTip('双人 Battle 已就绪！点击「开始」生成目标点');
  $L('btnStart').classList.remove('hidden');
  $L('btnConfirm').classList.add('hidden');
  $L('btnNext').classList.add('hidden');
}

document.querySelectorAll('.bo-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.bo-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const bo = parseInt(this.dataset.bo);
    setTimeout(() => startLadderBattle(bo), 200);
  });
});

function initLadderSoloUI() {
  $L('ladderArea').classList.add('hidden');
  $L('roundInfo').classList.add('hidden');
  $L('scoreBoard').classList.add('hidden');
  $L('resultContainer').classList.add('hidden');
  $L('resultContainer').innerHTML = '';
  $L('feedbackText').textContent = '';
  $L('progressText').textContent = '';
  LadderState.p1Score = 0;
  LadderState.p1History = [];
  LadderState.round = 0;
  buildLadders(1);
}

function initLadderBattleUI() {
  $L('ladderArea').classList.add('hidden');
  $L('roundInfo').classList.add('hidden');
  $L('scoreBoard').classList.add('hidden');
  $L('resultContainer').classList.add('hidden');
  $L('resultContainer').innerHTML = '';
  $L('feedbackText').textContent = '';
  $L('progressText').textContent = '';
  LadderState.p1Score = 0;
  LadderState.p2Score = 0;
  LadderState.round = 0;
  $L('p1Score').textContent = '0';
  $L('p2Score').textContent = '0';
  buildLadders(2);
}

const CANVAS_W = 560;
const CANVAS_H = 520;
const START_X = 80;
const MAX_TARGET_DIST = 420;

function buildLadders(count) {
  const area = $L('ladderArea');
  area.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const p = i + 1;
    const wrap = document.createElement('div');
    wrap.className = 'ladder-wrapper';
    wrap.innerHTML = `
      <div class="ladder-name ${p === 1 ? 'p1' : 'p2'}">${count === 1 ? '🪜 你的梯子' : `玩家 ${p}`}</div>
      <div class="canvas-container"><canvas id="ladder_canvas_p${p}" width="${CANVAS_W}" height="${CANVAS_H}"></canvas></div>
      <div class="ladder-hint">长按画布向上拉伸梯子，松手放倒</div>`;
    area.appendChild(wrap);
  }
  if (count >= 1) {
    LadderState.p1Len = 0;
    LadderState.p1Angle = -90;
    drawLadder('ladder_canvas_p1', () => LadderState.p1Len, () => LadderState.p1Angle, 1);
    bindLadder('ladder_canvas_p1', 1);
  }
  if (count >= 2) {
    LadderState.p2Len = 0;
    LadderState.p2Angle = -90;
    drawLadder('ladder_canvas_p2', () => LadderState.p2Len, () => LadderState.p2Angle, 2);
    bindLadder('ladder_canvas_p2', 2);
  }
}

function drawLadder(canvasId, getLen, getAngle, playerNum) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const baseY = H - 50;
  const sx = START_X, sy = baseY;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.moveTo(20, baseY);
    ctx.lineTo(W - 20, baseY);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#3f88fd';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (LadderState.targetDist > 0 && LadderState.roundActive) {
      const tx = sx + LadderState.targetDist;
      ctx.beginPath();
      ctx.arc(tx, baseY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffda46';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const len = getLen();
    const angleDeg = getAngle();
    if (len > 0) {
      const rad = angleDeg * Math.PI / 180;
      const ex = sx + len * Math.cos(rad);
      const ey = sy + len * Math.sin(rad);

      const ladderColor = playerNum === 1 ? '#3f88fd' : '#00ff88';
      const grad = ctx.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, ladderColor + 'cc');
      grad.addColorStop(1, ladderColor + '66');

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fillStyle = ladderColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  draw();
  canvas._redraw = draw;
}

function bindLadder(canvasId, playerNum) {
  const canvas = document.getElementById(canvasId);
  let holding = false;
  let rafId = null;
  let lastTick = 0;
  const extendSpeed = 120;

  function getLen() { return playerNum === 1 ? LadderState.p1Len : LadderState.p2Len; }
  function setLen(v) {
    if (playerNum === 1) LadderState.p1Len = v;
    else LadderState.p2Len = v;
  }
  function getAngle() { return playerNum === 1 ? LadderState.p1Angle : LadderState.p2Angle; }
  function setAngle(v) {
    if (playerNum === 1) LadderState.p1Angle = v;
    else LadderState.p2Angle = v;
  }

  function startExtend() {
    if (!LadderState.roundActive || LadderState.animating) return;
    holding = true;
    lastTick = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(extendLoop);
  }

  function extendLoop(now) {
    if (!holding) return;
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    let cur = getLen() + extendSpeed * dt;
    cur = clampL(cur, 0, 500);
    setLen(cur);
    setAngle(-90);
    canvas._redraw();

    if (cur >= 500) {
      holding = false;
      dropLadder(playerNum);
    } else if (holding) {
      rafId = requestAnimationFrame(extendLoop);
    }
  }

  function stopExtend() {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(rafId);
    dropLadder(playerNum);
  }

  canvas.addEventListener('mousedown', startExtend);
  canvas.addEventListener('mouseup', stopExtend);
  canvas.addEventListener('mouseleave', () => { holding = false; cancelAnimationFrame(rafId); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); startExtend(); }, { passive: false });
  canvas.addEventListener('touchend', stopExtend);
  canvas.addEventListener('touchcancel', stopExtend);
}

function dropLadder(playerNum) {
  const canvas = $L(`ladder_canvas_p${playerNum}`);
  const releaseLen = playerNum === 1 ? LadderState.p1Len : LadderState.p2Len;
  LadderState.animating = true;

  const animDuration = 600;
  const fromAngle = -90;
  const toAngle = 0;
  const fromLen = releaseLen;
  const toLen = releaseLen;
  const startTime = performance.now();

  function animate(now) {
    const t = clampL((now - startTime) / animDuration, 0, 1);
    const eased = easeOutCubic(t);
    const curAngle = lerp(fromAngle, toAngle, eased);
    const curLen = lerp(fromLen, toLen, eased);

    if (playerNum === 1) {
      LadderState.p1Angle = curAngle;
      LadderState.p1Len = curLen;
    } else {
      LadderState.p2Angle = curAngle;
      LadderState.p2Len = curLen;
    }
    canvas._redraw();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      if (playerNum === 1) {
        LadderState.p1Angle = 0;
        LadderState.p1Len = releaseLen;
      } else {
        LadderState.p2Angle = 0;
        LadderState.p2Len = releaseLen;
      }
      LadderState.animating = false;
      canvas._redraw();

      if (LadderState.mode === 'solo') {
        setTimeout(() => confirmLadder(), 200);
      } else {
        checkBothDropped();
      }
    }
  }
  requestAnimationFrame(animate);
}

function checkBothDropped() {
  if (LadderState.mode !== 'battle') return;
  if (LadderState.animating) return;
  const p1Done = LadderState.p1Len > 0 && Math.abs(LadderState.p1Angle) < 0.1;
  const p2Done = LadderState.p2Len > 0 && Math.abs(LadderState.p2Angle) < 0.1;
  if (p1Done && p2Done) {
    setTimeout(() => confirmLadder(), 300);
  }
}

function redrawAllLadders() {
  document.querySelectorAll('canvas').forEach(c => { if (c._redraw) c._redraw(); });
}

function startLadderRound() {
  LadderState.round++;
  LadderState.targetDist = randIntL(50, MAX_TARGET_DIST);
  LadderState.p1Len = 0;
  LadderState.p1Angle = -90;
  LadderState.p2Len = 0;
  LadderState.p2Angle = -90;
  LadderState.roundActive = true;
  LadderState.animating = false;

  $L('ladderArea').classList.remove('hidden');
  $L('btnStart').classList.add('hidden');
  $L('btnConfirm').classList.add('hidden');
  $L('btnNext').classList.add('hidden');
  $L('resultContainer').classList.add('hidden');
  $L('resultContainer').innerHTML = '';
  $L('feedbackText').textContent = '';

  if (LadderState.mode === 'solo') {
    setLadderFlowTip('🪜 目标已生成！长按画布向上拉伸梯子，松手自动放倒，尽量让梯子水平长度接近目标！');
    $L('progressText').textContent = `第 ${LadderState.round} 回合`;
  } else {
    setLadderFlowTip('🪜 目标已生成！两名玩家分别拉伸各自梯子，松手放倒后自动结算');
    $L('roundInfo').classList.remove('hidden');
    $L('scoreBoard').classList.remove('hidden');
    $L('roundInfo').textContent = LadderState.bo > 0
      ? `第 ${LadderState.round}/${LadderState.bo} 回合`
      : `第 ${LadderState.round} 回合（无限模式）`;
    $L('progressText').textContent = '';
  }
  redrawAllLadders();
}

function confirmLadder() {
  if (!LadderState.roundActive) return;
  LadderState.roundActive = false;

  const p1FinalLen = Math.round(LadderState.p1Len);
  const diff1 = Math.abs(p1FinalLen - LadderState.targetDist);

  if (LadderState.mode === 'solo') {
    handleLadderSoloResult(p1FinalLen, diff1);
  } else {
    const p2FinalLen = Math.round(LadderState.p2Len);
    const diff2 = Math.abs(p2FinalLen - LadderState.targetDist);
    handleLadderBattleResult(p1FinalLen, p2FinalLen, diff1, diff2);
  }
}

function nextLadderRound() {
  if (LadderState.mode === 'battle' && LadderState.round >= LadderState.maxRounds) {
    showLadderFinal();
    return;
  }
  startLadderRound();
}

function handleLadderSoloResult(len, diff) {
  LadderState.p1History.push(diff);
  const g = getLadderGrade(diff);
  $L('feedbackText').innerHTML = `
    你的梯子水平长度：<span class="text-green">${len}px</span> ·
    误差：<span class="${g.colorClass}">${diff}px</span> ·
    <span class="${g.colorClass}">${g.label}</span>`;
  $L('resultContainer').classList.add('hidden');
  $L('resultContainer').innerHTML = '';
  $L('btnConfirm').classList.add('hidden');
  $L('btnNext').classList.remove('hidden');
  setLadderFlowTip('点击「下一回合」继续挑战，或返回菜单结束游戏');
}

function handleLadderBattleResult(v1, v2, d1, d2) {
  let w = 0;
  if (d1 < d2) { w = 1; LadderState.p1Score++; }
  else if (d2 < d1) { w = 2; LadderState.p2Score++; }

  $L('p1Score').textContent = LadderState.p1Score;
  $L('p2Score').textContent = LadderState.p2Score;

  const c1 = d1 <= 15 ? 'text-green' : d1 <= 60 ? 'text-yellow' : 'text-red';
  const c2 = d2 <= 15 ? 'text-green' : d2 <= 60 ? 'text-yellow' : 'text-red';

  let html = `
    <div style="margin-bottom:8px;">
      <span class="p1-color" style="font-weight:700;">玩家1</span>：${v1}px（误差 <span class="${c1}">${d1}px</span>）
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <span class="p2-color" style="font-weight:700;">玩家2</span>：${v2}px（误差 <span class="${c2}">${d2}px</span>）
    </div>`;
  if (w === 1) html += `<div class="text-green" style="font-size:18px;font-weight:700;">👍 玩家1 此回合获胜！</div>`;
  else if (w === 2) html += `<div class="text-green" style="font-size:18px;font-weight:700;">👍 玩家2 此回合获胜！</div>`;
  else html += `<div class="text-yellow" style="font-size:18px;font-weight:700;">🤝 此回合平局！</div>`;

  $L('feedbackText').innerHTML = '';
  $L('resultContainer').classList.remove('hidden');
  $L('resultContainer').innerHTML = `
    <div class="stats-group">
      <div class="stats-group-title">⚔️ 本回合结果</div>
      <div style="text-align:center;line-height:2;">${html}</div>
      <div class="stats" style="margin-top:10px;">
        <div class="stat-item"><div class="stat-label">玩家1 胜场</div><div class="stat-value" style="color:var(--color-accent)">${LadderState.p1Score}</div></div>
        <div class="stat-item"><div class="stat-label">玩家2 胜场</div><div class="stat-value" style="color:var(--color-success)">${LadderState.p2Score}</div></div>
      </div>
    </div>`;
  $L('btnConfirm').classList.add('hidden');
  if (LadderState.round >= LadderState.maxRounds) {
    $L('btnNext').classList.add('hidden');
    setTimeout(showLadderFinal, 800);
  } else {
    $L('btnNext').classList.remove('hidden');
  }
  setLadderFlowTip('点击「下一回合」继续比赛！');
}

function showLadderFinal() {
  const a = LadderState.p1Score, b = LadderState.p2Score;
  let title, body;
  if (a > b) {
    title = '🎉 玩家1 赢了！';
    body = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span>&nbsp;:&nbsp;<span class="highlight p2-color">${b} 玩家2</span></div><div>玩家1 获得了胜利！</div>`;
  } else if (b > a) {
    title = '🎉 玩家2 赢了！';
    body = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span>&nbsp;:&nbsp;<span class="highlight p2-color">${b} 玩家2</span></div><div>玩家2 获得了胜利！</div>`;
  } else {
    title = '🤝 平局';
    body = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${a}</span>&nbsp;:&nbsp;<span class="highlight p2-color">${b} 玩家2</span></div><div>实力相当！势均力敌！</div>`;
  }
  showLadderModal(title, body + `<div style="margin-top:16px;"><button class="btn btn-primary" onclick="backToLadderMenu();closeLadderModal();">返回</button></div>`);
  $L('btnNext').classList.add('hidden');
  $L('btnStart').classList.remove('hidden');
}

function setLadderFlowTip(t) { $L('flowTip').textContent = t; }

function resetLadderGame() {
  LadderState.round = 0;
  LadderState.p1Score = 0;
  LadderState.p2Score = 0;
  LadderState.p1History = [];
  LadderState.roundActive = false;
  LadderState.animating = false;
  LadderState.p1Len = 0;
  LadderState.p2Len = 0;
  LadderState.p1Angle = -90;
  LadderState.p2Angle = -90;
  LadderState.targetDist = 0;
  $L('p1Score').textContent = '0';
  $L('p2Score').textContent = '0';
}
