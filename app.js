import { CHORDS, makePairs, formatTime, sessionPosition } from './practice.js';

const $ = id => document.getElementById(id);
const paths = {
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .4c0 1.8-2.5 2-2.5 3.6m0 3h.01"/>',
  sliders: '<path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
  'volume-off': '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6"/>',
  volume: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  switch: '<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>',
  play: '<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  skip: '<path d="m5 5 11 7-11 7Z"/><path d="M19 5v14"/>',
  repeat: '<path d="M4 10V7a2 2 0 0 1 2-2h14m-4-4 4 4-4 4M20 14v3a2 2 0 0 1-2 2H4m4-4-4 4 4 4"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  sparkles: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Zm7-2v4m-2-2h4"/>',
  guitar: '<path d="m13 11 7-7m-2-1 3 3M9 8c-2-1-4 1-3 3-5 1-5 7-1 9s7-1 7-4c3 0 4-3 2-5l-5-3Z"/><circle cx="9" cy="15" r="1.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

let selected = new Set(['C', 'G', 'Am', 'Em']);
let duration = 60;
try {
  const saved = JSON.parse(localStorage.getItem('chordchange-settings'));
  if (saved && Array.isArray(saved.chords)) selected = new Set(saved.chords.filter(name => CHORDS.some(c => c.name === name)));
  if (saved && Number.isInteger(saved.duration) && saved.duration >= 5 && saved.duration <= 600) duration = saved.duration;
} catch { /* Storage is optional. */ }
let pairs = [];
let state = 'ready';
let index = 0;
let elapsed = 0;
let startedAt = 0;
let interval;
let sound = false;
let audioContext;
let skipped = 0;

function announce(message) { $('announcement').textContent = message; }
function saveSettings() {
  try { localStorage.setItem('chordchange-settings', JSON.stringify({ chords: [...selected], duration })); } catch { /* Storage is optional. */ }
}

function renderChord(target, name) {
  const chord = CHORDS.find(c => c.name === name);
  if (!chord) { $(target).innerHTML = '<div class="chord-name">—</div><div class="chord-full-name">Choose a chord</div>'; return; }
  const x = i => 20 + i * 20;
  const y = fret => 35 + (fret - .5) * 24;
  let grid = '';
  for (let i = 0; i < 6; i++) grid += `<line x1="${x(i)}" y1="35" x2="${x(i)}" y2="131" stroke="#c9c2d4" stroke-width="${1.3 - i * .1}"/>`;
  for (let i = 0; i <= 4; i++) grid += `<line x1="20" y1="${35+i*24}" x2="120" y2="${35+i*24}" stroke="${i ? '#d6d0df' : '#756783'}" stroke-width="${i ? 1 : 3}"/>`;
  if (chord.barre) {
    const start = chord.frets.findIndex(f => f === chord.barre);
    grid += `<line x1="${x(start)}" y1="${y(chord.barre)}" x2="120" y2="${y(chord.barre)}" stroke="#9474c7" stroke-width="14" stroke-linecap="round"/>`;
  }
  chord.frets.forEach((fret, i) => {
    if (fret <= 0) grid += `<text x="${x(i)}" y="24" text-anchor="middle" fill="#a295b2" font-family="sans-serif" font-size="12">${fret < 0 ? '×' : '○'}</text>`;
    else grid += `<circle cx="${x(i)}" cy="${y(fret)}" r="8" fill="#9474c7"/><text x="${x(i)}" y="${y(fret)+3}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="8" font-weight="600">${chord.fingers[i]}</text>`;
    grid += `<text x="${x(i)}" y="147" text-anchor="middle" fill="#ada3b7" font-family="sans-serif" font-size="8">${['E','A','D','G','B','e'][i]}</text>`;
  });
  const description = chord.frets.map((f, i) => `${['low E','A','D','G','B','high E'][i]} ${f < 0 ? 'muted' : f === 0 ? 'open' : `fret ${f}, finger ${chord.fingers[i]}`}`).join('; ');
  $(target).innerHTML = `<h3 class="chord-name">${chord.name}</h3><span class="chord-full-name">${chord.label}</span><svg class="chord-diagram" viewBox="0 0 140 158" role="img" aria-label="${chord.label}: ${description}">${grid}</svg>`;
}

function renderSelection() {
  $('chord-groups').innerHTML = ['Major', 'Minor', 'Seventh'].map(group => `<div class="chord-group"><h3>${group}</h3><div class="chord-buttons">${CHORDS.filter(c => c.group === group).map(c => `<button type="button" class="chord-button ${selected.has(c.name) ? 'selected' : ''}" data-chord="${c.name}" aria-label="${c.label}" aria-pressed="${selected.has(c.name)}">${c.name}</button>`).join('')}</div></div>`).join('');
}

function renderQueue() {
  $('queue').innerHTML = pairs.map((pair, i) => `<div class="queue-pair ${i < index || state === 'complete' ? 'done' : i === index ? 'active' : ''}" ${i === index ? 'aria-current="step"' : ''}><span class="pair-number">${i < index || state === 'complete' ? '✓' : String(i+1).padStart(2,'0')}</span><span>${pair[0]}</span><span class="pair-arrow">↔</span><span>${pair[1]}</span></div>`).join('') || '<span class="field-description">Your chord pairs will appear here.</span>';
  const active = $('queue').querySelector('.active');
  if (active) $('queue').scrollLeft = Math.max(0, active.offsetLeft - $('queue').offsetLeft - 12);
}

function renderPair() {
  renderChord('chord-left', pairs[index]?.[0]);
  renderChord('chord-right', pairs[index]?.[1]);
  renderQueue();
  $('pair-counter').textContent = state === 'ready' ? `${pairs.length} pairs. One focused session.` : state === 'complete' ? 'Session complete. Nicely done.' : `Pair ${index+1} of ${pairs.length}`;
}

function updateTimer(remaining, progress = 0) {
  $('timer').textContent = formatTime(remaining);
  $('timer-fill').style.width = `${Math.max(0, remaining / duration * 100)}%`;
  $('overall-fill').style.width = `${progress*100}%`;
  $('progress-percent').textContent = `${Math.floor(progress*100)}%`;
}

function renderState() {
  const active = state === 'running' || state === 'paused';
  $('settings').disabled = active;
  $('shuffle-button').disabled = active || pairs.length < 2;
  $('reset-button').disabled = state === 'ready';
  $('skip-button').disabled = !active;
  $('start-button').disabled = pairs.length === 0 || !$('duration').checkValidity();
  const labels = { ready: ['play','Start practice'], running: ['pause','Pause practice'], paused: ['play','Keep playing'], complete: ['repeat','Practice again'] };
  const [symbol, label] = labels[state];
  $('start-button').innerHTML = `${icon(symbol)}<span>${label}</span>`;
  $('status').textContent = { ready: 'READY WHEN YOU ARE', running: 'IN THE FLOW', paused: 'TAKE A BREATHER', complete: 'SESSION COMPLETE' }[state];
  $('status-pill').classList.toggle('running', state === 'running');
  $('practice-title').textContent = { ready: 'Small changes. Big progress.', running: 'Find the space between the chords.', paused: 'Your flow will be here.', complete: 'A little better than yesterday.' }[state];
  $('practice-description').textContent = { ready: 'Get comfortable, grab your guitar, and let’s play.', running: 'Switch back and forth. Keep it clean. Go at your pace.', paused: 'Take a breath. Pick up right where you left off.', complete: 'Every minute you show up makes a difference.' }[state];
  $('settings-note').textContent = active ? 'End the session ↺ to change your settings.' : 'Every pair, once. A fresh order each session.';
  $('timer-label').textContent = state === 'ready' ? 'TIME PER PAIR' : state === 'complete' ? 'ALL DONE' : 'TIME REMAINING';
  $('progress-label').textContent = state === 'ready' ? 'Ready to make a little progress?' : state === 'complete' ? 'You made time for your music.' : `${index} of ${pairs.length} pairs finished${skipped ? ` · ${skipped} skipped` : ''}`;
  $('chord-stage').hidden = state === 'complete';
  $('completion').hidden = state !== 'complete';
  $('keyboard-hint').innerHTML = state === 'complete' ? 'Same chords. A fresh flow. Go again when you’re ready.' : 'Press <kbd>space</kbd> to start or pause';
}

function configure() {
  if (state === 'running' || state === 'paused') return;
  state = 'ready'; index = 0; elapsed = 0; skipped = 0;
  pairs = makePairs([...selected]);
  document.querySelectorAll('[data-chord]').forEach(el => {
    el.classList.toggle('selected', selected.has(el.dataset.chord));
    el.setAttribute('aria-pressed', String(selected.has(el.dataset.chord)));
  });
  $('selected-count').textContent = `${selected.size} selected`;
  $('summary-pairs').textContent = `${pairs.length} unique ${pairs.length === 1 ? 'pair' : 'pairs'}`;
  const total = pairs.length * duration;
  $('summary-time').textContent = pairs.length ? `${formatTime(total)} of practice` : 'Choose at least two chords to start';
  $('duration').value = duration;
  document.querySelectorAll('[data-duration]').forEach(el => el.classList.toggle('selected', Number(el.dataset.duration) === duration));
  $('custom-duration').classList.toggle('selected', ![30,60,90].includes(duration));
  renderPair(); renderState(); updateTimer(duration); saveSettings();
}

function chime(completed = false) {
  if (!sound || !audioContext) return;
  try {
    const t = audioContext.currentTime;
    [523.25, completed ? 783.99 : 659.25].forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t+i*.14);
      gain.gain.linearRampToValueAtTime(.12, t+i*.14+.015);
      gain.gain.exponentialRampToValueAtTime(.001, t+i*.14+.45);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(t+i*.14); oscillator.stop(t+i*.14+.5);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Timer works even if audio is unavailable. */ }
}

