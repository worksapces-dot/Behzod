/**
 * Agent Avatar Generator - Vanilla JS Canvas
 * Animated pixel avatar with deterministic generation from seed
 */

const GRID_SIZE = 6;
const PULSE_SPEED = 0.002;
const PULSE_AMPLITUDE = 22;
const BREATHE_SPEED = 0.001;
const BREATHE_AMPLITUDE = 10;
const WAVE_SPEED = 0.0015;
const WAVE_AMPLITUDE = 15;
const WAVE_LENGTH = 3;
const SPARKLE_SPEED = 0.004;
const SPARKLE_THRESHOLD = 0.92;
const SPARKLE_BOOST = 25;
const SCALE_PULSE_SPEED = 0.0008;
const SCALE_PULSE_AMOUNT = 0.03;
const HUE_SPREAD = 45;
const GLOW_RADIUS_RATIO = 0.25;

/** Simple deterministic hash from a string */
function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Seeded PRNG (mulberry32) */
function createRng(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a 3-color palette within the same hue family */
function generatePalette(hash, seed) {
  const rng = createRng(hash);
  const normalizedSeed = String(seed || '').toLowerCase();
  
  // Determine color based on seed
  let baseHue;
  if (normalizedSeed.includes('green')) {
    baseHue = 120 + (rng() * 40 - 20); // Green: 100-140
  } else if (normalizedSeed.includes('blue')) {
    baseHue = 210 + (rng() * 40 - 20); // Blue: 190-230
  } else if (normalizedSeed.includes('yellow')) {
    baseHue = 50 + (rng() * 40 - 20); // Yellow: 30-70
  } else if (normalizedSeed.includes('purple')) {
    baseHue = 280 + (rng() * 40 - 20); // Purple: 260-300
  } else if (normalizedSeed.includes('red')) {
    baseHue = 10 + (rng() * 40 - 20); // Red: 350-30
  } else if (normalizedSeed.includes('orange')) {
    baseHue = 30 + (rng() * 40 - 20); // Orange: 10-50
  } else if (normalizedSeed.includes('behzod')) {
    baseHue = 120 + (rng() * 40 - 20); // Default Behzod theme stays green unless color override is present
  } else {
    // Random color for other seeds
    baseHue = rng() * 360;
  }
  
  const sat = 70 + rng() * 25; // 70-95%
  
  return [
    [baseHue, sat, 50 + rng() * 10],
    [(baseHue + 15 + rng() * 10) % 360, sat - 5 + rng() * 10, 40 + rng() * 15],
    [(baseHue - 15 + rng() * 10) % 360, sat - 10 + rng() * 15, 55 + rng() * 15]
  ];
}

/** Build a grid with per-cell metadata */
function generateGrid(hash) {
  const rng = createRng(hash + 1);
  const grid = [];
  
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = {
        colorIndex: Math.floor(rng() * 3),
        phase: rng() * Math.PI * 2,
        brightness: 0.3 + rng() * 0.7,
        sparklePhase: rng() * Math.PI * 2
      };
    }
  }
  
  return grid;
}

/** Create and animate an agent avatar */
function createAgentAvatar(seed, size = 64, animated = true) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.borderRadius = '50%';
  ctx.scale(dpr, dpr);
  
  const hash = hashSeed(seed);
  const palette = generatePalette(hash, seed); // Pass seed for color selection
  const grid = generateGrid(hash);
  const cellSize = size / GRID_SIZE;
  const half = size / 2;
  
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let shouldAnimate = animated && !motionQuery.matches;
  let rafId = null;
  
  function draw(time) {
    ctx.clearRect(0, 0, size, size);
    
    // Scale pulse
    const scale = shouldAnimate 
      ? 1 + Math.sin(time * SCALE_PULSE_SPEED) * SCALE_PULSE_AMOUNT 
      : 1;
    
    ctx.save();
    ctx.translate(half, half);
    ctx.scale(scale, scale);
    ctx.translate(-half, -half);
    
    // Clip to circle
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();
    
    // Dark background
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, size, size);
    
    // Global breathe offset
    const breatheOffset = shouldAnimate 
      ? Math.sin(time * BREATHE_SPEED) * BREATHE_AMPLITUDE 
      : 0;
    
    // Draw pixel grid
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x];
        const [h, s, l] = palette[cell.colorIndex];
        
        // Per-pixel pulse
        const pulse = shouldAnimate 
          ? Math.sin(time * PULSE_SPEED + cell.phase) * PULSE_AMPLITUDE 
          : 0;
        
        // Diagonal wave sweep
        const waveDist = (x + y) / WAVE_LENGTH;
        const wave = shouldAnimate 
          ? Math.sin(time * WAVE_SPEED + waveDist) * WAVE_AMPLITUDE 
          : 0;
        
        // Sparkle
        const sparkleVal = shouldAnimate 
          ? Math.sin(time * SPARKLE_SPEED + cell.sparklePhase) 
          : 0;
        const sparkle = sparkleVal > SPARKLE_THRESHOLD 
          ? ((sparkleVal - SPARKLE_THRESHOLD) / (1 - SPARKLE_THRESHOLD)) * SPARKLE_BOOST 
          : 0;
        
        const finalLight = Math.min(90, Math.max(20, 
          (l + pulse + breatheOffset + wave + sparkle) * cell.brightness
        ));
        const finalSat = Math.min(100, s + 5);
        
        // Pixel glow
        ctx.shadowColor = `hsl(${h}, ${finalSat}%, ${finalLight}%)`;
        ctx.shadowBlur = cellSize * 0.45;
        ctx.fillStyle = `hsl(${h}, ${finalSat}%, ${finalLight}%)`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // Outer glow ring
    const [gh, gs, gl] = palette[0];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = `hsla(${gh}, ${gs}%, ${gl}%, 0.6)`;
    ctx.shadowBlur = size * GLOW_RADIUS_RATIO;
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${gh}, ${gs}%, ${gl}%, 0.15)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    
    if (shouldAnimate) {
      rafId = requestAnimationFrame(draw);
    }
  }
  
  function handleMotionChange() {
    if (rafId) cancelAnimationFrame(rafId);
    shouldAnimate = animated && !motionQuery.matches;
    if (shouldAnimate) {
      rafId = requestAnimationFrame(draw);
    } else {
      draw(0);
    }
  }
  
  motionQuery.addEventListener('change', handleMotionChange);
  
  if (shouldAnimate) {
    rafId = requestAnimationFrame(draw);
  } else {
    draw(0);
  }
  
  // Cleanup function
  canvas.destroy = () => {
    if (rafId) cancelAnimationFrame(rafId);
    motionQuery.removeEventListener('change', handleMotionChange);
  };
  
  return canvas;
}

// Export for use in widget
window.createAgentAvatar = createAgentAvatar;
