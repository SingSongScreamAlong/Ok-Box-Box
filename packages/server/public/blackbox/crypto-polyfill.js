// Polyfill for crypto.randomUUID() for browsers that don't support it
if (!window.crypto || !window.crypto.randomUUID) {
  if (!window.crypto) {
    window.crypto = {};
  }
  
  window.crypto.randomUUID = function() {
    // Generate a UUID v4 using Math.random() as fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}
