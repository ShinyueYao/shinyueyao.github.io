import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const canvas = document.getElementById('face-cloud-canvas');

if (canvas) {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  const group = new THREE.Group();
  const count = 1850;
  const baseCount = 1300;
  const eyeEnd = baseCount + 240;
  const noseEnd = eyeEnd + 160;
  const facePositions = new Float32Array(count * 3);
  const scatterPositions = new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const accents = new Uint8Array(count);
  const random = (() => {
    let state = 71321;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  })();

  camera.position.z = 4.3;
  scene.add(group);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const gaussian = (x, y, centerX, centerY, scaleX, scaleY) => Math.exp(
    -(((x - centerX) ** 2) / scaleX + ((y - centerY) ** 2) / scaleY)
  );

  for (let index = 0; index < count; index += 1) {
    let x;
    let y;
    let z;
    let accent = false;

    if (index < baseCount) {
      let diskX;
      let diskY;
      do {
        diskX = random() * 2 - 1;
        diskY = random() * 2 - 1;
      } while (diskX * diskX + diskY * diskY > 1);

      x = diskX * (0.92 - Math.abs(diskY) * 0.08);
      y = diskY * 1.18;
      const edge = Math.max(0, 1 - (x / 0.94) ** 2 - (y / 1.2) ** 2);
      const eyes = gaussian(x, y, -0.34, 0.25, 0.025, 0.009) + gaussian(x, y, 0.34, 0.25, 0.025, 0.009);
      const nose = gaussian(x, y, 0, -0.02, 0.018, 0.15);
      z = 0.12 + Math.sqrt(edge) * 0.42 + nose * 0.22 - eyes * 0.1;
      accent = index % 97 === 0;
    } else if (index < eyeEnd) {
      const side = index % 2 === 0 ? -1 : 1;
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      x = side * 0.34 + Math.cos(angle) * 0.15 * radius;
      y = 0.25 + Math.sin(angle) * 0.075 * radius;
      z = 0.46 + (1 - radius) * 0.06;
      accent = true;
    } else if (index < noseEnd) {
      const vertical = random();
      y = 0.3 - vertical * 0.62;
      x = (random() * 2 - 1) * (0.035 + vertical * 0.085);
      z = 0.5 + Math.sin(vertical * Math.PI) * 0.2;
    } else {
      x = random() * 0.58 - 0.29;
      y = -0.43 + Math.sin((x / 0.29) * Math.PI) * 0.038 + (random() - 0.5) * 0.05;
      z = 0.51 + Math.cos((x / 0.29) * Math.PI) * 0.025;
      accent = true;
    }
    const offset = index * 3;

    facePositions[offset] = x;
    facePositions[offset + 1] = y;
    facePositions[offset + 2] = z;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    accents[index] = accent ? 1 : 0;

    const scatterRadius = 1.35 + random() * 0.72;
    const scatterTheta = random() * Math.PI * 2;
    const scatterPhi = Math.acos(1 - random() * 2);
    scatterPositions[offset] = Math.sin(scatterPhi) * Math.cos(scatterTheta) * scatterRadius;
    scatterPositions[offset + 1] = Math.cos(scatterPhi) * scatterRadius * 1.08;
    scatterPositions[offset + 2] = Math.sin(scatterPhi) * Math.sin(scatterTheta) * scatterRadius * 0.72;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.027,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true
  });
  const cloud = new THREE.Points(geometry, material);
  group.add(cloud);

  const applyPalette = () => {
    const dark = root.dataset.theme === 'dark';
    const base = new THREE.Color(dark ? '#65d0c3' : '#007d76');
    const accent = new THREE.Color(dark ? '#ff9b84' : '#d95d43');
    for (let index = 0; index < count; index += 1) {
      const color = accents[index] ? accent : base;
      const offset = index * 3;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }
    geometry.attributes.color.needsUpdate = true;
  };

  const resize = () => {
    const bounds = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
    camera.aspect = bounds.width / Math.max(1, bounds.height);
    camera.updateProjectionMatrix();
  };

  const ease = (value) => value * value * (3 - 2 * value);
  const assemblyProgress = (time) => {
    if (reducedMotion.matches) return 1;
    const phase = (time % 12000) / 12000;
    if (phase < 0.1) return 0;
    if (phase < 0.4) return ease((phase - 0.1) / 0.3);
    if (phase < 0.78) return 1;
    return 1 - ease((phase - 0.78) / 0.22);
  };

  let frameId;
  let running = false;
  const render = (time) => {
    const progress = assemblyProgress(time);
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] = scatterPositions[index] + (facePositions[index] - scatterPositions[index]) * progress;
    }
    geometry.attributes.position.needsUpdate = true;
    group.rotation.y = Math.sin(time * 0.00022) * 0.3;
    group.rotation.x = -0.04 + Math.cos(time * 0.00016) * 0.035;
    renderer.render(scene, camera);
  };

  const frame = (time) => {
    if (!running) return;
    render(time);
    frameId = window.requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || reducedMotion.matches) return;
    running = true;
    frame(performance.now());
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(frameId);
  };

  applyPalette();
  resize();
  render(performance.now());
  start();
  window.addEventListener('resize', resize, { passive: true });
  if ('ResizeObserver' in window) new window.ResizeObserver(resize).observe(container);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  new MutationObserver(applyPalette).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}
