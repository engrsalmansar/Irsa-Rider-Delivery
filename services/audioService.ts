/**
 * A robust audio service using the Web Audio API.
 * This generates sound synthetically so no external MP3 files are needed.
 */
class AudioService {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: number | null = null;
  private keepAliveOscillator: OscillatorNode | null = null;

  constructor() {
    // We don't initialize AudioContext in constructor to avoid auto-play policy issues.
  }

  public async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.startKeepAlive();
  }

  /**
   * Plays a silent sound continuously to keep the AudioContext active
   * on mobile devices even when the screen is locked.
   */
  private startKeepAlive() {
    if (!this.audioContext || this.keepAliveOscillator) return;

    // Create a silent oscillator
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1, this.audioContext.currentTime); // Inaudible 1Hz
    gain.gain.setValueAtTime(0.001, this.audioContext.currentTime); // Nearly silent

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    this.keepAliveOscillator = osc;
  }

  public startAlarm() {
    if (this.isPlaying || !this.audioContext) return;
    this.isPlaying = true;

    // Create a pulsing alarm sound
    const playBeep = () => {
      if (!this.isPlaying || !this.audioContext) return;

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      // Alarm settings
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // High pitch A5
      osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.1); // Drop pitch

      gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + 0.6);
    };

    // Play immediately then loop
    playBeep();
    this.intervalId = window.setInterval(playBeep, 1000); // Beep every second
  }

  public stopAlarm() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const audioService = new AudioService();