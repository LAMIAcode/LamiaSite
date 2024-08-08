
const input = document.getElementById('commandInput');
const response = document.getElementById('response');

input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const command = input.value.trim();
    if (command === 'unlock --lamia') {
      response.style.color = '#00ff00';
      response.textContent = 'Access granted. Initializing...';
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1500);
    } else {
      response.textContent = `command not found: ${command}`;
    }
  }
});
