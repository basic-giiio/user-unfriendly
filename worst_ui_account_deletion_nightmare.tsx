import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, ShieldAlert, Award, Skull, Flame,
  Mic, Volume2, VolumeX, Radio, CheckSquare, Square, RefreshCw
} from 'lucide-react';

// Web Audio API Synthesizer with Master Volume Control
class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 1.0;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  playSuperLoudStartAlarm() {
    this.init();
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      osc1.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(1200, this.ctx.currentTime);

      for (let i = 0; i < 10; i++) {
        osc1.frequency.setValueAtTime(800, this.ctx.currentTime + i * 0.1);
        osc1.frequency.setValueAtTime(1400, this.ctx.currentTime + i * 0.1 + 0.05);
      }

      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 1.2);
      osc2.stop(this.ctx.currentTime + 1.2);
    } catch (e) {}
  }

  playBeep(freq = 440, type = 'sine', duration = 0.1) {
    if (this.muted) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playSpitSound() {
    if (this.muted) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playBounceSound() {
    this.playBeep(300 + Math.random() * 200, 'triangle', 0.05);
  }

  playDropSound() {
    this.playBeep(880, 'square', 0.08);
  }

  playAlarmSound() {
    this.playBeep(1100, 'sawtooth', 0.12);
  }
}

const sfx = new SoundFX();

export default function App() {
  const initialElements = [
    { id: 'el-avatar', title: 'User Avatar Pic', type: 'image', icon: '👤', bg: '#ff00ff' },
    { id: 'el-name', title: 'Username: xX_RageMaster_99_Xx', type: 'text', icon: '📛', bg: '#00ffff' },
    { id: 'el-email', title: 'Email: bad_ui_victim@worst.com', type: 'text', icon: '📧', bg: '#ffff00' },
    { id: 'el-badge-1', title: 'VIP Membership Badge', type: 'badge', icon: '💎', bg: '#00ff00' },
    { id: 'el-badge-2', title: 'Level 99 Procrastinator', type: 'badge', icon: '🏆', bg: '#ff6600' },
    { id: 'el-btn-settings', title: '[Settings & Privacy Button]', type: 'button', icon: '⚙️', bg: '#ff0066' },
    { id: 'el-btn-billing', title: '[Payment Info & Credit Card]', type: 'button', icon: '💳', bg: '#00ffcc' },
    { id: 'el-terms', title: 'I Agree to Terms of Service', type: 'checkbox', icon: '📜', bg: '#cc00ff' },
    { id: 'el-nav-home', title: 'Navigation: Home Link', type: 'nav', icon: '🏠', bg: '#66ff00' },
    { id: 'el-nav-help', title: 'Navigation: FAQ & Support', type: 'nav', icon: '❓', bg: '#ff9900' },
    { id: 'el-ad-banner', title: 'Account Status: Active', type: 'ad', icon: '🔥', bg: '#ff0000' },
    { id: 'el-footer', title: 'Copyright © 1997 Ultra Web Inc.', type: 'footer', icon: '🌐', bg: '#3366ff' }
  ];

  const [elements, setElements] = useState(initialElements);
  const [binContents, setBinContents] = useState([]);
  const [binCapacity, setBinCapacity] = useState(4);
  const [draggedItem, setDraggedItem] = useState(null);
  
  // SLOWER Bin Movement Physics State
  const [binPos, setBinPos] = useState({ x: 200, y: 150 });
  const [binVel, setBinVel] = useState({ x: 1.2, y: 0.8 });
  const [isBinHovered, setIsBinHovered] = useState(false);

  // Sound & Voice Volume Calibration State
  const [showVolumeCalibrator, setShowVolumeCalibrator] = useState(true);
  const [masterVol, setMasterVol] = useState(1.0);
  const [micActive, setMicActive] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [micError, setMicError] = useState('');
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);

  // Modal State for Empty Bin Sequence
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Captcha, 2: Are you REALLY sure?, 3: Empty Confirm
  const [timer, setTimer] = useState(10);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState({ q: '', a: '' });
  const [captchaError, setCaptchaError] = useState('');
  const [tauntMsg, setTauntMsg] = useState('CALIBRATE VOLUME WITH YOUR VOICE TO BEGIN!');
  const [rageScore, setRageScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Stats
  const [itemsDestroyed, setItemsDestroyed] = useState(0);
  const [emptyAttempts, setEmptyAttempts] = useState(0);
  const [spitCount, setSpitCount] = useState(0);

  // Plinko Final Stage State
  const [showPlinkoStage, setShowPlinkoStage] = useState(false);
  const [plinkoChoice, setPlinkoChoice] = useState(null); // 'yes' or 'no'
  const [plinkoRunning, setPlinkoRunning] = useState(false);
  const [plinkoOutcome, setPlinkoOutcome] = useState(null); // 'yes' or 'no'
  const [isFinished, setIsFinished] = useState(false);

  const containerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const canvasRef = useRef(null);

  const triggerInitialLoudSound = () => {
    sfx.playSuperLoudStartAlarm();
  };

  // Mic Volume Analyzer Loop
  const startMicAnalyzer = async () => {
    try {
      setMicError('');
      triggerInitialLoudSound();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMicActive(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMicMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicVolumeLevel(normalized);

        const calculatedVol = Math.max(0.05, Math.min(1.0, normalized / 100));
        setMasterVol(calculatedVol);
        sfx.setVolume(calculatedVol);

        animFrameRef.current = requestAnimationFrame(updateMicMeter);
      };

      updateMicMeter();
    } catch (err) {
      console.error(err);
      setMicError('MICROPHONE ACCESS DENIED! You must allow mic access to control volume with your voice!');
    }
  };

  const stopMicAnalyzer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }
    setMicActive(false);
  };

  const confirmVoiceCalibration = () => {
    setCalibrationSuccess(true);
    sfx.playBeep(880, 'sine', 0.2);
    setTimeout(() => {
      stopMicAnalyzer();
      setShowVolumeCalibrator(false);
      setTauntMsg('DRAG ALL UI ELEMENTS INTO THE BIN TO DELETE ACCOUNT!');
    }, 600);
  };

  const toggleMute = () => {
    sfx.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Slower Bouncing Bin Physics Loop
  useEffect(() => {
    if (isFinished || showVolumeCalibrator || showPlinkoStage) return;
    const interval = setInterval(() => {
      setBinPos(prev => {
        const bounds = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: 800, height: 600 };
        const binSize = 130;

        let nextX = prev.x + binVel.x;
        let nextY = prev.y + binVel.y;
        let nextVx = binVel.x;
        let nextVy = binVel.y;

        if (nextX <= 10 || nextX >= bounds.width - binSize - 20) {
          nextVx = -nextVx;
        }
        if (nextY <= 10 || nextY >= bounds.height - binSize - 20) {
          nextVy = -nextVy;
        }

        nextVx = Math.max(-2.5, Math.min(2.5, nextVx));
        nextVy = Math.max(-2.5, Math.min(2.5, nextVy));

        setBinVel({ x: nextVx, y: nextVy });
        return { x: nextX, y: nextY };
      });
    }, 30);

    return () => clearInterval(interval);
  }, [binVel, isFinished, showVolumeCalibrator, showPlinkoStage]);

  // Modal 10-Second Countdown Timer
  useEffect(() => {
    let countdown;
    if (showEmptyModal && timer > 0) {
      countdown = setInterval(() => {
        setTimer(t => t - 1);
        sfx.playAlarmSound();
      }, 1000);
    } else if (showEmptyModal && timer === 0) {
      handleEmptyFailure("TIME EXPIRED! Timer hit 0 and bin spat out an item!");
    }

    return () => clearInterval(countdown);
  }, [showEmptyModal, timer]);

  // EASY CAPTCHA Generator
  const generateEasyCaptcha = () => {
    const captchas = [
      { q: "What is 1 + 1?", a: "2" },
      { q: "What is 2 + 2?", a: "4" },
      { q: "What is 5 - 3?", a: "2" },
      { q: "Type the word: YES", a: "YES" },
      { q: "What is 10 + 0?", a: "10" }
    ];
    const picked = captchas[Math.floor(Math.random() * captchas.length)];
    setCaptchaChallenge(picked);
    setCaptchaInput('');
    setCaptchaError('');
  };

  // Open Empty Trash Sequence
  const startEmptySequence = () => {
    setEmptyAttempts(a => a + 1);
    generateEasyCaptcha();
    setModalStep(1);
    setTimer(10);
    setShowEmptyModal(true);
  };

  // Handle Failure during empty modal
  const handleEmptyFailure = (reason) => {
    setShowEmptyModal(false);
    sfx.playSpitSound();
    setRageScore(r => r + 10);
    setSpitCount(s => s + 1);

    if (binContents.length > 0) {
      const spatItem = binContents[0];
      setBinContents(prev => prev.slice(1));
      setElements(prev => [...prev, spatItem]);
      setTauntMsg(`🤮 BIN SPAT OUT: "${spatItem.title}"! ${reason}`);
    } else {
      setTauntMsg(`💥 FAILURE! ${reason}`);
    }
  };

  // Handle successful Empty Trash
  const handleEmptySuccess = () => {
    setShowEmptyModal(false);
    sfx.playBeep(1000, 'triangle', 0.4);
    
    setItemsDestroyed(prev => prev + binContents.length);
    setBinContents([]);

    const newCap = Math.max(1, binCapacity - 1);
    setBinCapacity(newCap);

    setTauntMsg(`✅ Trash Emptied! Capacity reduced to [${newCap}]!`);

    // Check if all items are completely cleared
    if (elements.length === 0) {
      setShowPlinkoStage(true);
    }
  };

  const handleCaptchaSubmit = (e) => {
    e.preventDefault();
    setCaptchaError('');

    const cleanUser = captchaInput.trim().toLowerCase();
    const cleanAnswer = String(captchaChallenge.a).trim().toLowerCase();

    if (cleanUser && cleanUser === cleanAnswer) {
      sfx.playBeep(880, 'sine', 0.15);
      setModalStep(2); // Go to "Are you REALLY sure?" prompt
    } else {
      sfx.playBeep(200, 'sawtooth', 0.2);
      setRageScore(r => r + 5);
      setCaptchaError(`❌ Wrong answer! Try again.`);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDropOnBin = (e) => {
    e.preventDefault();
    setIsBinHovered(false);

    if (!draggedItem) return;

    if (binContents.length >= binCapacity) {
      sfx.playAlarmSound();
      setRageScore(r => r + 10);
      setTauntMsg(`⚠️ BIN IS FULL (${binContents.length}/${binCapacity})! CLICK 'EMPTY TRASH'!`);
      return;
    }

    sfx.playDropSound();
    setElements(prev => prev.filter(el => el.id !== draggedItem.id));
    setBinContents(prev => [...prev, draggedItem]);
    setDraggedItem(null);
  };

  // ==========================================
  // PLINKO PHYSICS ENGINE & GAMBLE CANVAS LOGIC
  // ==========================================
  useEffect(() => {
    if (!showPlinkoStage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = 450;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    // Peg grid matching image
    const pegs = [];
    const pegRadius = 4;
    const rows = [
      { y: 160, count: 6 },
      { y: 200, count: 7 },
      { y: 240, count: 6 },
      { y: 280, count: 7 },
      { y: 320, count: 6 }
    ];

    rows.forEach(row => {
      const spacing = 45;
      const startX = (width - (row.count - 1) * spacing) / 2;
      for (let i = 0; i < row.count; i++) {
        pegs.push({ x: startX + i * spacing, y: row.y });
      }
    });

    // Checkmark projectile state
    let ball = null;
    let animId = null;

    if (plinkoRunning && plinkoChoice) {
      const startX = plinkoChoice === 'yes' ? 160 : 290;
      ball = {
        x: startX,
        y: 110,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.5,
        radius: 12
      };
    }

    const checkWallCollisions = (b) => {
      // Outer funnels and boundaries matching the image silhouette
      // Left funnel top: x=120..180, Y=70..110
      // Right funnel top: x=270..330, Y=70..110
      if (b.y < 120) {
        if (b.x - b.radius < 120) { b.x = 120 + b.radius; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x + b.radius > 330) { b.x = 330 - b.radius; b.vx = -Math.abs(b.vx) * 0.5; }
        if (b.x > 180 && b.x < 270) {
          if (b.x < 225) { b.x = 180; b.vx = -Math.abs(b.vx); }
          else { b.x = 270; b.vx = Math.abs(b.vx); }
        }
      } else if (b.y >= 120 && b.y <= 360) {
        // Main hexagon container bounds
        if (b.x - b.radius < 70) { b.x = 70 + b.radius; b.vx = Math.abs(b.vx) * 0.7; sfx.playBounceSound(); }
        if (b.x + b.radius > 380) { b.x = 380 - b.radius; b.vx = -Math.abs(b.vx) * 0.7; sfx.playBounceSound(); }
      } else if (b.y > 360) {
        // Bottom funnel splits to Yes (left slot: 130..190) and No (right slot: 260..320)
        if (b.x < 130) { b.x = 130 + b.radius; b.vx = Math.abs(b.vx); }
        if (b.x > 320) { b.x = 320 - b.radius; b.vx = -Math.abs(b.vx); }
        if (b.x > 190 && b.x < 260) {
          if (b.x < 225) { b.x = 190 - b.radius; b.vx = -Math.abs(b.vx); }
          else { b.x = 260 + b.radius; b.vx = Math.abs(b.vx); }
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Main Plinko Outer Contour matching attached image
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      // Top Left Entrance
      ctx.moveTo(130, 70);
      ctx.lineTo(180, 70);
      ctx.lineTo(180, 110);
      ctx.lineTo(225, 130); // Center inverted wedge
      ctx.lineTo(270, 110);
      ctx.lineTo(270, 70);
      ctx.lineTo(320, 70);
      ctx.lineTo(320, 110);
      ctx.lineTo(380, 170); // Right diagonal upper
      ctx.lineTo(380, 310); // Right vertical wall
      ctx.lineTo(320, 360); // Right diagonal lower
      ctx.lineTo(320, 410); // Right slot outer
      ctx.lineTo(260, 410); // Right slot inner
      ctx.lineTo(260, 370);
      ctx.lineTo(225, 350); // Bottom center wedge divider
      ctx.lineTo(190, 370);
      ctx.lineTo(190, 410); // Left slot inner
      ctx.lineTo(130, 410); // Left slot outer
      ctx.lineTo(130, 360);
      ctx.lineTo(70, 310);  // Left vertical wall
      ctx.lineTo(70, 170);   // Left diagonal upper
      ctx.lineTo(130, 110);
      ctx.closePath();
      ctx.stroke();

      // Draw Pegs
      pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
      });

      // Draw Labels
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('Yes', 160, 435);
      ctx.fillText('No', 290, 435);

      // Physics Loop for falling checkmark
      if (ball) {
        // Apply Gravity
        ball.vy += 0.18;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Check peg collisions
        pegs.forEach(peg => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ball.radius + pegRadius) {
            sfx.playBounceSound();
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 0.75;
            ball.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8;
            ball.vy = Math.sin(angle) * speed;
            ball.x = peg.x + Math.cos(angle) * (ball.radius + pegRadius + 1);
            ball.y = peg.y + Math.sin(angle) * (ball.radius + pegRadius + 1);
          }
        });

        checkWallCollisions(ball);

        // Render Checkmark ✓
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', 0, 0);
        ctx.restore();

        // Check landing at bottom
        if (ball.y >= 390) {
          const landedSlot = ball.x < 225 ? 'yes' : 'no';
          setPlinkoRunning(false);
          setPlinkoOutcome(landedSlot);
          
          if (landedSlot === 'yes') {
            sfx.playBeep(1200, 'sine', 0.5);
            setIsFinished(true);
          } else {
            sfx.playSpitSound();
          }
          ball = null;
        }
      }

      if (plinkoRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [showPlinkoStage, plinkoRunning, plinkoChoice]);

  const triggerPlinkoDrop = (choice) => {
    setPlinkoChoice(choice);
    setPlinkoOutcome(null);
    setPlinkoRunning(true);
    sfx.playBeep(600, 'square', 0.1);
  };

  const handleResetPlinkoFailure = () => {
    // Universe decided NO! Respawn 3 elements to try again
    setShowPlinkoStage(false);
    setPlinkoRunning(false);
    setPlinkoOutcome(null);
    setElements(initialElements.slice(0, 3));
    setTauntMsg('❌ UNIVERSE DECIDED NO! ACCOUNT DELETION FAILED! TRY AGAIN!');
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-screen bg-pink-300 font-mono text-black overflow-hidden select-none p-4"
      style={{
        backgroundImage: 'radial-gradient(#ff00ff 15%, transparent 16%), radial-gradient(#00ffff 15%, transparent 16%)',
        backgroundSize: '30px 30px',
        backgroundPosition: '0 0, 15px 15px'
      }}
    >
      {/* Header Bar */}
      <header className="bg-yellow-300 border-4 border-black p-3 mb-4 flex justify-between items-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-widest text-red-600 animate-pulse">
            🔥 DELETE ACCOUNT EXTREME 🔥
          </h1>
          <p className="text-xs md:text-sm font-bold bg-white px-2 py-0.5 inline-block border border-black mt-1">
            Task: Drag EVERY UI element into the moving bin. Clear bin when full!
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="bg-white border-2 border-black px-2 py-1 font-extrabold text-xs flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Volume2 size={16} /> VOL: {Math.round(masterVol * 100)}%
          </div>
          <button 
            onClick={toggleMute}
            className="p-2 bg-cyan-400 border-2 border-black font-bold flex items-center gap-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-cyan-300 active:translate-x-1"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            {isMuted ? "MUTED" : "SOUND ON"}
          </button>
        </div>
      </header>

      {/* System Message Status Bar */}
      <div className="bg-black text-green-400 p-2 border-2 border-yellow-400 font-mono text-sm mb-4 font-bold flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(255,0,255,1)]">
        <span>📢 SYSTEM MSG: {tauntMsg}</span>
        <span className="text-pink-400 font-extrabold">Rage Score: {rageScore} HP</span>
      </div>

      {/* VOICE-CONTROLLED VOLUME CALIBRATION MODAL */}
      {showVolumeCalibrator && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-red-500 border-8 border-yellow-300 p-6 max-w-lg w-full text-white shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-center animate-pulse">
            
            <div className="flex justify-center mb-3">
              <Radio size={56} className="text-yellow-300 animate-spin" />
            </div>

            <h2 className="text-3xl font-black uppercase text-yellow-300 tracking-wider mb-2">
              🚨 WARNING: LOUD AUDIO DETECTED! 🚨
            </h2>
            <p className="text-sm font-bold bg-black text-yellow-300 p-2 border-2 border-yellow-300 mb-4">
              To lower or adjust the audio volume, you MUST use your VOICE via Microphone!
            </p>

            {!micActive ? (
              <div className="space-y-4">
                <button
                  onClick={startMicAnalyzer}
                  className="w-full py-4 bg-yellow-300 text-black font-black text-xl border-4 border-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-200 active:translate-x-1 flex items-center justify-center gap-2"
                >
                  <Mic size={28} /> Start Mic Voice Control
                </button>

                {micError && (
                  <p className="text-xs bg-black text-red-400 p-2 border border-yellow-300 font-bold">{micError}</p>
                )}
              </div>
            ) : (
              <div className="bg-black border-4 border-yellow-300 p-4 text-left font-mono space-y-4">
                <div className="flex justify-between items-center text-sm font-black text-yellow-300">
                  <span className="flex items-center gap-1"><Mic className="animate-ping" size={16} /> VOICE AMPLITUDE:</span>
                  <span className="text-xl">{micVolumeLevel}%</span>
                </div>

                <div className="w-full bg-gray-800 h-8 border-2 border-yellow-300 relative overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-600 transition-all duration-75"
                    style={{ width: `${micVolumeLevel}%` }}
                  />
                </div>

                <p className="text-xs text-yellow-200 font-bold bg-gray-900 p-2 border border-gray-700">
                  🗣️ <b>HOW TO CONTROL VOLUME:</b><br />
                  - Speak louder to increase website volume.<br />
                  - Speak quietly / stay silent to reduce volume.<br />
                  - Current Volume: <b>{Math.round(masterVol * 100)}%</b>
                </p>

                <button
                  onClick={confirmVoiceCalibration}
                  disabled={calibrationSuccess}
                  className={`w-full py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ${
                    calibrationSuccess 
                      ? 'bg-green-400 text-black' 
                      : 'bg-yellow-300 text-black hover:bg-yellow-200 active:translate-x-1'
                  }`}
                >
                  {calibrationSuccess ? "✅ CALIBRATED! STARTING GAME..." : "🔒 LOCK IN VOICE VOLUME & PLAY"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTAINER: Drag & Drop Elements Area */}
      {!isFinished && !showPlinkoStage ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-32">
          {elements.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              className="cursor-grab active:cursor-grabbing p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-105"
              style={{ backgroundColor: item.bg }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <div className="font-extrabold text-sm md:text-base border-b-2 border-black pb-1">{item.title}</div>
                  <div className="text-xs text-gray-800 mt-1 font-bold">👉 DRAG ME TO TRASH!</div>
                </div>
              </div>
            </div>
          ))}

          {elements.length === 0 && binContents.length > 0 && (
            <div className="col-span-full bg-yellow-400 p-6 border-4 border-black text-center font-extrabold text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce">
              ⚠️ ALL UI ELEMENTS ARE IN THE BIN! NOW EMPTY THE BIN TO COMPLETE DELETION! ⚠️
            </div>
          )}
        </div>
      ) : null}

      {/* FINAL STAGE: PLINKO CHECKBOX GAMBLE MAZE (COPIED FROM ATTACHED IMAGE) */}
      {showPlinkoStage && !isFinished && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border-8 border-black p-6 max-w-lg w-full shadow-[16px_16px_0px_0px_rgba(255,255,0,1)] text-center relative">
            <h2 className="text-2xl md:text-3xl font-black mb-1">Would you like to delete your account?</h2>
            <p className="text-xs font-bold text-gray-600 mb-4 uppercase">
              Tick a checkbox to unhitch the tick ✓ into the gravity maze!
            </p>

            {/* Canvas Maze & Interactive Top Checkboxes */}
            <div className="relative inline-block border-4 border-black bg-white p-2">
              <canvas ref={canvasRef} className="block mx-auto" />

              {/* Checkboxes positioned at top entrances */}
              {!plinkoRunning && !plinkoOutcome && (
                <div className="absolute top-10 left-0 right-0 flex justify-between px-28">
                  <button 
                    onClick={() => triggerPlinkoDrop('yes')}
                    className="flex items-center gap-1 bg-yellow-300 border-2 border-black font-extrabold text-sm px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:translate-y-0.5"
                  >
                    <Square size={18} /> YES
                  </button>

                  <button 
                    onClick={() => triggerPlinkoDrop('no')}
                    className="flex items-center gap-1 bg-yellow-300 border-2 border-black font-extrabold text-sm px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:translate-y-0.5"
                  >
                    <Square size={18} /> NO
                  </button>
                </div>
              )}
            </div>

            {/* Plinko Outcome Feedback */}
            {plinkoOutcome === 'no' && (
              <div className="mt-4 bg-red-500 text-white p-4 border-4 border-black font-black">
                <p className="text-lg mb-2">❌ THE GRAVITY GAMBLE LANDED IN 'NO'!</p>
                <p className="text-xs mb-3">The universe decided NOT to delete your account!</p>
                <button
                  onClick={handleResetPlinkoFailure}
                  className="px-4 py-2 bg-yellow-300 text-black font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-200"
                >
                  <RefreshCw size={16} className="inline mr-1" /> TRY AGAIN FROM GAME
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VICTORY / GAMEOVER SCREEN */}
      {isFinished && (
        <div className="max-w-2xl mx-auto bg-white border-8 border-red-600 p-6 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] my-12">
          <h2 className="text-4xl font-black text-red-600 mb-2">🎉 ACCOUNT DELETED! 🎉</h2>
          <p className="text-lg font-bold text-gray-700 mb-6">You successfully cleared every UI element & survived the Plinko Gamble!</p>

          <div className="bg-yellow-200 border-4 border-black p-4 text-left font-bold space-y-2 mb-6 text-sm md:text-base">
            <p className="flex items-center gap-2"><Award className="text-purple-600" /> UI Elements Destroyed: {initialElements.length}</p>
            <p className="flex items-center gap-2"><Trash2 className="text-blue-600" /> Trash Empty Attempts: {emptyAttempts}</p>
            <p className="flex items-center gap-2"><Skull className="text-red-600" /> Elements Spat Back Out: {spitCount}</p>
            <p className="flex items-center gap-2"><Flame className="text-orange-600" /> Final Rage Score: {rageScore} PTS</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-green-400 border-4 border-black font-extrabold text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-300 active:translate-x-1"
          >
            🔄 Play Again
          </button>
        </div>
      )}

      {/* SLOWER MOVING RECYCLING BIN */}
      {!isFinished && !showVolumeCalibrator && !showPlinkoStage && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIsBinHovered(true)}
          onDragLeave={() => setIsBinHovered(false)}
          onDrop={handleDropOnBin}
          style={{
            transform: `translate(${binPos.x}px, ${binPos.y}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 40
          }}
          className={`w-36 h-36 border-4 border-black rounded-lg flex flex-col justify-between p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-colors opacity-100 ${
            binContents.length >= binCapacity 
              ? 'bg-red-500 text-white' 
              : isBinHovered 
                ? 'bg-lime-400 scale-105' 
                : 'bg-cyan-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-black bg-black text-white px-1.5 py-0.5 rounded">
            <span>BIN CAPACITY</span>
            <span>{binContents.length}/{binCapacity}</span>
          </div>

          <div className="flex flex-col items-center justify-center my-1">
            <Trash2 size={40} className={binContents.length >= binCapacity ? 'animate-bounce text-yellow-300' : 'text-black'} />
            <span className="text-[10px] font-extrabold uppercase tracking-tighter text-center leading-none mt-1">
              {binContents.length >= binCapacity ? '⚠️ FULL! EMPTY ME!' : 'DRAG UI HERE'}
            </span>
          </div>

          <button
            onClick={startEmptySequence}
            className={`w-full py-1 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              binContents.length >= binCapacity 
                ? 'bg-yellow-300 text-black hover:bg-yellow-200 animate-bounce' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            🗑️ EMPTY TRASH
          </button>
        </div>
      )}

      {/* EMPTY TRASH MODAL (WITH EXTRA ARE YOU REALLY SURE PROMPT) */}
      {showEmptyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-yellow-300 border-8 border-black p-6 max-w-md w-full shadow-[16px_16px_0px_0px_rgba(255,0,0,1)] relative">
            
            <div className="flex justify-between items-center border-b-4 border-black pb-3 mb-4">
              <h3 className="font-black text-xl flex items-center gap-2">
                <ShieldAlert className="text-red-600" /> EMPTY TRASH VERIFICATION
              </h3>
              <div className="bg-red-600 text-white font-black px-3 py-1 text-xl border-2 border-black animate-pulse">
                ⏰ {timer}s
              </div>
            </div>

            {/* Step 1: EASY CAPTCHA */}
            {modalStep === 1 && (
              <div>
                <p className="text-xs font-extrabold mb-2 uppercase text-gray-800">
                  Step 1/3: Answer this easy question before time runs out!
                </p>
                
                <div className="bg-white border-4 border-black p-3 mb-2 font-mono font-black text-center text-lg">
                  {captchaChallenge.q}
                </div>

                {captchaError && (
                  <div className="bg-red-500 text-white font-black p-1 text-xs text-center border-2 border-black mb-2 animate-bounce">
                    {captchaError}
                  </div>
                )}

                <form onSubmit={handleCaptchaSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="TYPE ANSWER HERE..."
                    className="w-full p-2 border-4 border-black font-bold uppercase focus:outline-none focus:bg-pink-100 text-center text-lg"
                    autoFocus
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-green-400 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-300 active:translate-x-0.5"
                    >
                      SUBMIT ANSWER
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmptyFailure("Cancelled CAPTCHA!")}
                      className="px-3 py-2 bg-gray-300 border-4 border-black font-bold text-xs uppercase"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: NEW "ARE YOU REALLY SURE?" PROMPT */}
            {modalStep === 2 && (
              <div>
                <p className="text-xs font-extrabold mb-2 uppercase text-red-600">
                  Step 2/3: DOUBLE CHECK CONFIRMATION!
                </p>

                <div className="bg-orange-300 border-4 border-black p-4 mb-4 font-black text-center text-base animate-bounce">
                  ❓ Are you REALLY REALLY sure that answer was correct and you want to proceed?
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      sfx.playBeep(880, 'sine', 0.15);
                      setModalStep(3);
                    }}
                    className="py-3 bg-green-400 text-black border-4 border-black font-extrabold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-300 active:translate-x-1"
                  >
                    YES, I AM REALLY SURE
                  </button>

                  <button
                    onClick={() => handleEmptyFailure("Fled at 'Are you REALLY sure' step!")}
                    className="py-3 bg-gray-300 text-black border-4 border-black font-extrabold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-200 active:translate-x-1"
                  >
                    NO, CANCEL
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: FINAL CONFIRMATION */}
            {modalStep === 3 && (
              <div>
                <p className="text-xs font-extrabold mb-2 uppercase text-gray-800">
                  Step 3/3: Confirm Emptying
                </p>

                <div className="bg-pink-200 border-4 border-black p-4 mb-4 font-black text-center text-base">
                  Emptying trash bin will permanently reduce bin capacity! Proceed?
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleEmptySuccess}
                    className="py-3 bg-red-500 text-white border-4 border-black font-extrabold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 active:translate-x-1"
                  >
                    YES, EMPTY TRASH
                  </button>

                  <button
                    onClick={() => handleEmptyFailure("Cancelled at confirmation!")}
                    className="py-3 bg-gray-300 text-black border-4 border-black font-extrabold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-200 active:translate-x-1"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 text-[10px] font-bold text-gray-600 text-center">
              * Complete before time runs out or the bin will spit an item back out!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}