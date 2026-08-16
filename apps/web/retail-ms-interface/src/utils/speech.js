export function speakWelcome(displayName) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return false;
  }

  const name = String(displayName || '').trim() || 'Administrator';
  const message = new SpeechSynthesisUtterance(`Hello, ${name}`);
  message.lang = 'en-US';
  message.rate = 0.95;
  message.pitch = 1;
  message.volume = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(message);
  return true;
}