function finish() {
  clearInterval(interval); state = 'complete'; index = pairs.length;
  $('completion-message').textContent = `${pairs.length-skipped} chord pairs practiced${skipped ? ` · ${skipped} skipped` : ''}. Keep that feeling going.`;
  updateTimer(0, 1); renderPair(); renderState(); chime(true);
  announce(`Session complete. ${pairs.length-skipped} chord pairs practiced.`);
}

function tick() {
  if (state !== 'running') return;
  const position = sessionPosition(elapsed + Date.now() - startedAt, duration, pairs.length);
  if (position.complete) { finish(); return; }
  if (position.index !== index) {
    index = position.index; renderPair(); renderState(); chime();
    announce(`Pair ${index+1} of ${pairs.length}: ${pairs[index].join(' and ')}.`);
  }
  updateTimer(position.remaining, position.progress);
}

function togglePractice() {
  if ($('start-button').disabled) return;
  if (state === 'running') {
    tick();
    if (state === 'complete') return;
    elapsed += Date.now() - startedAt;
    clearInterval(interval); state = 'paused'; renderState(); announce('Practice paused.');
    return;
  }
  if (state === 'complete') configure();
  if (state === 'ready') { elapsed = 0; index = 0; skipped = 0; }
  state = 'running'; startedAt = Date.now();
  if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
  renderState(); renderPair(); tick(); interval = setInterval(tick, 100);
  announce(`Practice started. ${pairs[index].join(' and ')}. ${duration} seconds.`);
}

