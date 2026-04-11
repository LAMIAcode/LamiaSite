
// phase 1: Pre-launch
// phase 2: EP Release
const currentPhase = 2; // Mantieni sincronizzato con script.js

const btn = document.getElementById('injectBtn');
const output = document.getElementById('consoleOutput');
const statusText = document.getElementById('statusText');

// Set initial text based on phase
if (currentPhase === 1) {
  statusText.textContent = 'System status: INFECTION PENDING... 23%';
} else {
  statusText.textContent = 'System status: READY TO COMPROMISE';
}

const messages = [
  'Bypassing USAF security... [OK]',
  'Extracting lamia.dll... [OK]',
  'Executing payload... [OK]',
  'Welcome to the Swarm.'
];

btn.addEventListener('click', () => {
  btn.style.display = 'none'; // hide button
  statusText.textContent = 'System status: COMPROMISING...';
  statusText.classList.add('glitch-text');

  // Suono e vibrazione
  const glitchSound = document.getElementById('glitch-sound');
  if (glitchSound) glitchSound.play().catch(e => console.log('Audio autoplay blocked', e));
  if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 800]);

  let index = 0;
  const interval = setInterval(() => {
    if (index < messages.length) {
      output.innerHTML += `<p>> ${messages[index]}</p>`;
      index++;
    } else {
      clearInterval(interval);
      statusText.textContent = 'System status: COMPROMISED';
      statusText.style.color = '#ff0000'; // Turn red when compromised
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 2000);
    }
  }, 1000);
});
