// Motor de síntesis de audio ambiental procedural mediante Web Audio API
// No requiere descargar archivos pesados de audio; todo se sintetiza en tiempo real en el navegador.

class AmbientSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.currentSound = null;
    this.activeNodes = [];
    this.volume = 0.5;
    this.timerId = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  stop() {
    this.activeNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch {}
    });
    this.activeNodes = [];
    this.currentSound = null;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  // Generador de buffer de ruido blanco
  createNoiseBuffer(seconds = 5) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  // Generador de buffer de ruido rosa (1/f)
  createPinkNoiseBuffer(seconds = 5) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  // 1. 🌧️ Lluvia Suave y Relajante
  playRain() {
    this.initContext();
    this.stop();
    this.currentSound = 'rain';

    const buffer = this.createPinkNoiseBuffer(6);
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    this.activeNodes.push(noise, filter, gain);
  }

  // 2. 🌊 Olas del Mar (Ocean Waves)
  playWaves() {
    this.initContext();
    this.stop();
    this.currentSound = 'waves';

    const buffer = this.createPinkNoiseBuffer(6);
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    // LFO para modular el vaivén de las olas
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // Ciclo de ~8 segundos por ola

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    lfo.start();
    this.activeNodes.push(noise, filter, gain, lfo, lfoGain);
  }

  // 3. ☕ Cafetería / Murmullo Cálido
  playCafe() {
    this.initContext();
    this.stop();
    this.currentSound = 'cafe';

    const buffer = this.createPinkNoiseBuffer(6);
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);

    // Ligero efecto estereofónico
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    noise.connect(filter);
    filter.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.masterGain);
      this.activeNodes.push(panner);
    } else {
      gain.connect(this.masterGain);
    }

    noise.start();
    this.activeNodes.push(noise, filter, gain);
  }

  // 4. 🧘 Ruido Blanco / Foco Total
  playWhiteNoise() {
    this.initContext();
    this.stop();
    this.currentSound = 'whitenoise';

    const buffer = this.createNoiseBuffer(5);
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    this.activeNodes.push(noise, filter, gain);
  }

  // 5. 🌲 Bosque Nocturno y Grillos
  playForest() {
    this.initContext();
    this.stop();
    this.currentSound = 'forest';

    // Brisa suave de fondo
    const buffer = this.createPinkNoiseBuffer(5);
    if (!buffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Oscilador de alta frecuencia simulando grillos
    const cricket = this.ctx.createOscillator();
    cricket.type = 'sine';
    cricket.frequency.setValueAtTime(4500, this.ctx.currentTime);

    const cricketMod = this.ctx.createOscillator();
    cricketMod.frequency.setValueAtTime(16, this.ctx.currentTime);

    const cricketModGain = this.ctx.createGain();
    cricketModGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    const cricketGain = this.ctx.createGain();
    cricketGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

    cricketMod.connect(cricketModGain);
    cricketModGain.connect(cricketGain.gain);

    cricket.connect(cricketGain);
    cricketGain.connect(this.masterGain);

    noise.start();
    cricket.start();
    cricketMod.start();

    this.activeNodes.push(noise, filter, gain, cricket, cricketMod, cricketModGain, cricketGain);
  }

  // Temporizador de auto-apagado con fade-out
  setSleepTimer(minutes, onFinished) {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (!minutes || minutes <= 0) return;

    const ms = minutes * 60 * 1000;
    this.timerId = setTimeout(() => {
      // Fade out suave de 3 segundos
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 3);
        setTimeout(() => {
          this.stop();
          if (typeof onFinished === 'function') onFinished();
        }, 3200);
      } else {
        this.stop();
        if (typeof onFinished === 'function') onFinished();
      }
    }, ms);
  }
}

export const ambientSynthesizer = new AmbientSoundEngine();
