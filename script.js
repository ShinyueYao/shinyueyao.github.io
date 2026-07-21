(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const motionButtons = document.querySelectorAll('.motion-button');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionMode = 'trajectory';

  const setThemeIcon = (theme) => {
    if (!themeButton) return;
    themeButton.innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
    window.lucide?.createIcons();
  };

  const setMenuIcon = (isOpen) => {
    if (!menuButton) return;
    menuButton.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}" aria-hidden="true"></i>`;
    window.lucide?.createIcons();
  };

  const savedTheme = localStorage.getItem('theme');
  const initialTheme = savedTheme || 'light';
  root.dataset.theme = initialTheme;

  window.addEventListener('DOMContentLoaded', () => {
    window.lucide?.createIcons();
    setThemeIcon(root.dataset.theme);

    document.querySelectorAll('[data-reveal-delay]').forEach((element) => {
      element.style.setProperty('--reveal-delay', `${element.dataset.revealDelay}ms`);
    });

    const revealItems = document.querySelectorAll('.reveal');
    if (motionQuery.matches || !('IntersectionObserver' in window)) {
      revealItems.forEach((element) => element.classList.add('is-visible'));
    } else {
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }),
        { threshold: 0.12 }
      );
      revealItems.forEach((element) => observer.observe(element));
    }

    drawField();
  });

  themeButton?.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    localStorage.setItem('theme', nextTheme);
    setThemeIcon(nextTheme);
  });

  menuButton?.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    setMenuIcon(isOpen);
  });

  mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mobileNav.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    setMenuIcon(false);
  }));

  motionButtons.forEach((button) => button.addEventListener('click', () => {
    motionMode = button.dataset.motion;
    motionButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
  }));

  function drawField() {
    const canvas = document.getElementById('field-canvas');
    if (!canvas || motionQuery.matches) return;

    const context = canvas.getContext('2d');
    const section = canvas.parentElement;
    const points = Array.from({ length: 34 }, (_, index) => ({
      x: (index * 79 + 61) % 1000,
      y: (index * 131 + 37) % 700,
      vx: ((index % 5) - 2) * 0.08,
      vy: (((index * 3) % 5) - 2) * 0.08
    }));
    const cloudPoints = Array.from({ length: 90 }, (_, index) => {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / 90);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta)
      };
    });
    let width = 0;
    let height = 0;
    let frameId;
    let running = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = section.clientWidth;
      height = section.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      points.forEach((point) => {
        point.x = (point.x / 1000) * width;
        point.y = (point.y / 700) * height;
      });
    };

    const palette = () => root.dataset.theme === 'dark'
      ? { teal: '#65d0c3', coral: '#ff9b84', line: 'rgba(101, 208, 195, 0.18)' }
      : { teal: '#007d76', coral: '#d95d43', line: 'rgba(0, 125, 118, 0.14)' };

    const drawNetwork = (colors) => {
      const dark = root.dataset.theme === 'dark';
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        point.x += point.vx;
        point.y += point.vy;
        if (point.x < 0 || point.x > width) point.vx *= -1;
        if (point.y < 0 || point.y > height) point.vy *= -1;
        for (let j = i + 1; j < points.length; j += 1) {
          const other = points[j];
          const dx = point.x - other.x;
          const dy = point.y - other.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 132) {
            context.beginPath();
            context.strokeStyle = dark ? `rgba(101, 208, 195, ${0.15 * (1 - distance / 132)})` : `rgba(0, 125, 118, ${0.12 * (1 - distance / 132)})`;
            context.lineWidth = 1;
            context.moveTo(point.x, point.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        }
      }
      points.forEach((point, index) => {
        context.fillStyle = index % 7 === 0 ? colors.coral : colors.teal;
        context.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
      });
    };

    const drawGrid = (time, colors) => {
      const spacing = Math.max(58, Math.min(92, width / 12));
      const xOffset = (time * 0.013) % spacing;
      const yOffset = (time * 0.009) % spacing;
      context.strokeStyle = colors.line;
      context.lineWidth = 1;
      for (let x = -spacing; x < width + spacing; x += spacing) {
        context.beginPath();
        context.moveTo(x + xOffset, 0);
        context.lineTo(x + xOffset, height);
        context.stroke();
      }
      for (let y = -spacing; y < height + spacing; y += spacing) {
        context.beginPath();
        context.moveTo(0, y + yOffset);
        context.lineTo(width, y + yOffset);
        context.stroke();
      }
      context.fillStyle = colors.coral;
      for (let x = spacing * 1.5; x < width; x += spacing * 3) {
        for (let y = spacing * 1.5; y < height; y += spacing * 3) {
          context.fillRect(x + xOffset, y + yOffset, 3, 3);
        }
      }
    };

    const drawTraces = (time, colors) => {
      const count = 6;
      const inset = height * 0.18;
      for (let line = 0; line < count; line += 1) {
        const baseline = inset + (line * (height - inset * 2)) / (count - 1);
        context.beginPath();
        for (let x = -20; x <= width + 20; x += 22) {
          const y = baseline
            + Math.sin((x + time * 0.05) / 88 + line * 0.75) * 15
            + Math.sin((x - time * 0.03) / 42 + line) * 4;
          if (x === -20) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = line % 3 === 0 ? colors.coral : colors.line;
        context.lineWidth = line % 3 === 0 ? 1.35 : 1;
        context.stroke();
      }
    };

    const drawWeave = (time, colors) => {
      const gap = Math.max(80, width / 10);
      const offset = (time * 0.022) % (gap * 2);
      context.lineWidth = 1;
      for (let x = -height; x < width + height; x += gap) {
        context.beginPath();
        context.moveTo(x + offset, 0);
        context.lineTo(x + height * 0.58 + offset, height);
        context.strokeStyle = colors.line;
        context.stroke();
      }
      for (let x = -height; x < width + height; x += gap * 2) {
        context.beginPath();
        context.moveTo(x - offset, 0);
        context.lineTo(x - height * 0.58 - offset, height);
        context.strokeStyle = colors.coral;
        context.globalAlpha = 0.45;
        context.stroke();
        context.globalAlpha = 1;
      }
    };

    const drawPointCloud = (time, colors) => {
      const angle = time * 0.00018;
      const centerX = width * 0.7;
      const centerY = height * 0.5;
      const radius = Math.min(width, height) * 0.3;
      cloudPoints.forEach((point, index) => {
        const x = point.x * Math.cos(angle) - point.z * Math.sin(angle);
        const z = point.x * Math.sin(angle) + point.z * Math.cos(angle);
        const y = point.y * Math.cos(angle * 0.6) - z * Math.sin(angle * 0.6) * 0.24;
        const depth = (z + 1) / 2;
        context.fillStyle = index % 11 === 0 ? colors.coral : colors.teal;
        context.globalAlpha = 0.2 + depth * 0.7;
        const size = 1.5 + depth * 2.2;
        context.fillRect(centerX + x * radius - size / 2, centerY + y * radius - size / 2, size, size);
      });
      context.globalAlpha = 1;
    };

    const drawCircuit = (time, colors) => {
      const circuits = [
        [[0.08, 0.25], [0.32, 0.25], [0.32, 0.5], [0.56, 0.5], [0.56, 0.72], [0.88, 0.72]],
        [[0.14, 0.76], [0.28, 0.76], [0.28, 0.39], [0.46, 0.39], [0.46, 0.16], [0.8, 0.16]],
        [[0.06, 0.58], [0.2, 0.58], [0.2, 0.86], [0.7, 0.86], [0.7, 0.42], [0.92, 0.42]]
      ];
      const pointAt = (path, progress) => {
        const segments = path.slice(1).map((point, index) => Math.hypot(
          (point[0] - path[index][0]) * width,
          (point[1] - path[index][1]) * height
        ));
        const total = segments.reduce((sum, length) => sum + length, 0);
        let remaining = progress * total;
        for (let index = 0; index < segments.length; index += 1) {
          if (remaining <= segments[index]) {
            const start = path[index];
            const end = path[index + 1];
            const ratio = remaining / segments[index];
            return [
              (start[0] + (end[0] - start[0]) * ratio) * width,
              (start[1] + (end[1] - start[1]) * ratio) * height
            ];
          }
          remaining -= segments[index];
        }
        const lastPoint = path[path.length - 1];
        return [lastPoint[0] * width, lastPoint[1] * height];
      };
      circuits.forEach((path, index) => {
        context.beginPath();
        path.forEach((point, pointIndex) => {
          const x = point[0] * width;
          const y = point[1] * height;
          if (pointIndex === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.strokeStyle = colors.line;
        context.lineWidth = 1.15;
        context.stroke();
        const [x, y] = pointAt(path, (time * 0.00012 + index * 0.31) % 1);
        context.fillStyle = index === 1 ? colors.coral : colors.teal;
        context.fillRect(x - 3, y - 3, 6, 6);
      });
    };

    const drawScanline = (time, colors) => {
      const spacing = Math.max(46, Math.min(70, width / 16));
      context.strokeStyle = colors.line;
      context.lineWidth = 1;
      for (let x = 0; x <= width; x += spacing) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y <= height; y += spacing) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      const scanX = (time * 0.17) % (width + 180) - 90;
      const scanY = height - ((time * 0.095) % (height + 120)) + 60;
      context.fillStyle = colors.teal;
      context.globalAlpha = 0.3;
      context.fillRect(scanX, 0, 3, height);
      context.fillStyle = colors.coral;
      context.fillRect(0, scanY, width, 2);
      context.globalAlpha = 1;
    };

    const drawTrajectory = (time, colors) => {
      const paths = [
        [[0.08, 0.68], [0.26, 0.18], [0.56, 0.86], [0.88, 0.3]],
        [[0.05, 0.38], [0.32, 0.78], [0.58, 0.16], [0.93, 0.66]],
        [[0.15, 0.88], [0.38, 0.48], [0.59, 0.68], [0.84, 0.12]]
      ];
      const cubic = (path, progress) => {
        const inverse = 1 - progress;
        const weights = [inverse ** 3, 3 * inverse ** 2 * progress, 3 * inverse * progress ** 2, progress ** 3];
        return path.reduce((position, point, index) => [
          position[0] + point[0] * weights[index] * width,
          position[1] + point[1] * weights[index] * height
        ], [0, 0]);
      };
      paths.forEach((path, index) => {
        context.beginPath();
        for (let step = 0; step <= 40; step += 1) {
          const [x, y] = cubic(path, step / 40);
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = index === 1 ? colors.coral : colors.line;
        context.lineWidth = index === 1 ? 1.35 : 1;
        context.stroke();
        const [x, y] = cubic(path, (time * 0.00009 + index * 0.27) % 1);
        context.fillStyle = index === 1 ? colors.coral : colors.teal;
        context.fillRect(x - 3, y - 3, 6, 6);
      });
    };

    const drawPixels = (time, colors) => {
      const cell = Math.max(38, Math.min(58, width / 20));
      const columns = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const value = (Math.sin(column * 1.37 + row * 0.91 + time * 0.0011) + 1) / 2;
          const size = 2 + value * 7;
          context.fillStyle = (column + row) % 7 === 0 ? colors.coral : colors.teal;
          context.globalAlpha = 0.09 + value * 0.25;
          context.fillRect(column * cell + (cell - size) / 2, row * cell + (cell - size) / 2, size, size);
        }
      }
      context.globalAlpha = 1;
    };

    const drawContours = (time, colors) => {
      const count = 8;
      for (let line = 0; line < count; line += 1) {
        const baseline = height * 0.1 + (line * height * 0.8) / (count - 1);
        context.beginPath();
        for (let x = -20; x <= width + 20; x += 18) {
          const y = baseline
            + Math.sin((x + time * 0.035) / 100 + line * 0.56) * 25
            + Math.cos((x - time * 0.02) / 48 + line * 0.31) * 9;
          if (x === -20) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = line === 3 || line === 6 ? colors.coral : colors.line;
        context.lineWidth = line === 3 || line === 6 ? 1.2 : 1;
        context.stroke();
      }
    };

    const frame = (time) => {
      if (!running) return;
      context.clearRect(0, 0, width, height);
      const colors = palette();
      if (motionMode === 'trajectory') drawTrajectory(time, colors);
      else drawNetwork(colors);
      frameId = window.requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame(performance.now());
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frameId);
    };
    resize();
    start();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  }
})();
