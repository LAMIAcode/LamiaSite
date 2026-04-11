const bgVideo = document.getElementById('bg-video');
if (bgVideo) {
  bgVideo.addEventListener('canplay', () => {
    bgVideo.classList.add('loaded');
  });
}

// File Viewer Logic
function openFile(fileId) {
  const viewer = document.getElementById('file-viewer');
  const content = document.getElementById('file-content');
  const title = document.getElementById('file-title');
  const template = document.getElementById(`tpl-${fileId}`);

  if (template) {
    content.innerHTML = template.innerHTML;
    
    // Set appropriate title
    const titles = {
      'manifesto': 'manifesto.txt',
      'payload': 'lamia_payload.zip',
      'surveillance': 'surveillance_footage.mp4',
      'botnet': 'join_the_botnet.odt',
      'snake': 'bypass_firewall.exe'
    };
    title.textContent = titles[fileId] || fileId;
    
    viewer.classList.remove('hidden');
    // Scroll to viewer
    viewer.scrollIntoView({ behavior: 'smooth' });

    // Initialize Snake if opened
    if (fileId === 'snake') {
      initSnakeGame();
    }
  }
}

function closeFile() {
  const viewer = document.getElementById('file-viewer');
  viewer.classList.add('hidden');
  document.getElementById('file-content').innerHTML = '';
  
  // Stop snake game loop if running
  if (snakeGameInterval) {
    clearInterval(snakeGameInterval);
    snakeGameInterval = null;
  }
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

// --- SNAKE GAME LOGIC ---
let snakeGameInterval;
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
    document.removeEventListener('keydown', keyPush);
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
    
    // Hide directory and show countdown
    if (directoryList) directoryList.style.display = 'none';
    if (argTerminal) argTerminal.style.display = 'none';

    const countdownDiv = document.createElement('div');
    countdownDiv.id = 'countdown';
    countdownDiv.style.fontSize = '2rem';
    countdownDiv.style.marginTop = '40px';
    document.querySelector('.terminal-container').appendChild(countdownDiv);

    const launchDate = new Date().getTime() + (7 * 24 * 60 * 60 * 1000); // 7 days from now
    setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate - now;
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      countdownDiv.textContent = `T-MINUS: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);

  } else if (currentPhase === 2) {
    systemPhaseText.textContent = "System status: COMPROMISED";
    systemPhaseText.style.color = "#ff0000";
    document.querySelector('.terminal-header h1').textContent = "LAMIA_OS // ROOT ACCESS GRANTED";
    document.documentElement.style.setProperty('--cli-green', '#ff0033'); // Glitch red interface
  }
}

initPhase();

const input = document.getElementById('commandInput');
const response = document.getElementById('response');

// Start drone sound on first interaction
let userInteracted = false;
function startDrone() {
  userInteracted = true;
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
    // La pagina torna in primo piano
    if (drone && userInteracted) {
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
      
      if (command === 'unlock --lamia') {
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
