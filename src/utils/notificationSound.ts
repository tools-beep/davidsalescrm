// Sound utility for gentle notification alerts
let audioContext: AudioContext | null = null;
let isAudioInitialized = false;

// Initialize audio context (call this on first user interaction)
export const initializeAudio = () => {
  if (isAudioInitialized) return;
  
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    isAudioInitialized = true;
    console.log('[Audio] Notification sound initialized');
  } catch (error) {
    console.warn('[Audio] Could not initialize audio context:', error);
  }
};

// Play notification sound
export const playNotificationSound = async () => {
  console.log('[Audio] 🔊 Attempting to play notification sound...');
  
  // Initialize audio if not already done
  if (!isAudioInitialized) {
    console.log('[Audio] Auto-initializing on first play attempt...');
    initializeAudio();
  }
  
  // Don't play if audio not initialized (respects autoplay policy)
  if (!isAudioInitialized || !audioContext) {
    console.warn('[Audio] ⚠️ Skipping notification sound - not initialized');
    return;
  }

  try {
    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      console.log('[Audio] ⏯️ Resuming suspended audio context...');
      await audioContext.resume();
      console.log('[Audio] ✅ Audio context resumed, state:', audioContext.state);
    }
    
    console.log('[Audio] 🎵 AudioContext state:', audioContext.state);

    // Check if document is hidden (user on another tab) - play anyway but log it
    if (document.hidden) {
      console.log('[Audio] 📱 Playing notification sound while tab is inactive');
    }

    // Generate a soft, gentle notification tone using Web Audio API
    // This creates a pleasant "macaroon-style" ding sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    console.log('[Audio] 🎹 Creating oscillator and gain nodes...');
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Soft, pleasant frequency (like a soft chime)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // E5 note
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1); // Glide down
    
    // Gentle volume envelope (soft attack, gentle decay)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.05); // Even louder
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8); // Longer fade
    
    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8); // Stop after 0.8 seconds
    
    console.log('[Audio] ✅ Notification sound PLAYED successfully at', new Date().toLocaleTimeString());
    
    // Clean up after sound finishes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      console.log('[Audio] 🧹 Audio nodes cleaned up');
    };
  } catch (error) {
    console.error('[Audio] ❌ Error playing notification sound:', error);
    console.error('[Audio] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      audioContextState: audioContext?.state,
      isInitialized: isAudioInitialized
    });
  }
};

