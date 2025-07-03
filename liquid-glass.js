(function() {
  'use strict';

  if (!window.liquidGlassInstances) {
    window.liquidGlassInstances = [];
  }

  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function roundedRectSDF(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;
    return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
  }

  function texture(x, y) {
    return { type: 't', x, y };
  }

  function generateId() {
    return 'liquid-glass-' + Math.random().toString(36).substr(2, 9);
  }

  class Shader {
    constructor(element, options = {}) {
      this.element = element;
      const rect = this.element.getBoundingClientRect();
      
      this.width = Math.round(rect.width);
      this.height = Math.round(rect.height);

      if (this.width === 0 || this.height === 0) {
        console.warn('Liquid Glass effect skipped for a zero-sized element.', this.element);
        return;
      }

      this.fragment = options.fragment || ((uv) => texture(uv.x, uv.y));
      this.canvasDPI = 1;
      this.id = generateId();
      this.offset = 10;

      this.mouse = { x: 0, y: 0 };
      this.mouseUsed = false;

      this.applyEffect(); 
      this.setupEventListeners();
      this.updateShader();
    }

    applyEffect() {
      this.element.style.backdropFilter = `url(#${this.id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`;
      this.element.style.webkitBackdropFilter = `url(#${this.id}_filter) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`;
      this.element.style.zIndex = this.element.style.zIndex || '999'; 
      this.element.style.pointerEvents = 'auto';

      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.setAttribute('width', '0');
      this.svg.setAttribute('height', '0');
      this.svg.style.cssText = `position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9998;`;

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', `${this.id}_filter`);
      filter.setAttribute('filterUnits', 'userSpaceOnUse');
      filter.setAttribute('colorInterpolationFilters', 'sRGB');
      filter.setAttribute('x', '0');
      filter.setAttribute('y', '0');
      filter.setAttribute('width', this.width.toString());
      filter.setAttribute('height', this.height.toString());

      this.feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
      this.feImage.setAttribute('id', `${this.id}_map`);
      this.feImage.setAttribute('width', this.width.toString());
      this.feImage.setAttribute('height', this.height.toString());

      this.feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
      this.feDisplacementMap.setAttribute('in', 'SourceGraphic');
      this.feDisplacementMap.setAttribute('in2', `${this.id}_map`);
      this.feDisplacementMap.setAttribute('xChannelSelector', 'R');
      this.feDisplacementMap.setAttribute('yChannelSelector', 'G');

      filter.appendChild(this.feImage);
      filter.appendChild(this.feDisplacementMap);
      defs.appendChild(filter);
      this.svg.appendChild(defs);

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.width * this.canvasDPI;
      this.canvas.height = this.height * this.canvasDPI;
      this.canvas.style.display = 'none';
      this.context = this.canvas.getContext('2d');
      
      document.body.appendChild(this.svg);
      document.body.appendChild(this.canvas);
    }

    constrainPosition(x, y) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const minX = this.offset;
      const maxX = viewportWidth - this.width - this.offset;
      const minY = this.offset;
      const maxY = viewportHeight - this.height - this.offset;
      const constrainedX = Math.max(minX, Math.min(maxX, x));
      const constrainedY = Math.max(minY, Math.min(maxY, y));
      return { x: constrainedX, y: constrainedY };
    }

    setupEventListeners() {
      let isDragging = false;
      let startX, startY, initialX, initialY;

      this.element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          const newX = initialX + deltaX;
          const newY = initialY + deltaY;
          const constrained = this.constrainPosition(newX, newY);
          
          this.element.style.left = constrained.x + 'px';
          this.element.style.top = constrained.y + 'px';
          this.element.style.transform = 'none'; 
        }
        const rect = this.element.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) / rect.width;
        this.mouse.y = (e.clientY - rect.top) / rect.height;
        if (this.mouseUsed) {
          this.updateShader();
        }
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
        }
      });

      window.addEventListener('resize', () => {
        const rect = this.element.getBoundingClientRect();
        const constrained = this.constrainPosition(rect.left, rect.top);
        if (rect.left !== constrained.x || rect.top !== constrained.y) {
          this.element.style.left = constrained.x + 'px';
          this.element.style.top = constrained.y + 'px';
          this.element.style.transform = 'none';
        }
      });
    }

    updateShader() {
        const mouseProxy = new Proxy(this.mouse, {
            get: (target, prop) => {
                this.mouseUsed = true;
                return target[prop];
            }
        });
        this.mouseUsed = false;
        const w = this.width * this.canvasDPI;
        const h = this.height * this.canvasDPI;
        const data = new Uint8ClampedArray(w * h * 4);
        let maxScale = 0;
        const rawValues = [];
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % w;
            const y = Math.floor(i / 4 / w);
            const pos = this.fragment({ x: x / w, y: y / h }, mouseProxy);
            const dx = pos.x * w - x;
            const dy = pos.y * h - y;
            maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
            rawValues.push(dx, dy);
        }
        maxScale *= 0.5;
        let index = 0;
        for (let i = 0; i < data.length; i += 4) {
            const r = rawValues[index++] / maxScale + 0.5;
            const g = rawValues[index++] / maxScale + 0.5;
            data[i] = r * 255;
            data[i + 1] = g * 255;
            data[i + 2] = 0;
            data[i + 3] = 255;
        }
        this.context.putImageData(new ImageData(data, w, h), 0, 0);
        this.feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.canvas.toDataURL());
        this.feDisplacementMap.setAttribute('scale', (maxScale / this.canvasDPI).toString());
    }
    
    destroy() {
      this.svg.remove();
      this.canvas.remove();
      this.element.style.backdropFilter = '';
      this.element.style.webkitBackdropFilter = '';
      this.element.style.cursor = '';
    }
  }

  function initLiquidGlass() {
    if (window.liquidGlassInstances.length) {
      console.log('Previous liquid glass effects removed.');
      window.liquidGlassInstances.forEach(instance => instance.destroy());
      window.liquidGlassInstances = [];
    }

    const elements = document.querySelectorAll('.liquid-glass');
    if (elements.length === 0) {
        console.warn('No elements with class "liquid-glass" found.');
        return;
    }

    elements.forEach(el => {
      const shader = new Shader(el, {
        fragment: (uv, mouse) => {
          const ix = uv.x - 0.5;
          const iy = uv.y - 0.5;
          const rectAspectRatio = el.offsetWidth / el.offsetHeight;
          const sdfWidth = 0.5;
          const sdfHeight = 0.5 / rectAspectRatio; 

          const distanceToEdge = roundedRectSDF(
            ix,
            iy,
            sdfWidth - 0.2, 
            sdfHeight - 0.2,
            0.6
          );
          const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
          const scaled = smoothStep(0, 1, displacement);
          return texture(ix * scaled + 0.5, iy * scaled + 0.5);
        }
      });
      window.liquidGlassInstances.push(shader);
    });

    console.log(`Liquid Glass effect created on ${elements.length} element(s)!`);
  }
  
  document.addEventListener('DOMContentLoaded', initLiquidGlass);

})();