$('chord-groups').addEventListener('click', event => {
  const button = event.target.closest('[data-chord]');
  if (!button || $('settings').disabled) return;
  const name = button.dataset.chord;
  selected.has(name) ? selected.delete(name) : selected.add(name);
  configure();
});
$('select-all').addEventListener('click', () => { selected = new Set(CHORDS.map(c => c.name)); configure(); });
$('clear-selection').addEventListener('click', () => { selected.clear(); configure(); });
$('duration-presets').addEventListener('click', event => {
  const button = event.target.closest('[data-duration]');
  if (!button) return;
  duration = Number(button.dataset.duration); $('custom-time').hidden = true; configure();
});
$('custom-duration').addEventListener('click', () => { $('custom-time').hidden = false; $('duration').focus(); $('duration').select(); });
$('duration').addEventListener('input', () => {
  if ($('duration').checkValidity() && $('duration').value !== '') { duration = Number($('duration').value); configure(); }
  else $('start-button').disabled = true;
});
$('start-button').addEventListener('click', togglePractice);
$('shuffle-button').addEventListener('click', () => { configure(); announce('Practice pairs reshuffled.'); });
$('reset-button').addEventListener('click', () => { clearInterval(interval); state = 'ready'; configure(); announce('Session ended. Settings are ready to edit.'); });
$('skip-button').addEventListener('click', () => {
  if (state !== 'running' && state !== 'paused') return;
  if (state === 'running') tick();
  if (state === 'complete') return;
  skipped++; index++; elapsed = index * duration * 1000; startedAt = Date.now();
  if (index >= pairs.length) { finish(); return; }
  renderPair(); renderState(); updateTimer(duration, index / pairs.length); chime();
  announce(`Next pair: ${pairs[index].join(' and ')}.`);
});
$('sound-toggle').addEventListener('click', async () => {
  sound = !sound;
  if (sound) {
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); }
    catch { sound = false; announce('Sound is unavailable in this browser.'); }
  }
  $('sound-toggle').innerHTML = icon(sound ? 'volume' : 'volume-off');
  $('sound-toggle').setAttribute('aria-pressed', String(sound));
  const label = `${sound ? 'Disable' : 'Enable'} sound at pair changes`;
  $('sound-toggle').setAttribute('aria-label', label); $('sound-toggle').title = label;
  if (sound) chime();
});
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('got-it').addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const rect = $('help-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('help-dialog').close(); } });
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || $('help-dialog').open || event.target.closest('button, input, textarea, select, a, [contenteditable]')) return;
  event.preventDefault(); togglePractice();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
renderSelection();
$('custom-time').hidden = [30,60,90].includes(duration);
configure();
