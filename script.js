/* ============================================================
   CONFIG — unico punto da modificare per gli asset e la difficoltà
   ============================================================ */

// Immagine rivelata risolvendo memory_fragment.dll e video mostrato
// completando escape_vector.exe. Finché i file non esistono, i due
// minigiochi mostrano un messaggio "asset pending" invece di rompersi.
const MEMORY_REVEAL_SRC = 'img/reveal_0510.jpg';
const RUNNER_REWARD_SRC = 'video/reveal_0211.mp4';

// Vite del runner. Alzalo per rendere il percorso più accessibile.
const RUNNER_MAX_INTEGRITY = 3;

// NOTA: le scadenze dei countdown stanno negli attributi data-target
// di home.html, espresse in UTC per risultare identiche in ogni fuso.
// Conversione dall'ora italiana (il DST 2026 finisce il 25 ottobre):
//   05/10/2026 01:00 CEST (UTC+2) -> 2026-10-04T23:00:00Z
//   02/11/2026 01:00 CET  (UTC+1) -> 2026-11-02T00:00:00Z

const bgVideo = document.getElementById('bg-video');
if (bgVideo) {
  bgVideo.addEventListener('canplay', () => {
    bgVideo.classList.add('loaded');
  });
}

// File Viewer Logic
const FILE_TITLES = {
  'manifesto': 'manifesto.txt',
  'payload': 'lamia_payload.zip',
  'surveillance': 'surveillance_footage.mp4',
  'botnet': 'join_the_botnet.odt',
  'snake': 'bypass_firewall.exe',
  'memory': 'memory_fragment.dll',
  'runner': 'escape_vector.exe'
};

const FILE_INITS = {
  'snake': initSnakeGame,
  'memory': initMemoryGame,
  'runner': initRunnerGame
};

// Minigiochi sbloccati a codice: non sono file della directory, si
// aprono in un popup a tutto schermo.
const MODAL_GAMES = ['memory', 'runner'];

function openFile(fileId) {
  const viewer = document.getElementById('file-viewer');
  const content = document.getElementById('file-content');
  const title = document.getElementById('file-title');
  const template = document.getElementById(`tpl-${fileId}`);

  if (!template) return;

  // I minigiochi sbloccati non passano dal file-viewer inline
  if (MODAL_GAMES.includes(fileId)) {
    openGame(fileId);
    return;
  }

  // Un gioco potrebbe essere già in esecuzione: va fermato prima di
  // sostituire il contenuto del viewer.
  teardownActiveGame();

  content.innerHTML = template.innerHTML;
  title.textContent = FILE_TITLES[fileId] || fileId;

  viewer.classList.remove('hidden');
  // Scroll to viewer
  viewer.scrollIntoView({ behavior: 'smooth' });

  const init = FILE_INITS[fileId];
  if (init) init();
}

function closeFile() {
  const viewer = document.getElementById('file-viewer');
  viewer.classList.add('hidden');
  // Il teardown deve avvenire prima di svuotare il viewer, perché ha
  // ancora bisogno degli elementi (es. mettere in pausa il video).
  teardownActiveGame();
  document.getElementById('file-content').innerHTML = '';
}

/* ---------------- Popup dei minigiochi ---------------- */

function openGame(gameId) {
  const modal = document.getElementById('game-modal');
  const content = document.getElementById('game-modal-content');
  const title = document.getElementById('game-modal-title');
  const template = document.getElementById(`tpl-${gameId}`);
  if (!modal || !content || !template) return;

  // Impedisce di aprire un gioco chiamando openGame() dalla console
  // senza aver trovato la sequenza.
  if (!isFileUnlocked(gameId)) return;

  teardownActiveGame();

  content.innerHTML = template.innerHTML;
  if (title) title.textContent = FILE_TITLES[gameId] || gameId;

  modal.hidden = false;
  document.body.classList.add('modal-open');
  modal.scrollTop = 0;

  // Il popup si apre subito dopo aver digitato la sequenza: il focus è
  // ancora nell'input e i tasti del runner verrebbero ignorati da
  // isTyping(). Va spostato dentro il dialog.
  const box = modal.querySelector('.game-modal-box');
  if (box) box.focus();
  else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  const init = FILE_INITS[gameId];
  if (init) init();
}

function closeGameModal() {
  const modal = document.getElementById('game-modal');
  if (!modal || modal.hidden) return;
  // Il teardown va fatto prima di svuotare: serve ancora il DOM
  teardownActiveGame();
  document.getElementById('game-modal-content').innerHTML = '';
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

function initGameModal() {
  const modal = document.getElementById('game-modal');
  if (!modal) return;

  // Click sullo sfondo (non sul box) per chiudere
  modal.addEventListener('click', e => {
    if (e.target === modal) closeGameModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGameModal();
  });
}

// Ferma tutti i minigiochi e rimuove i loro listener globali.
function teardownActiveGame() {
  if (snakeGameInterval) {
    clearInterval(snakeGameInterval);
    snakeGameInterval = null;
  }
  if (snakeKeyHandler) {
    document.removeEventListener('keydown', snakeKeyHandler);
    snakeKeyHandler = null;
  }
  teardownMemoryGame();
  teardownRunnerGame();
}

/* ---------------- Helper condivisi ---------------- */

function pad(value, width) {
  return String(value).padStart(width, '0');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Verifica l'esistenza di un'immagine senza rompere la pagina se manca.
// Risolve con l'oggetto Image (per leggerne le proporzioni) oppure null.
function probeImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Come sopra per i video: risolve true/false.
function probeVideo(src) {
  return new Promise(resolve => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = src;
  });
}

// Colore corrente del tema. I canvas non risolvono var(), serve leggerlo.
function themeColor() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--cli-green').trim();
  return value || '#0f0';
}

// Suona SOLO quando una sequenza corretta sblocca qualcosa di nuovo.
// Volutamente non usato al termine dei minigiochi: era fastidioso.
// (l'altro punto in cui parte glitch.mp3 e' il bottone INJECT di
// index.html, gestito da inject.js)
function playGlitchStinger() {
  const glitch = document.getElementById('glitch-sound');
  if (!glitch) return;
  glitch.currentTime = 0;
  glitch.play().catch(e => console.log('Audio autoplay blocked', e));
}

// ARG Terminal and Phase Logic
// phase 1: Pre-launch
// phase 2: EP Release
let currentPhase = 2; 

