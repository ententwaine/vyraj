document.addEventListener('DOMContentLoaded', () => {
  const iframeElement = document.getElementById('sc-widget');
  const playBtn = document.getElementById('radio-play-btn');
  const volSlider = document.getElementById('radio-vol');
  const statusDot = document.querySelector('.radio-status-dot');

  if (!iframeElement || !window.SC) return;

  const widget = SC.Widget(iframeElement);
  let isPlaying = true; // Auto-play is set to true in iframe

  widget.bind(SC.Widget.Events.READY, () => {
    // Set volume to 50% on load
    widget.setVolume(50);
    
    // Check if it actually started playing (browsers might block autoplay)
    widget.isPaused((paused) => {
      isPlaying = !paused;
      updateUI();
    });
  });

  widget.bind(SC.Widget.Events.PLAY, () => {
    isPlaying = true;
    updateUI();
  });

  widget.bind(SC.Widget.Events.PAUSE, () => {
    isPlaying = false;
    updateUI();
  });

  function updateUI() {
    playBtn.textContent = isPlaying ? '⏸' : '▶';
    if (isPlaying) {
      statusDot.classList.add('active');
    } else {
      statusDot.classList.remove('active');
    }
  }

  playBtn.addEventListener('click', () => {
    widget.toggle();
  });

  volSlider.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    widget.setVolume(vol);
  });
});
