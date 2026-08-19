const state = {
  mode: 'solo',
  bo: -1,
  round: 0,
  maxRounds: 999,
  targetAngle: 0,
  p1Angle: 0,
  p2Angle: 0,
  p1Confirmed: false,
  p2Confirmed: false,
  p1Score: 0,
  p2Score: 0,
  p1History: [],
  roundActive: false,
};

const $ = id => document.getElementById(id);
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function getGrade(diff) {
  if (diff <= 1)  return { label: 'S+', colorClass: 'text-skyblue' };
  if (diff <= 3)  return { label: 'S',  colorClass: 'text-orange'  };
  if (diff <= 5)  return { label: 'A',  colorClass: 'text-purple'  };
  if (diff <= 10) return { label: 'B',  colorClass: 'text-blue'    };
  if (diff <= 20) return { label: 'C',  colorClass: 'text-red'     };
  return                { label: 'X',  colorClass: 'text-gray'    };
}

function showModal(t, h) {
  $('modalTitle').textContent = t;
  $('modalBody').innerHTML = h;
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
  setFlowTip('点击「开始」生成目标角度');
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
  setFlowTip('双人 Battle 已就绪！点击「开始」生成目标角度');
  $('btnStart').classList.remove('hidden');
  $('btnConfirm').classList.add('hidden');
  $('btnNext').classList.add('hidden');
}

document.querySelectorAll('.bo-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.bo-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    setTimeout(() => startBattle(parseInt(this.dataset.bo)), 200);
  });
});

function initSoloUI() {
  $('targetLabel').classList.add('hidden');
  $('targetDisplay').classList.add('hidden');
  $('protractorArea').classList.add('hidden');
  $('roundInfo').classList.add('hidden');
  $('scoreBoard').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';
  $('progressText').textContent = '';
  state.p1Score = 0;
  state.p1History = [];
  state.round = 0;
  buildProtractor(1);
}

function initBattleUI() {
  $('targetLabel').classList.add('hidden');
  $('targetDisplay').classList.add('hidden');
  $('protractorArea').classList.add('hidden');
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
  buildProtractor(2);
}

function buildProtractor(count) {
  const area = $('protractorArea');
  area.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const pNum = i + 1;
    const wrapper = document.createElement('div');
    wrapper.className = 'protractor-wrapper';
    wrapper.innerHTML = `
      <div class="protractor-name ${pNum === 1 ? 'p1' : 'p2'}">
        ${count === 1 ? '🎯 你的量角器' : `玩家 ${pNum}`}
      </div>
      <div class="canvas-container">
        <canvas id="canvas_p${pNum}" width="320" height="320"></canvas>
      </div>`;
    area.appendChild(wrapper);
  }
  if (count >= 1) {
    state.p1Angle = 0;
    drawProtractor('canvas_p1', () => state.p1Angle, (a) => { state.p1Angle = a; });
  }
  if (count >= 2) {
    state.p2Angle = 0;
    drawProtractor('canvas_p2', () => state.p2Angle, (a) => { state.p2Angle = a; });
  }
}

