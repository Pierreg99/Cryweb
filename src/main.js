const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  generateTerrain();
}

window.addEventListener('resize', resize);

// UI Elements
const presetSelect = document.getElementById('preset');
const timeInput = document.getElementById('time-of-day');
const weatherInput = document.getElementById('weather-intensity');
const fpsDisplay = document.getElementById('meta-fps');
const entitiesDisplay = document.getElementById('meta-entities');

// State
let timeOfDay = parseFloat(timeInput.value);
let weatherIntensity = parseFloat(weatherInput.value);

// Terrain
let terrain = [];
function generateTerrain() {
  terrain = [];
  const segments = Math.ceil(width / 10);
  for (let i = 0; i <= segments; i++) {
    const x = i * 10;
    // Simple sine wave terrain
    const y = height * 0.7 + Math.sin(x * 0.005) * 50 + Math.sin(x * 0.02) * 20;
    terrain.push({ x, y });
  }
}

// Entities (Animals/Particles)
const entities = [];
const NUM_ENTITIES = 50;

class Animal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = 0;
    this.size = 3 + Math.random() * 3;
    this.color = `hsl(${Math.random() * 60 + 20}, 70%, 50%)`;
  }

  update() {
    // Physics
    this.vy += 0.1; // Gravity
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x < 0) {
      this.x = 0;
      this.vx *= -1;
    } else if (this.x > width) {
      this.x = width;
      this.vx *= -1;
    }

    // Terrain Collision
    const terrainX = Math.max(0, Math.min(width, this.x));
    const segment = Math.floor(terrainX / 10);
    if (segment < terrain.length - 1) {
      const t1 = terrain[segment];
      const t2 = terrain[segment + 1];
      const t = (terrainX - t1.x) / 10;
      const terrainY = t1.y * (1 - t) + t2.y * t;

      if (this.y + this.size > terrainY) {
        this.y = terrainY - this.size;
        this.vy *= -0.5; // Bounce

        // Randomly jump
        if (Math.random() < 0.01) {
            this.vy = -3 - Math.random() * 3;
        }
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Weather particles
const particles = [];
const MAX_PARTICLES = 500;

class Drop {
  constructor() {
    this.reset();
    this.y = Math.random() * height; // initial random y
  }

  reset() {
    this.x = Math.random() * width;
    this.y = -10;
    this.vy = 5 + Math.random() * 5;
    this.length = 10 + Math.random() * 10;
  }

  update() {
    this.y += this.vy;
    // wind effect based on weather intensity
    this.x += weatherIntensity * 2;

    if (this.y > height) {
      this.reset();
    }
  }

  draw(ctx) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + weatherIntensity * 0.3})`;
    ctx.lineWidth = 1 + weatherIntensity;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + weatherIntensity * 2, this.y + this.length);
    ctx.stroke();
  }
}

function init() {
  resize();
  for (let i = 0; i < NUM_ENTITIES; i++) {
    entities.push(new Animal(Math.random() * width, height * 0.5));
  }
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push(new Drop());
  }
}

// UI Listeners
presetSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === 'clear-morning') {
    timeInput.value = 8;
    weatherInput.value = 0;
  } else if (val === 'sunset') {
    timeInput.value = 18;
    weatherInput.value = 0.1;
  } else if (val === 'storm') {
    timeInput.value = 14;
    weatherInput.value = 0.9;
  }
  updateState();
});

function updateState() {
  timeOfDay = parseFloat(timeInput.value);
  weatherIntensity = parseFloat(weatherInput.value);
}

timeInput.addEventListener('input', updateState);
weatherInput.addEventListener('input', updateState);

// Sky color based on time of day
function getSkyColor(time) {
  // Normalize time 0-24
  let r, g, b;
  if (time >= 6 && time < 12) {
    // Morning (orange to blue)
    const t = (time - 6) / 6;
    r = 255 * (1 - t) + 135 * t;
    g = 150 * (1 - t) + 206 * t;
    b = 50 * (1 - t) + 235 * t;
  } else if (time >= 12 && time < 18) {
    // Day (blue to orange/red)
    const t = (time - 12) / 6;
    r = 135 * (1 - t) + 253 * t;
    g = 206 * (1 - t) + 94 * t;
    b = 235 * (1 - t) + 83 * t;
  } else if (time >= 18 && time < 20) {
    // Sunset to Night
    const t = (time - 18) / 2;
    r = 253 * (1 - t) + 10 * t;
    g = 94 * (1 - t) + 10 * t;
    b = 83 * (1 - t) + 30 * t;
  } else {
    // Night
    r = 10;
    g = 10;
    b = 30;
  }

  // Apply weather darkening
  const darken = 1 - (weatherIntensity * 0.5);
  return `rgb(${Math.floor(r * darken)}, ${Math.floor(g * darken)}, ${Math.floor(b * darken)})`;
}


let lastTime = 0;
let frames = 0;
let lastFpsUpdate = 0;

function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Clear background
  ctx.fillStyle = getSkyColor(timeOfDay);
  ctx.fillRect(0, 0, width, height);

  // Draw sun/moon
  ctx.save();
  const cx = width / 2;
  const cy = height;
  const radius = width * 0.4;
  // Time from 0 to 24 mapped to angle
  const angle = ((timeOfDay - 6) / 24) * Math.PI * 2;
  const sunX = cx + Math.cos(angle) * radius;
  // Subtracting sine because canvas y increases downwards
  const sunY = cy - Math.sin(angle) * radius;

  ctx.fillStyle = '#ffdd44';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Draw terrain
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let t of terrain) {
    ctx.lineTo(t.x, t.y);
  }
  ctx.lineTo(width, height);
  ctx.fill();

  // Update & Draw Entities
  let activeEntities = 0;
  for (let entity of entities) {
    entity.update();
    entity.draw(ctx);
    activeEntities++;
  }

  // Update & Draw Weather
  const activeParticles = Math.floor(weatherIntensity * MAX_PARTICLES);
  for (let i = 0; i < activeParticles; i++) {
    particles[i].update();
    particles[i].draw(ctx);
    activeEntities++;
  }

  // Update UI
  frames++;
  if (timestamp - lastFpsUpdate > 500) {
    const fps = Math.round((frames * 1000) / (timestamp - lastFpsUpdate));
    fpsDisplay.textContent = `FPS: ${fps}`;
    entitiesDisplay.textContent = `Entities: ${activeEntities}`;
    frames = 0;
    lastFpsUpdate = timestamp;
  }

  requestAnimationFrame(loop);
}

init();
requestAnimationFrame(loop);
