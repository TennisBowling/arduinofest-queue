const socket = io();

socket.on('update', (data, newName) => {
  const { queue } = data;

  // update queue display
  const queueEl = document.getElementById('queue');
  queueEl.innerHTML = '';
  queue.forEach((name, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${name}`;
    queueEl.appendChild(li);
  });

});