function triggerVibration(pattern) {
  try {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  } catch (err) {
    console.log('Vibration not supported', err);
  }
}

/* ============================================================
   COUNTDOWN — trasmissioni in arrivo
   Un solo interval pilota entrambi gli orologi.
   ============================================================ */
const SCRAMBLE_CHARS = '0123456789ABCDEF#%&/\\|';

function formatRemaining(ms) {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `T-${pad(days, 3)}:${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
}

function scrambleDigits(text) {
  return text.replace(/[0-9]/g, () =>
    SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]);
}

function initCountdowns() {
  const clocks = Array.from(document.querySelectorAll('.signal-clock[data-target]'));
  if (!clocks.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const signals = clocks.map((clock, index) => ({
    clock: clock,
    signal: clock.closest('.signal'),
    target: new Date(clock.dataset.target).getTime(),
    // Sfasa lo scramble dei due orologi, così non si corrompono insieme
    scrambleOffset: index * 3
  })).filter(s => !isNaN(s.target));

  function tick() {
    const now = Date.now();

    signals.forEach(s => {
      const distance = s.target - now;

      if (distance <= 0) {
        s.clock.textContent = 'T-000:00:00:00';
        if (s.signal && !s.signal.classList.contains('acquired')) {
          s.signal.classList.add('acquired');
          const label = s.signal.querySelector('.signal-label');
          if (label) label.textContent = '◢ SIGNAL ACQUIRED ◣';
        }
        return;
      }

      const text = formatRemaining(distance);

      // Ogni 6 secondi le cifre si corrompono per un istante
      if (!reduceMotion && (Math.floor(now / 1000) + s.scrambleOffset) % 6 === 0) {
        s.clock.textContent = scrambleDigits(text);
        setTimeout(() => {
          const remaining = s.target - Date.now();
          if (remaining > 0) s.clock.textContent = formatRemaining(remaining);
        }, 130);
      } else {
        s.clock.textContent = text;
      }
    });
  }

  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   SEQUENZE DI SBLOCCO
   I codici sono le date dei countdown: 0510 e 0211.
   ============================================================ */
const SEQUENCES = {
  '0510': {
    file: 'memory',
    entryId: 'memory-entry',
    msg: 'FRAGMENT DECRYPTED. memory_fragment.dll MOUNTED.'
  },
  '0211': {
    file: 'runner',
    entryId: 'runner-entry',
    msg: 'TUNNEL OPEN. escape_vector.exe MOUNTED.'
  }
};

const UNLOCK_KEY = 'lamia_unlocked';

function getUnlocked() {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.log('localStorage non leggibile', err);
    return [];
  }
}

function isFileUnlocked(fileId) {
  const codes = getUnlocked();
  return Object.keys(SEQUENCES)
    .some(code => SEQUENCES[code].file === fileId && codes.includes(code));
}

/* ---------------- Canali cifrati ---------------- */
// I due canali sono sempre visibili ma illeggibili: il nome scorre come
// testo cifrato e si risolve solo con la sequenza giusta.
const CIPHER_CHARS = 'ABCDEF0123456789#%&/\\|^~*+=<>?@$';
let cipherInterval = null;

function cipherText(length) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
  }
  return out;
}

function lockedChannels() {
  return Array.from(document.querySelectorAll('.unlocked-btn.locked'));
}

function updateChannelsLabel() {
  const label = document.getElementById('unlocked-label');
  const block = document.getElementById('unlocked-block');
  if (!label || !block) return;

  const all = document.querySelectorAll('.unlocked-btn').length;
  const done = all - lockedChannels().length;

  label.textContent = done === 0
    ? '◢ ENCRYPTED CHANNELS ◣'
    : '◢ CHANNELS // ' + done + ' OF ' + all + ' DECRYPTED ◣';

  block.classList.toggle('has-decrypted', done > 0);
}

function initChannels() {
  const buttons = Array.from(document.querySelectorAll('.unlocked-btn'));
  if (!buttons.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Testo cifrato iniziale, della stessa lunghezza del nome in chiaro:
  // quando si decripta, la risoluzione carattere per carattere si vede.
  // Tag e hint bloccati vengono memorizzati per poterli ripristinare.
  buttons.forEach(btn => {
    const nameEl = btn.querySelector('.unlocked-btn-name');
    const tagEl = btn.querySelector('.unlocked-btn-tag');
    const hintEl = btn.querySelector('.unlocked-btn-hint');
    if (tagEl) btn.dataset.lockedTag = tagEl.textContent;
    if (hintEl) btn.dataset.lockedHint = hintEl.textContent;
    if (nameEl) nameEl.textContent = cipherText((btn.dataset.name || '').length);
  });

  if (!reduceMotion && !cipherInterval) {
    cipherInterval = setInterval(() => {
      lockedChannels().forEach(btn => {
        if (btn.classList.contains('decrypting')) return;
        const nameEl = btn.querySelector('.unlocked-btn-name');
        if (nameEl) nameEl.textContent = cipherText((btn.dataset.name || '').length);
      });
    }, 90);
  }

  updateChannelsLabel();
}

// animate = false ripristina lo stato al caricamento, senza effetti
function decryptChannel(code, animate) {
  const seq = SEQUENCES[code];
  if (!seq) return null;

  const btn = document.getElementById(seq.entryId);
  if (!btn || !btn.classList.contains('locked')) return btn;

  const nameEl = btn.querySelector('.unlocked-btn-name');
  const tagEl = btn.querySelector('.unlocked-btn-tag');
  const hintEl = btn.querySelector('.unlocked-btn-hint');
  const name = btn.dataset.name || '';

  function finish() {
    btn.classList.remove('locked', 'decrypting');
    btn.disabled = false;
    if (nameEl) nameEl.textContent = name;
    if (tagEl) tagEl.textContent = code;
    if (hintEl) hintEl.textContent = btn.dataset.hint || '';
    updateChannelsLabel();
  }

  if (!animate) {
    finish();
    return btn;
  }

  // I caratteri si fissano da sinistra a destra, il resto continua a
  // scorrere cifrato finché non viene raggiunto.
  btn.classList.add('decrypting');
  const stepMs = Math.max(30, Math.floor(700 / Math.max(1, name.length)));

  for (let i = 1; i <= name.length; i++) {
    setTimeout(() => {
      if (nameEl) nameEl.textContent = name.slice(0, i) + cipherText(name.length - i);
    }, i * stepMs);
  }
  setTimeout(finish, name.length * stepMs + 120);

  return btn;
}

// Ripristina i canali già decriptati al caricamento della pagina
function applyUnlocks() {
  getUnlocked().forEach(code => decryptChannel(code, false));
}

// Riporta tutto allo stato cifrato. Serve per provare il sito: una volta
// inserito il codice lo sblocco resta salvato nel browser per sempre.
// Si invoca col comando `purge` dal terminale ARG.
function relockChannels() {
  closeGameModal();

  try {
    localStorage.removeItem(UNLOCK_KEY);
    localStorage.removeItem(MEM_SOLVED_KEY);
    localStorage.removeItem(RUNNER_CLEARED_KEY);
  } catch (err) {
    console.log('localStorage non scrivibile', err);
  }

  document.querySelectorAll('.unlocked-btn').forEach(btn => {
    btn.classList.add('locked');
    btn.classList.remove('decrypting');
    btn.disabled = true;

    const nameEl = btn.querySelector('.unlocked-btn-name');
    const tagEl = btn.querySelector('.unlocked-btn-tag');
    const hintEl = btn.querySelector('.unlocked-btn-hint');
    if (nameEl) nameEl.textContent = cipherText((btn.dataset.name || '').length);
    if (tagEl) tagEl.textContent = btn.dataset.lockedTag || '????';
    if (hintEl) hintEl.textContent = btn.dataset.lockedHint || '[ENCRYPTED // KEY REQUIRED]';
  });

  updateChannelsLabel();
}

// Ritorna { ok, text } così sia il form che il terminale ARG possono
// riusare lo stesso esito con la propria formattazione.
function trySequence(code) {
  const seq = SEQUENCES[code];

  if (!seq) {
    return { ok: false, text: 'SEQUENCE REJECTED // ATTEMPT LOGGED' };
  }

  const unlocked = getUnlocked();

  if (unlocked.includes(code)) {
    decryptChannel(code, false);
    return { ok: true, text: 'CHANNEL ALREADY DECRYPTED.' };
  }

  unlocked.push(code);
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlocked));
  } catch (err) {
    console.log('localStorage non scrivibile', err);
  }

  playGlitchStinger();
  triggerVibration([400, 100, 400]);
  decryptChannel(code, true);

  // Il canale si apre in sovraimpressione appena finita la decifratura:
  // impossibile non accorgersi di averlo sbloccato.
  setTimeout(() => openGame(seq.file), 1300);

  return { ok: true, text: seq.msg };
}

function setSequenceFeedback(text, kind) {
  const el = document.getElementById('sequenceFeedback');
  if (!el) return;
  el.textContent = text;
  el.className = 'sequence-feedback' + (kind ? ' ' + kind : '');
}

function initSequenceForm() {
  const form = document.getElementById('sequenceForm');
  const input = document.getElementById('sequenceInput');
  if (!form || !input) return;

  // Il campo parte sempre vuoto: al ricaricamento i browser ripristinano il
  // valore precedente e la sequenza si autoinvierebbe senza che l'utente
  // abbia digitato nulla.
  input.value = '';

  function submitSequence() {
    const code = input.value.trim();
    if (!code) return;

    const result = trySequence(code);
    setSequenceFeedback(result.text, result.ok ? 'ok' : 'err');

    if (!result.ok) {
      form.classList.remove('rejected');
      void form.offsetWidth; // forza il restart dell'animazione
      form.classList.add('rejected');
    }

    input.value = '';
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    submitSequence();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSequence();
    }
  });

  // Nessun bottone di conferma: la sequenza parte al quarto carattere
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '');
    if (input.value.length === 4) submitSequence();
  });
}

// --- SNAKE GAME LOGIC ---
let snakeGameInterval;
// Riferimento al listener della tastiera, così teardownActiveGame() può
// rimuoverlo anche se il gioco viene chiuso a partita in corso.
let snakeKeyHandler = null;
let snakeHighScore = localStorage.getItem('lamia_snake_highscore') || 0;
let currentScore = 0;

// Default "Public" Leaderboard
const defaultLeaderboard = [
  { name: 'LAMIA', score: 50 },
  { name: 'UNKNOWN', score: 34 },
  { name: 'GHOST', score: 21 },
  { name: 'HACKER_99', score: 15 },
  { name: 'NOBODY', score: 8 }
];

function getLeaderboard() {
  const lb = localStorage.getItem('lamia_leaderboard');
  return lb ? JSON.parse(lb) : defaultLeaderboard;
}

function saveLeaderboard(lb) {
  localStorage.setItem('lamia_leaderboard', JSON.stringify(lb));
}

function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  let lb = getLeaderboard();
  lb.sort((a, b) => b.score - a.score);
  lb = lb.slice(0, 10);
  saveLeaderboard(lb);

  list.innerHTML = '';
  lb.forEach((entry, index) => {
    list.innerHTML += `<li><span>${index + 1}. ${entry.name}</span> <span>${entry.score}</span></li>`;
  });
}

window.submitScore = function() {
  const nameInput = document.getElementById('player-name');
  let name = nameInput.value.trim().toUpperCase();
  if (!name) name = 'ANON';
  
  let lb = getLeaderboard();
  lb.push({ name: name, score: currentScore });
  saveLeaderboard(lb);
  
  renderLeaderboard();
  document.getElementById('score-submit-section').style.display = 'none';
};

function initSnakeGame() {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const gridSize = 20;
  const tileCount = canvas.width / gridSize;
  
  let snake = [{x: 10, y: 10}];
  let velocity = {x: 0, y: 0};
  let dataPacket = {x: 15, y: 15};
  let enemies = [];
  let score = 0;
  currentScore = 0;
  let gameSpeed = 100;
  
  renderLeaderboard();
  
  document.getElementById('snake-highscore').innerText = snakeHighScore;
  document.getElementById('snake-score').innerText = score;
  document.getElementById('snake-gameover').classList.add('hidden');
  const submitSection = document.getElementById('score-submit-section');
  if (submitSection) submitSection.style.display = 'block';
  const nameInput = document.getElementById('player-name');
  if (nameInput) nameInput.value = '';
  
  if (snakeGameInterval) clearInterval(snakeGameInterval);

  // Controlli Tastiera
  function keyPush(e) {
    // Evita l'inversione di marcia e scroll della pagina
    if([37,38,39,40].indexOf(e.keyCode) > -1) {
      e.preventDefault();
    }
    if (e.keyCode === 37 && velocity.x !== 1) velocity = {x: -1, y: 0}; // Left
    if (e.keyCode === 38 && velocity.y !== 1) velocity = {x: 0, y: -1}; // Up
    if (e.keyCode === 39 && velocity.x !== -1) velocity = {x: 1, y: 0}; // Right
    if (e.keyCode === 40 && velocity.y !== -1) velocity = {x: 0, y: 1}; // Down
  }
  if (snakeKeyHandler) document.removeEventListener('keydown', snakeKeyHandler);
  snakeKeyHandler = keyPush;
  document.addEventListener('keydown', keyPush);

  // Controlli Swipe (Mobile)
  let touchStartX = 0;
  let touchStartY = 0;
  canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, {passive: true});

  canvas.addEventListener('touchend', e => {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) { // Movimento orizzontale
      if (dx > 0 && velocity.x !== -1) velocity = {x: 1, y: 0}; // Right
      else if (dx < 0 && velocity.x !== 1) velocity = {x: -1, y: 0}; // Left
    } else { // Movimento verticale
      if (dy > 0 && velocity.y !== -1) velocity = {x: 0, y: 1}; // Down
      else if (dy < 0 && velocity.y !== 1) velocity = {x: 0, y: -1}; // Up
    }
  }, {passive: true});

  function spawnData() {
    dataPacket = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
  }

  function spawnEnemy() {
    enemies.push({
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    });
  }

  function gameLoop() {
    // Movimento
    let nextX = snake[0].x + velocity.x;
    let nextY = snake[0].y + velocity.y;
    
    // Attraversamento dei muri
    if (nextX < 0) nextX = tileCount - 1;
    if (nextX >= tileCount) nextX = 0;
    if (nextY < 0) nextY = tileCount - 1;
    if (nextY >= tileCount) nextY = 0;
    
    // Check Collisione con se stesso
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === nextX && snake[i].y === nextY && (velocity.x !== 0 || velocity.y !== 0)) {
        gameOver();
        return;
      }
    }
    
    // Check collisione con Antivirus (nemici)
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].x === nextX && enemies[i].y === nextY) {
        gameOver();
        return;
      }
    }

    snake.unshift({x: nextX, y: nextY});

    // Check mangia Dati Sensibili
    if (nextX === dataPacket.x && nextY === dataPacket.y) {
      score++;
      document.getElementById('snake-score').innerText = score;
      triggerVibration(50); // Piccola vibrazione su mobile
      spawnData();
      
      // Ogni 5 punti spawna un nuovo nemico e aumenta la velocità
      if (score % 5 === 0) {
        spawnEnemy();
        gameSpeed = Math.max(50, gameSpeed - 10);
        clearInterval(snakeGameInterval);
        snakeGameInterval = setInterval(gameLoop, gameSpeed);
      }
    } else {
      snake.pop(); // Rimuove la coda se non ha mangiato
    }

    draw();
  }

  function draw() {
    // Sfondo
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dati Sensibili (Punto)
    ctx.fillStyle = '#fff';
    ctx.fillRect(dataPacket.x * gridSize, dataPacket.y * gridSize, gridSize - 2, gridSize - 2);

    // Antivirus (Nemici rossi)
    ctx.fillStyle = '#ff0000';
    for (let i = 0; i < enemies.length; i++) {
      ctx.fillRect(enemies[i].x * gridSize, enemies[i].y * gridSize, gridSize - 2, gridSize - 2);
    }

    // Virus LAMIA (Snake)
    ctx.fillStyle = 'var(--cli-green, #0f0)';
    for (let i = 0; i < snake.length; i++) {
      ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
    }
  }

  function gameOver() {
    clearInterval(snakeGameInterval);
    snakeGameInterval = null;
    document.removeEventListener('keydown', keyPush);
    snakeKeyHandler = null;
    triggerVibration([200, 100, 200]);
    document.getElementById('snake-gameover').classList.remove('hidden');
    
    currentScore = score;
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.innerText = score;
    
    const submitSection = document.getElementById('score-submit-section');
    if (submitSection) {
      if (score === 0) {
        submitSection.style.display = 'none'; // Don't allow submit for 0 score
      } else {
        submitSection.style.display = 'block';
      }
    }
    
    if (score > snakeHighScore) {
      snakeHighScore = score;
      localStorage.setItem('lamia_snake_highscore', snakeHighScore);
      document.getElementById('snake-highscore').innerText = snakeHighScore;
    }
  }

  // Loop iniziale
  snakeGameInterval = setInterval(gameLoop, gameSpeed);
}

/* ============================================================
   MEMORY — memory_fragment.dll (sequenza 0510)
   Otto coppie di byte corrotti. Risolte tutte, l'immagine nascosta
   si riassembla a mosaico dalle sedici celle della griglia.
   ============================================================ */
// 6 coppie su griglia 4x3. Per cambiare difficoltà basta aggiungere o
// togliere glifi e adeguare MEM_COLS/MEM_ROWS: cols * rows = glifi * 2.
const MEM_GLYPHS = ['Λ', '◣', '▓', '⌬', '⧉', '⨂'];
const MEM_COLS = 4;
const MEM_ROWS = 3;
const MEM_PEEK_MS = 1800; // anteprima iniziale di tutte le tessere
const MEM_SOLVED_KEY = 'lamia_memory_solved';

let memTimeouts = [];
let memLocked = false;
let memFirst = null;
let memPairs = 0;
let memMoves = 0;

// Tutti i timer del memory passano da qui, così il teardown li azzera
function memTimeout(fn, delay) {
  const id = setTimeout(fn, delay);
  memTimeouts.push(id);
  return id;
}

function teardownMemoryGame() {
  memTimeouts.forEach(clearTimeout);
  memTimeouts = [];
  memLocked = false;
  memFirst = null;
}

function initMemoryGame() {
  const grid = document.getElementById('mem-grid');
  if (!grid) return;

  teardownMemoryGame();
  memPairs = 0;
  memMoves = 0;

  const stage = document.querySelector('.mem-stage');
  const mosaic = document.getElementById('mem-mosaic');
  const reveal = document.getElementById('mem-reveal');
  const viewBtn = document.getElementById('mem-view');

  if (stage) {
    stage.style.setProperty('--mem-cols', MEM_COLS);
    stage.style.setProperty('--mem-rows', MEM_ROWS);
    stage.style.setProperty('--mem-ar', MEM_COLS + ' / ' + MEM_ROWS);
  }
  if (mosaic) {
    mosaic.classList.add('hidden');
    mosaic.innerHTML = '';
  }
  if (reveal) reveal.classList.add('hidden');
  grid.classList.remove('faded');

  document.getElementById('mem-moves').textContent = '0';
  document.getElementById('mem-pairs').textContent = '0';
  document.getElementById('mem-total').textContent = MEM_GLYPHS.length;

  // Chi ha già risolto il memory può rivedere il frammento senza rigiocare
  if (viewBtn) viewBtn.hidden = localStorage.getItem(MEM_SOLVED_KEY) !== '1';

  const deck = shuffle(MEM_GLYPHS.concat(MEM_GLYPHS));
  grid.innerHTML = '';

  const tiles = [];
  deck.forEach(glyph => {
    const tile = document.createElement('button');
    tile.className = 'mem-tile';
    tile.type = 'button';
    tile.dataset.glyph = glyph;
    tile.setAttribute('aria-label', 'Corrupted sector');
    tile.innerHTML =
      '<span class="mem-inner">' +
        '<span class="mem-face mem-back">▚</span>' +
        '<span class="mem-face mem-front">' + glyph + '</span>' +
      '</span>';
    tile.addEventListener('click', () => flipMemTile(tile));
    grid.appendChild(tile);
    tiles.push(tile);
  });

  // Anteprima: le tessere si mostrano tutte per un istante prima di
  // coprirsi. Rende il gioco molto più accessibile.
  memLocked = true;
  tiles.forEach(t => t.classList.add('flipped'));
  memTimeout(() => {
    tiles.forEach(t => t.classList.remove('flipped'));
    memLocked = false;
  }, MEM_PEEK_MS);
}

function flipMemTile(tile) {
  if (memLocked || tile.classList.contains('flipped')) return;

  tile.classList.add('flipped');

  if (!memFirst) {
    memFirst = tile;
    return;
  }

  memMoves++;
  document.getElementById('mem-moves').textContent = memMoves;

  const first = memFirst;
  memFirst = null;

  if (first.dataset.glyph === tile.dataset.glyph) {
    first.classList.add('matched');
    tile.classList.add('matched');
    memPairs++;
    document.getElementById('mem-pairs').textContent = memPairs;
    triggerVibration(40);

    if (memPairs === MEM_GLYPHS.length) {
      memTimeout(solveMemoryGame, 650);
    }
    return;
  }

  // Coppia sbagliata: si richiudono dopo una pausa
  memLocked = true;
  memTimeout(() => {
    first.classList.remove('flipped');
    tile.classList.remove('flipped');
    memLocked = false;
  }, 750);
}

function solveMemoryGame() {
  try {
    localStorage.setItem(MEM_SOLVED_KEY, '1');
  } catch (err) {
    console.log('localStorage non scrivibile', err);
  }
  triggerVibration([200, 80, 200]);
  showMemoryReveal();
}

function showMemoryReveal() {
  const grid = document.getElementById('mem-grid');
  const stage = document.querySelector('.mem-stage');
  const mosaic = document.getElementById('mem-mosaic');
  const reveal = document.getElementById('mem-reveal');
  const msg = document.getElementById('mem-reveal-msg');
  const viewBtn = document.getElementById('mem-view');
  if (!grid || !stage || !mosaic || !reveal || !msg) return;

  if (viewBtn) viewBtn.hidden = true;
  reveal.classList.remove('hidden');

  probeImage(MEMORY_REVEAL_SRC).then(img => {
    if (!img) {
      // L'immagine non è ancora stata caricata sul sito
      msg.className = 'mem-reveal-msg asset-pending';
      msg.textContent = '[ASSET NOT FOUND // ' + MEMORY_REVEAL_SRC + ' PENDING]';
      return;
    }

    msg.className = 'mem-reveal-msg';
    msg.textContent = 'Sectors realigned. One image. Nothing here is an accident.';

    // Il mosaico assume le proporzioni reali dell'immagine. La griglia
    // sottostante si deforma con esso, ma a quel punto è già invisibile.
    stage.style.setProperty('--mem-ar', img.naturalWidth + ' / ' + img.naturalHeight);
    grid.classList.add('faded');

    const total = MEM_COLS * MEM_ROWS;
    // Ogni cella mostra 1/(cols*rows) dell'immagine: la colonna n va
    // posizionata a n * 100 / (cols - 1) per cento, idem per le righe.
    const colStep = 100 / (MEM_COLS - 1);
    const rowStep = 100 / (MEM_ROWS - 1);
    const cells = [];

    mosaic.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.className = 'mem-cell';
      cell.style.backgroundImage = 'url("' + MEMORY_REVEAL_SRC + '")';
      cell.style.backgroundPosition =
        (i % MEM_COLS) * colStep + '% ' +
        Math.floor(i / MEM_COLS) * rowStep + '%';
      mosaic.appendChild(cell);
      cells.push(cell);
    }
    mosaic.classList.remove('hidden');

    // Riassemblaggio in ordine casuale, una cella ogni 70ms
    shuffle(cells.map((_, i) => i)).forEach((cellIndex, n) => {
      memTimeout(() => cells[cellIndex].classList.add('on'), 300 + n * 70);
    });
  });
}

/* ============================================================
   RUNNER — escape_vector.exe (sequenza 0211)
   Percorso a lunghezza fissa, non infinito: la tabella di ostacoli è
   sempre la stessa, quindi il tracciato è imparabile e battibile.
   ============================================================ */
const RUNNER_CLEARED_KEY = 'lamia_runner_cleared';
const RUNNER_COURSE_LENGTH = 6400; // pixel di percorso
const RUNNER_GROUND_Y = 186;
const RUNNER_PLAYER_X = 80;
const RUNNER_JUMP_V = 430;   // impulso iniziale di salto (px/s)
const RUNNER_G_HOLD = 950;   // gravità mentre si tiene premuto (salto alto)
const RUNNER_G_FALL = 2000;  // gravità al rilascio e in discesa (salto corto)

const RUNNER_OBSTACLES = {
  low:  { w: 18, h: 28 },
  high: { w: 18, h: 46 },
  wide: { w: 46, h: 24 }
};

const RUNNER_COURSE = [
  { at: 700,  type: 'low'  },
  { at: 1000, type: 'low'  },
  { at: 1400, type: 'high' },
  { at: 1780, type: 'wide' },
  { at: 2100, type: 'low'  },
  { at: 2340, type: 'low'  },
  { at: 2700, type: 'high' },
  { at: 3000, type: 'low'  },
  { at: 3230, type: 'low'  },
  { at: 3460, type: 'low'  },
  { at: 3800, type: 'wide' },
  { at: 4100, type: 'high' },
  { at: 4340, type: 'low'  },
  { at: 4650, type: 'wide' },
  { at: 4900, type: 'low'  },
  { at: 5150, type: 'high' },
  { at: 5400, type: 'low'  },
  { at: 5630, type: 'low'  },
  { at: 5860, type: 'wide' }
];

let runnerRaf = null;
let runnerListeners = [];
let runnerActive = false;

function teardownRunnerGame() {
  if (runnerRaf) {
    cancelAnimationFrame(runnerRaf);
    runnerRaf = null;
  }
  runnerActive = false;

  runnerListeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
  runnerListeners = [];

  // Se il video premio era in riproduzione, il drone di sottofondo era
  // stato messo in pausa: va ripreso.
  const video = document.getElementById('runner-video');
  if (video) video.pause();
  resumeDrone();
}

function runnerListen(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  runnerListeners.push([target, type, fn]);
}

function initRunnerGame() {
  const canvas = document.getElementById('runner-canvas');
  if (!canvas) return;

  teardownRunnerGame();

  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('runner-overlay');
  const integrityEl = document.getElementById('runner-integrity');
  const distanceEl = document.getElementById('runner-distance');
  const progressBar = document.getElementById('runner-progress-bar');
  const reward = document.getElementById('runner-reward');
  const viewBtn = document.getElementById('runner-view');

  if (overlay) overlay.classList.add('hidden');
  if (reward) reward.classList.add('hidden');
  // Chi ha già completato il percorso può rivedere la trasmissione
  if (viewBtn) viewBtn.hidden = localStorage.getItem(RUNNER_CLEARED_KEY) !== '1';

  let worldX = 0;
  let integrity = RUNNER_MAX_INTEGRITY;
  let invulnUntil = 0;
  let elapsed = 0;
  let playerY = 0;      // altezza sopra il terreno
  let playerVy = 0;
  let onGround = true;
  let jumpHeld = false;
  let finished = false;

  runnerActive = true;

  function updateHud() {
    const progress = Math.min(1, worldX / RUNNER_COURSE_LENGTH);
    if (distanceEl) distanceEl.textContent = Math.floor(progress * 100);
    if (progressBar) progressBar.style.width = (progress * 100) + '%';
    if (integrityEl) integrityEl.textContent = '#'.repeat(Math.max(0, integrity)) || '-';
  }

  function requestJump() {
    if (!runnerActive || finished || !onGround) return;
    playerVy = -RUNNER_JUMP_V;
    onGround = false;
    triggerVibration(20);
  }

  function isTyping() {
    const el = document.activeElement;
    return !!el && /^(INPUT|TEXTAREA)$/.test(el.tagName);
  }

  function onKeyDown(e) {
    if (isTyping()) return; // non rubare i tasti al terminale ARG
    if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' ||
        e.key === 'w' || e.key === 'W') {
      if (runnerActive) e.preventDefault();
      jumpHeld = true;
      requestJump();
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' ||
        e.key === 'w' || e.key === 'W') {
      jumpHeld = false;
    }
  }

  runnerListen(document, 'keydown', onKeyDown);
  runnerListen(document, 'keyup', onKeyUp);
  runnerListen(canvas, 'touchstart', e => {
    e.preventDefault();
    jumpHeld = true;
    requestJump();
  });
  runnerListen(canvas, 'touchend', () => { jumpHeld = false; });
  runnerListen(canvas, 'mousedown', () => { jumpHeld = true; requestJump(); });
  runnerListen(canvas, 'mouseup', () => { jumpHeld = false; });

  function currentSpeed() {
    // Accelera lentamente lungo il percorso: 260 -> 350 px/s
    return 260 + 90 * Math.min(1, worldX / RUNNER_COURSE_LENGTH);
  }

  function hits(obstacle) {
    const spec = RUNNER_OBSTACLES[obstacle.type];
    const obstacleX = RUNNER_PLAYER_X + (obstacle.at - worldX);
    // Hitbox rientrata di 2px per lato: qualche pixel di tolleranza
    const boxX = RUNNER_PLAYER_X + 2;
    const boxW = 10;
    const feet = RUNNER_GROUND_Y - playerY;

    // Gli ostacoli poggiano tutti a terra: basta verificare che i piedi
    // dell'omino non siano più alti della cima dell'ostacolo.
    return obstacleX < boxX + boxW &&
           obstacleX + spec.w > boxX &&
           feet > RUNNER_GROUND_Y - spec.h;
  }

  function takeHit() {
    integrity--;
    invulnUntil = elapsed + 1.2;
    triggerVibration([160, 60, 160]);
    updateHud();
    if (integrity <= 0) runnerLose();
  }

  function runnerLose() {
    finished = true;
    runnerActive = false;
    if (runnerRaf) {
      cancelAnimationFrame(runnerRaf);
      runnerRaf = null;
    }
    showRunnerOverlay('PROCESS TERMINATED',
      'The firewall shredded the packet at ' + Math.floor(worldX / RUNNER_COURSE_LENGTH * 100) + '% of the vector.',
      false);
  }

  function runnerWin() {
    finished = true;
    runnerActive = false;
    if (runnerRaf) {
      cancelAnimationFrame(runnerRaf);
      runnerRaf = null;
    }
    try {
      localStorage.setItem(RUNNER_CLEARED_KEY, '1');
    } catch (err) {
      console.log('localStorage non scrivibile', err);
    }
    triggerVibration([120, 60, 120, 60, 300]);
    showRunnerOverlay('VECTOR CLEARED',
      'The tunnel ends here. Something came through with you.', true);
    showRunnerReward();
  }

  function draw() {
    const color = themeColor();
    const progress = Math.min(1, worldX / RUNNER_COURSE_LENGTH);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rack server in parallasse sul fondo
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    const parallax = (worldX * 0.35) % 180;
    for (let i = -1; i < 6; i++) {
      const x = i * 180 - parallax;
      const h = 40 + ((i + 10) % 3) * 22;
      ctx.fillRect(x, RUNNER_GROUND_Y - h, 60, h);
      ctx.fillRect(x + 74, RUNNER_GROUND_Y - h * 0.6, 38, h * 0.6);
    }
    ctx.globalAlpha = 1;

    // Terreno
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, RUNNER_GROUND_Y + 1);
    ctx.lineTo(canvas.width, RUNNER_GROUND_Y + 1);
    ctx.stroke();

    // Tratteggio che scorre sotto il terreno
    ctx.globalAlpha = 0.5;
    const dashOffset = worldX % 40;
    for (let x = -dashOffset; x < canvas.width; x += 40) {
      ctx.fillRect(x, RUNNER_GROUND_Y + 10, 20, 2);
    }
    ctx.globalAlpha = 1;

    // Ostacoli visibili
    RUNNER_COURSE.forEach(obstacle => {
      const spec = RUNNER_OBSTACLES[obstacle.type];
      const x = RUNNER_PLAYER_X + (obstacle.at - worldX);
      if (x < -spec.w || x > canvas.width) return;

      ctx.fillStyle = '#ff0033';
      ctx.fillRect(x, RUNNER_GROUND_Y - spec.h, spec.w, spec.h);
      ctx.fillStyle = '#050505';
      for (let y = RUNNER_GROUND_Y - spec.h + 5; y < RUNNER_GROUND_Y - 3; y += 8) {
        ctx.fillRect(x + 3, y, spec.w - 6, 2);
      }
    });

    // Uscita del tunnel
    const exitX = RUNNER_PLAYER_X + (RUNNER_COURSE_LENGTH - worldX);
    if (exitX < canvas.width + 40) {
      ctx.strokeStyle = color;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(exitX, 20);
      ctx.lineTo(exitX, RUNNER_GROUND_Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '20px "VT323", monospace';
      ctx.fillText('EXIT', exitX + 6, 34);
    }

    // L'omino. Lampeggia durante l'invulnerabilità post-impatto
    const blinking = elapsed < invulnUntil && Math.floor(elapsed * 12) % 2 === 0;
    if (!blinking) {
      const feet = RUNNER_GROUND_Y - playerY;
      // Bianco, non il colore del tema: in fase 2 il tema è #ff0033,
      // identico agli ostacoli, e l'omino sarebbe indistinguibile.
      ctx.fillStyle = '#fff';
      ctx.fillRect(RUNNER_PLAYER_X + 3, feet - 26, 8, 8);    // testa
      ctx.fillRect(RUNNER_PLAYER_X + 4, feet - 18, 6, 11);   // corpo

      if (onGround) {
        // Ciclo di corsa: le gambe alternano in base alla distanza
        const stride = Math.floor(worldX / 12) % 2 === 0;
        ctx.fillRect(RUNNER_PLAYER_X + (stride ? 0 : 4), feet - 7, 4, 7);
        ctx.fillRect(RUNNER_PLAYER_X + (stride ? 9 : 6), feet - 7, 4, 7);
      } else {
        // In aria: gambe raccolte
        ctx.fillRect(RUNNER_PLAYER_X + 1, feet - 7, 5, 5);
        ctx.fillRect(RUNNER_PLAYER_X + 8, feet - 7, 5, 5);
      }
    }
  }

  let lastTime = null;

  function loop(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    // Clamp del delta: evita salti enormi se la tab torna in primo piano
    const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    elapsed += dt;

    worldX += currentSpeed() * dt;

    // Gravità variabile: tenere premuto durante la salita allunga il salto
    if (!onGround) {
      const gravity = (playerVy < 0 && jumpHeld) ? RUNNER_G_HOLD : RUNNER_G_FALL;
      playerVy += gravity * dt;
      playerY -= playerVy * dt;

      if (playerY <= 0) {
        playerY = 0;
        playerVy = 0;
        onGround = true;
      }
    }

    if (elapsed >= invulnUntil) {
      const hit = RUNNER_COURSE.find(hits);
      if (hit) takeHit();
    }

    updateHud();
    draw();

    if (finished) return;

    if (worldX >= RUNNER_COURSE_LENGTH) {
      runnerWin();
      return;
    }

    runnerRaf = requestAnimationFrame(loop);
  }

  updateHud();
  draw();
  runnerRaf = requestAnimationFrame(loop);
}

function showRunnerOverlay(title, message, isWin) {
  const overlay = document.getElementById('runner-overlay');
  const titleEl = document.getElementById('runner-overlay-title');
  const msgEl = document.getElementById('runner-overlay-msg');
  const retryBtn = document.getElementById('runner-retry');
  if (!overlay) return;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (retryBtn) retryBtn.textContent = isWin ? 'RUN IT AGAIN' : 'REBOOT PROCESS';
  overlay.classList.toggle('win', !!isWin);
  overlay.classList.remove('hidden');
}

function showRunnerReward() {
  const reward = document.getElementById('runner-reward');
  const msg = document.getElementById('runner-reward-msg');
  const video = document.getElementById('runner-video');
  const viewBtn = document.getElementById('runner-view');
  if (!reward || !msg || !video) return;

  if (viewBtn) viewBtn.hidden = true;
  reward.classList.remove('hidden');

  probeVideo(RUNNER_REWARD_SRC).then(exists => {
    if (!exists) {
      // Il video non è ancora stato caricato sul sito
      video.classList.add('hidden');
      msg.className = 'runner-reward-msg asset-pending';
      msg.textContent = '[BROADCAST NOT YET LIVE // ' + RUNNER_REWARD_SRC + ' PENDING]';
      return;
    }

    video.classList.remove('hidden');
    msg.className = 'runner-reward-msg';
    msg.textContent = 'Recording intercepted. Playback authorised.';
    bindRewardVideoAudio(video);
    video.play().catch(e => console.log('Video autoplay blocked', e));
    reward.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ---------------- Priorita' audio ----------------
   Il drone di sottofondo e' in loop e ha `autoplay`: mentre un video del
   sito e' in riproduzione deve tacere, altrimenti i due audio si
   sovrappongono. Un solo punto di verita' interrogato da tutti i punti
   che potrebbero far ripartire il drone. */

// Copre il video premio del runner e qualunque video futuro aggiunto nel
// popup o nel file viewer. Esclude #bg-video, che e' muto.
function isSiteVideoPlaying() {
  const videos = document.querySelectorAll('#game-modal video, #file-viewer video');
  return Array.from(videos).some(v => !v.paused && !v.ended);
}

function stopDrone() {
  const drone = document.getElementById('drone-sound');
  if (drone && !drone.paused) drone.pause();
}

// Rete di sicurezza: qualunque cosa faccia ripartire il drone (autoplay
// tardivo, primo click dell'utente, ritorno in primo piano, codice
// futuro), se un video sta suonando il drone viene rimesso in pausa.
function guardDroneAudio() {
  const drone = document.getElementById('drone-sound');
  if (!drone) return;
  drone.addEventListener('play', () => {
    if (isSiteVideoPlaying()) drone.pause();
  });
}

function bindRewardVideoAudio(video) {
  if (video.dataset.audioBound === '1') return;
  video.dataset.audioBound = '1';

  // `play` scatta alla richiesta, `playing` quando parte davvero
  video.addEventListener('play', stopDrone);
  video.addEventListener('playing', stopDrone);
  video.addEventListener('pause', resumeDrone);
  video.addEventListener('ended', resumeDrone);
}

function resumeDrone() {
  const drone = document.getElementById('drone-sound');
  if (!drone || !drone.paused) return;
  // Solo se l'utente ha già interagito, altrimenti il browser blocca
  if (!userInteracted || document.hidden) return;
  // Il video ha la precedenza sul sottofondo
  if (isSiteVideoPlaying()) return;
  drone.play().catch(e => console.log('Resume audio blocked', e));
}

function initPhase() {
  const systemPhaseText = document.getElementById('systemPhase');
  const directoryList = document.querySelector('.directory-list');
  const argTerminal = document.querySelector('.arg-terminal');

  if (!systemPhaseText) return;

  if (currentPhase === 1) {
    systemPhaseText.textContent = "System status: INFECTION PENDING... 23%";
    systemPhaseText.style.color = "var(--cli-green)";
    document.querySelector('.terminal-header h1').textContent = "LAMIA_OS // AWAITING PAYLOAD";
    document.documentElement.style.setProperty('--cli-green', '#0f0');
    
    // Nasconde la directory: il countdown vero è ora il blocco .signal-block,
    // sempre visibile in cima alla pagina.
    // ATTENZIONE: tornando a currentPhase = 1 le voci sbloccate dalle sequenze
    // resterebbero invisibili, perché il loro contenitore .directory-list è
    // nascosto. Se serve la fase 1 con i minigiochi attivi, nascondere qui le
    // singole voci pubbliche invece di tutta la lista.
    if (directoryList) directoryList.style.display = 'none';
    if (argTerminal) argTerminal.style.display = 'none';

  } else if (currentPhase === 2) {
    systemPhaseText.textContent = "System status: COMPROMISED";
    systemPhaseText.style.color = "#ff0000";
    document.querySelector('.terminal-header h1').textContent = "LAMIA_OS // ROOT ACCESS GRANTED";
    document.documentElement.style.setProperty('--cli-green', '#ff0033'); // Glitch red interface
  }
}

initPhase();
initCountdowns();
initChannels();
applyUnlocks();
initSequenceForm();
initGameModal();
guardDroneAudio();

const input = document.getElementById('commandInput');
const response = document.getElementById('response');

// Start drone sound on first interaction
let userInteracted = false;
function startDrone() {
  userInteracted = true;
  // I tre listener `once` (click/keydown/touchstart) sono indipendenti:
  // uno puo' restare armato e scattare mentre il video sta suonando.
  if (isSiteVideoPlaying()) return;
  const drone = document.getElementById('drone-sound');
  if (drone && drone.paused && !document.hidden) {
    drone.play().catch(e => console.log('Audio autoplay blocked', e));
  }
}
document.body.addEventListener('click', startDrone, { once: true });
document.body.addEventListener('keydown', startDrone, { once: true });
document.body.addEventListener('touchstart', startDrone, { once: true });

// Handle Page Visibility API (Background/Foreground Audio & Video Pause)
document.addEventListener("visibilitychange", () => {
  const drone = document.getElementById('drone-sound');
  const bgVideo = document.getElementById('bg-video');
  
  if (document.hidden) {
    // La pagina va in background o tab non attiva
    if (drone) drone.pause();
    if (bgVideo) bgVideo.pause();
  } else {
    // La pagina torna in primo piano.
    // Il drone non riparte se un video del sito è in riproduzione.
    if (drone && userInteracted && !isSiteVideoPlaying()) {
      drone.play().catch(e => console.log('Resume audio blocked', e));
    }
    if (bgVideo) {
      bgVideo.play().catch(e => console.log('Resume video blocked', e));
    }
  }
});

if (input && response) {
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const command = input.value.trim().toLowerCase();
      response.style.color = 'inherit';

      // Le sequenze a 4 cifre vanno intercettate prima del SYNTAX ERROR
      if (/^\d{4}$/.test(command)) {
        const result = trySequence(command);
        response.style.color = result.ok ? '#00ff00' : '#ff0033';
        response.textContent = result.text;
      } else if (command === 'purge') {
        // Rimette tutti i canali sotto cifratura. Fuori da `help`: serve
        // per provare il sito, non è parte del gioco.
        relockChannels();
        response.style.color = '#00ff00';
        response.textContent = 'ALL CHANNELS RE-ENCRYPTED. KEYS WIPED.';
      } else if (command === 'unlock --lamia') {
        response.style.color = '#00ff00';
        response.innerHTML = 'Access granted. <br>> Initializing hidden payload... <br>> [EXCLUSIVE CONTENT UNLOCKED]';
      } else if (command === 'help') {
        response.innerHTML = 'Available commands:<br>- whois lamia<br>- clear<br>- unlock --[REDACTED]';
      } else if (command === 'whois lamia') {
        response.style.color = '#00ff00';
        response.innerHTML = 'LAMIA is an ancient entity. LAMIA is a viral signal. LAMIA is everywhere.';
      } else if (command === 'clear') {
        response.innerHTML = '';
        input.value = '';
        return;
      } else if (command === '') {
        response.innerHTML = '';
      } else {
        response.style.color = '#ff0000';
        response.textContent = 'SYNTAX ERROR. THE SYSTEM IS WATCHING YOU.';
      }
      
      input.value = '';
    }
  });
}
