// The pairing panel every Atlas action shows: where the plugin stands with Atlas, and Pair with Atlas.
(() => {
  const { streamDeckClient } = SDPIComponents;
  const item = document.createElement('sdpi-item');
  item.setAttribute('label', 'Atlas');
  const status = document.createElement('p');
  status.className = 'atlas-status';
  status.textContent = 'Looking for Atlas…';
  const button = document.createElement('sdpi-button');
  button.className = 'atlas-pair';
  button.textContent = 'Pair with Atlas';
  button.hidden = true;
  button.addEventListener('click', () => streamDeckClient.send('sendToPlugin', { event: 'pair' }));
  item.append(status, button);
  document.body.append(item);

  streamDeckClient.sendToPropertyInspector.subscribe((message) => {
    const payload = message.payload;
    if (!payload || payload.event !== 'status') return;
    status.textContent = payload.text;
    status.dataset.link = payload.link;
    button.hidden = payload.link !== 'unpaired';
  });
  streamDeckClient.send('sendToPlugin', { event: 'status' });
})();
