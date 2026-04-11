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
      'botnet': 'join_the_botnet.exe'
    };
    title.textContent = titles[fileId] || fileId;
    
    viewer.classList.remove('hidden');
    // Scroll to viewer
    viewer.scrollIntoView({ behavior: 'smooth' });
  }
}

function closeFile() {
  const viewer = document.getElementById('file-viewer');
  viewer.classList.add('hidden');
  document.getElementById('file-content').innerHTML = '';
}

// ARG Terminal and Phase Logic
// phase 1: Pre-launch
// phase 2: EP Release
let currentPhase = 2; 

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

if (input && response) {
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const command = input.value.trim().toLowerCase();
      
      if (command === 'unlock --lamia') {
        response.style.color = '#00ff00';
        response.innerHTML = 'Access granted. <br>> Initializing hidden payload... <br>> [EXCLUSIVE CONTENT UNLOCKED]';
      } else if (command === 'help') {
        response.innerHTML = 'Available commands:<br>- help: show this message<br>- clear: clear terminal<br>- unlock --[REDACTED]: unlock hidden files';
      } else if (command === 'clear') {
        response.innerHTML = '';
        input.value = '';
        return;
      } else if (command === '') {
        response.innerHTML = '';
      } else {
        response.textContent = `Command not found: ${command}`;
        response.style.color = 'inherit';
      }
      
      input.value = '';
    }
  });
}
