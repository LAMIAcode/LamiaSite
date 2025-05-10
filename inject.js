
const btn = document.getElementById('injectBtn');
const output = document.getElementById('consoleOutput');

const messages = [
  'Injecting payload...',
  'Bypassing security layers...',
  'Overriding root access...',
  'Infecting kernel space...',
  'LAMIA.exe successfully deployed.',
  'Access granted. Redirecting...'
];

btn.addEventListener('click', () => {
  btn.disabled = true;
  let index = 0;
  const interval = setInterval(() => {
    if (index < messages.length) {
      output.innerHTML += `<p>> ${messages[index]}</p>`;
      index++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1500);
    }
  }, 1000);
});
