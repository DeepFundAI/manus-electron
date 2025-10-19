// Loading Page Interactive Script

class LoadingManager {
  constructor() {
    this.startTime = Date.now();
    this.messages = [
      'Starting service...',
      'Initializing components...',
      'Loading resources...',
      'Almost ready...'
    ];
    this.currentMessageIndex = 0;
    this.init();
  }

  init() {
    this.updateLoadingText();
    this.simulateProgress();

    // Update loading text every 3 seconds
    setInterval(() => {
      this.updateLoadingText();
    }, 3000);
  }

  updateLoadingText() {
    const mainTextElement = document.querySelector('.main-text');
    if (mainTextElement) {
      mainTextElement.textContent = this.messages[this.currentMessageIndex];
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
    }
  }

  simulateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const subText = document.querySelector('.sub-text');

    if (!progressFill || !subText) return;

    let progress = 0;
    const updateProgress = () => {
      const elapsed = Date.now() - this.startTime;

      // Simulate progress, faster in first 10 seconds, then slower
      if (elapsed < 10000) {
        progress = Math.min(70, (elapsed / 10000) * 70);
      } else {
        progress = Math.min(95, 70 + ((elapsed - 10000) / 20000) * 25);
      }

      progressFill.style.width = `${progress}%`;

      // Update hint text
      if (elapsed > 15000) {
        subText.textContent = 'Service startup is taking longer, please be patient...';
      } else if (elapsed > 8000) {
        subText.textContent = 'Almost there...';
      }

      // If exceeds 30 seconds, show error message
      if (elapsed > 30000) {
        this.showError();
        return;
      }

      requestAnimationFrame(updateProgress);
    };

    requestAnimationFrame(updateProgress);
  }

  showError() {
    const mainText = document.querySelector('.main-text');
    const subText = document.querySelector('.sub-text');
    const progressFill = document.querySelector('.progress-fill');

    if (mainText) mainText.textContent = 'Service startup failed';
    if (subText) subText.textContent = 'Please check network connection or restart application';
    if (progressFill) {
      progressFill.style.background = '#ef4444';
      progressFill.style.width = '100%';
    }

    // Stop animation
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
      spinner.style.animation = 'none';
    }
  }
}

// Initialize loading manager
document.addEventListener('DOMContentLoaded', () => {
  new LoadingManager();
});