function drawProtractor(canvasId, getAngle, setAngle) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const radius = 130;
  const handleRadius = 16;

  function draw() {
    const angle = getAngle();
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 24, 0, Math.PI * 2);
    ctx.clip();

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const fx = cx + radius * Math.cos(0);
    const fy = cy - radius * Math.sin(0);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(fx, fy);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawArrow(ctx, cx, cy, fx, fy, 'rgba(255,255,255,0.7)');

    const movableRad = angle * Math.PI / 180;
    const mx = cx + radius * Math.cos(movableRad);
    const my = cy - radius * Math.sin(movableRad);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, my);
    ctx.strokeStyle = '#3f88fd';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawArrow(ctx, cx, cy, mx, my, '#3f88fd');

    ctx.beginPath();
    const startAngle = 0;
    const endAngle = -angle * Math.PI / 180;
    ctx.arc(cx, cy, 50, startAngle, endAngle, true);
    ctx.strokeStyle = 'rgba(255, 218, 70, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mx, my, handleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#3f88fd';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    const headLen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  let dragging = false;

  function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onStart(e) {
    e.preventDefault();
    const pos = getEventPos(e);
    const angle = getAngle();
    const movableRad = angle * Math.PI / 180;
    const mx = cx + radius * Math.cos(movableRad);
    const my = cy - radius * Math.sin(movableRad);
    const dist = Math.hypot(pos.x - mx, pos.y - my);
    if (dist <= handleRadius + 8) dragging = true;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const pos = getEventPos(e);
    let deg = Math.atan2(-(pos.y - cy), pos.x - cx) * 180 / Math.PI;
    deg = (deg + 360) % 360;
    setAngle(Math.round(deg));
    draw();
  }

  function onEnd() { dragging = false; }

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('mouseleave', onEnd);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd);

  draw();
  canvas._redraw = draw;
}

function redrawAll() {
  document.querySelectorAll('canvas').forEach(c => { if (c._redraw) c._redraw(); });
}

function startRound() {
  state.round++;
  state.targetAngle = randInt(0, 360);
  state.p1Angle = 0;
  state.p2Angle = 0;
  state.p1Confirmed = false;
  state.p2Confirmed = false;
  state.roundActive = true;

  $('targetLabel').classList.remove('hidden');
  $('targetDisplay').classList.remove('hidden');
  $('protractorArea').classList.remove('hidden');
  $('targetDisplay').textContent = state.targetAngle + '°';
  $('btnStart').classList.add('hidden');
  $('btnConfirm').classList.remove('hidden');
  $('btnNext').classList.add('hidden');
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('feedbackText').textContent = '';

  if (state.mode === 'solo') {
    setFlowTip('🎯 目标角度已生成！拖动量角器上的圆点调整角度，尽量接近目标，然后点击「确定」');
    $('progressText').textContent = `第 ${state.round} 回合`;
  } else {
    setFlowTip('🎯 目标角度已生成！两名玩家分别调整各自的量角器，都准备好后点击「确定」');
    $('roundInfo').classList.remove('hidden');
    $('scoreBoard').classList.remove('hidden');
    $('roundInfo').textContent = state.bo > 0
      ? `第 ${state.round} / ${state.bo} 回合`
      : `第 ${state.round} 回合（无限模式）`;
    $('progressText').textContent = '';
  }
  redrawAll();
}

function confirmAngle() {
  if (!state.roundActive) return;
  state.roundActive = false;
  const diff1 = angleDiff(state.p1Angle, state.targetAngle);
  if (state.mode === 'solo') handleSoloResult(diff1);
  else {
    const diff2 = angleDiff(state.p2Angle, state.targetAngle);
    handleBattleResult(diff1, diff2);
  }
}

function nextRound() {
  if (state.mode === 'battle') {
    const totalRounds = state.bo > 0 ? state.bo : Infinity;
    if (state.round >= totalRounds) { showBattleFinal(); return; }
  }
  startRound();
}

function handleSoloResult(diff) {
  const grade = getGrade(diff);
  $('feedbackText').innerHTML = `
    你的角度：<span class="text-green">${Math.round(state.p1Angle)}°</span> ·
    误差：<span class="${grade.colorClass}">${diff.toFixed(1)}°</span> ·
    <span class="${grade.colorClass}">${grade.label}</span>`;
  $('resultContainer').classList.add('hidden');
  $('resultContainer').innerHTML = '';
  $('btnConfirm').classList.add('hidden');
  $('btnNext').classList.remove('hidden');
  setFlowTip('点击「下一回合」继续挑战，或返回菜单结束游戏');
}

function handleBattleResult(diff1, diff2) {
  let winner = 0;
  if (diff1 < diff2) { winner = 1; state.p1Score++; }
  else if (diff2 < diff1) { winner = 2; state.p2Score++; }

  $('p1Score').textContent = state.p1Score;
  $('p2Score').textContent = state.p2Score;

  const p1Color = diff1 <= 3 ? 'text-green' : diff1 <= 10 ? 'text-yellow' : 'text-red';
  const p2Color = diff2 <= 3 ? 'text-green' : diff2 <= 10 ? 'text-yellow' : 'text-red';

  let resultHtml = `
    <div style="margin-bottom:8px;">
      <span class="p1-color" style="font-weight:700;">玩家1</span>：
      ${Math.round(state.p1Angle)}° (误差 <span class="${p1Color}">${diff1.toFixed(1)}°</span>)
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <span class="p2-color" style="font-weight:700;">玩家2</span>：
      ${Math.round(state.p2Angle)}° (误差 <span class="${p2Color}">${diff2.toFixed(1)}°</span>)
    </div>`;

  if (winner === 1) resultHtml += `<div class="text-green" style="font-size:18px;font-weight:700;">👍 玩家 1 此回合获胜！</div>`;
  else if (winner === 2) resultHtml += `<div class="text-green" style="font-size:18px;font-weight:700;">👍 玩家 2 此回合获胜！</div>`;
  else resultHtml += `<div class="text-yellow" style="font-size:18px;font-weight:700;">🤝 此回合平局！</div>`;

  $('feedbackText').innerHTML = '';
  $('resultContainer').classList.remove('hidden');
  $('resultContainer').innerHTML = `
    <div class="stats-group">
      <div class="stats-group-title">⚔️ 本回合结果</div>
      <div style="text-align:center;line-height:2;">${resultHtml}</div>
      <div class="stats" style="margin-top:10px;">
        <div class="stat-item"><div class="stat-label">玩家1 胜场</div><div class="stat-value" style="color:var(--color-accent)">${state.p1Score}</div></div>
        <div class="stat-item"><div class="stat-label">玩家2 胜场</div><div class="stat-value" style="color:var(--color-success)">${state.p2Score}</div></div>
      </div>
    </div>`;

  $('btnConfirm').classList.add('hidden');
  const totalRounds = state.bo > 0 ? state.bo : Infinity;
  if (state.round >= totalRounds) {
    $('btnNext').classList.add('hidden');
    setTimeout(() => showBattleFinal(), 800);
  } else {
    $('btnNext').classList.remove('hidden');
  }
  setFlowTip('点击「下一回合」继续比赛！');
}

function showBattleFinal() {
  const p1Wins = state.p1Score, p2Wins = state.p2Score;
  let title, body;
  if (p1Wins > p2Wins) {
    title = '🎉 玩家 1 赢了！';
    body = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${p1Wins}</span> &nbsp;:&nbsp; <span class="highlight p2-color">${p2Wins} 玩家2</span></div><div>玩家 1 获得了胜利！</div>`;
  } else if (p2Wins > p1Wins) {
    title = '🎉 玩家 2 赢了！';
    body = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${p1Wins}</span> &nbsp;:&nbsp; <span class="highlight p2-color">${p2Wins} 玩家2</span></div><div>玩家 2 获得了胜利！</div>`;
  } else {
    title = '🤝 平局';
    body = `<div>最终比分：</div><div style="margin:12px 0;"><span class="highlight p1-color">玩家1 ${p1Wins}</span> &nbsp;:&nbsp; <span class="highlight p2-color">${p2Wins} 玩家2</span></div><div>实力相当！势均力敌！</div>`;
  }
  showModal(title, body + `<div style="margin-top:16px;"><button class="btn btn-primary" onclick="backToModeSelect();closeModal();">返回</button></div>`);
  $('btnNext').classList.add('hidden');
  $('btnStart').classList.remove('hidden');
}

function setFlowTip(text) { $('flowTip').textContent = text; }

function resetGame() {
  state.round = 0;
  state.p1Score = 0;
  state.p2Score = 0;
  state.p1History = [];
  state.roundActive = false;
  $('p1Score').textContent = '0';
  $('p2Score').textContent = '0';
}
