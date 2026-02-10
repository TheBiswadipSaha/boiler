import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LiquidShader({ children, className = '', style = {} }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    // Configuration
    const simScale = 0.6;
    const waveSpeed = 1.1;
    const damping = 0.95;
    const rippleSize = 20;

    // Get container dimensions
    const getContainerSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };

    // Text-canvas setup
    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');

    function drawContent() {
      const { width: w, height: h } = getContainerSize();
      textCanvas.width = w;
      textCanvas.height = h;
      textCtx.clearRect(0, 0, w, h);

      const contentDiv = contentRef.current;
      if (!contentDiv) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Recursive function to draw all elements
      function drawElement(element) {
        if (!element || element.nodeType !== 1) return; // Only process element nodes

        const rect = element.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        const width = rect.width;
        const height = rect.height;

        // Skip if element has no dimensions or is outside bounds
        if (width <= 0 || height <= 0) return;

        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        const bgImage = computedStyle.backgroundImage;
        const borderRadius = parseInt(computedStyle.borderRadius) || 0;

        // Draw background if element has one
        const hasBackground = (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') || 
                             (bgImage && bgImage !== 'none');

        if (hasBackground) {
          textCtx.save();

          // Draw shadow if exists
          const shadowColor = computedStyle.boxShadow;
          if (shadowColor && shadowColor !== 'none') {
            textCtx.shadowColor = 'rgba(102, 126, 234, 0.4)';
            textCtx.shadowBlur = 30;
            textCtx.shadowOffsetX = 0;
            textCtx.shadowOffsetY = 10;
          }

          // Draw background with border radius
          if (borderRadius > 0) {
            const radius = Math.min(borderRadius, width / 2, height / 2);
            textCtx.beginPath();
            textCtx.moveTo(x + radius, y);
            textCtx.lineTo(x + width - radius, y);
            textCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
            textCtx.lineTo(x + width, y + height - radius);
            textCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            textCtx.lineTo(x + radius, y + height);
            textCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
            textCtx.lineTo(x, y + radius);
            textCtx.quadraticCurveTo(x, y, x + radius, y);
            textCtx.closePath();
          } else {
            textCtx.beginPath();
            textCtx.rect(x, y, width, height);
          }

          // Fill background
          if (bgImage && bgImage.includes('gradient')) {
            const gradient = textCtx.createLinearGradient(x, y, x + width, y + height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            textCtx.fillStyle = gradient;
          } else if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            textCtx.fillStyle = bgColor;
          }

          textCtx.fill();
          textCtx.restore();
        }

        // Draw text content if element has direct text (not in children)
        const textContent = Array.from(element.childNodes)
          .filter(node => node.nodeType === 3) // Text nodes only
          .map(node => node.textContent.trim())
          .join(' ')
          .trim();

        if (textContent) {
          textCtx.save();

          const fontSize = parseInt(computedStyle.fontSize) || 16;
          const fontWeight = computedStyle.fontWeight || 'normal';
          const fontFamily = computedStyle.fontFamily || 'Arial, sans-serif';
          const color = computedStyle.color || '#000000';
          const textAlign = computedStyle.textAlign || 'left';

          textCtx.fillStyle = color;
          textCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          
          // Set text alignment
          let textX = x;
          if (textAlign === 'center' || element.tagName === 'BUTTON') {
            textCtx.textAlign = 'center';
            textX = x + width / 2;
          } else if (textAlign === 'right') {
            textCtx.textAlign = 'right';
            textX = x + width;
          } else {
            textCtx.textAlign = 'left';
            textX = x + parseInt(computedStyle.paddingLeft) || x;
          }

          textCtx.textBaseline = 'middle';

          // Add text shadow for better readability
          textCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          textCtx.shadowBlur = 2;
          textCtx.shadowOffsetX = 0;
          textCtx.shadowOffsetY = 1;

          const textY = y + height / 2;
          textCtx.fillText(textContent, textX, textY);
          textCtx.restore();
        }

        // Recursively draw children
        Array.from(element.children).forEach(child => drawElement(child));
      }

      // Start drawing from content div's children
      Array.from(contentDiv.children).forEach(child => drawElement(child));

      if (textTexture) {
        textTexture.needsUpdate = true;
      }
    }

    // THREE.js / WebGL setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: false });
    
    const updateRendererSize = () => {
      const { width, height } = getContainerSize();
      renderer.setSize(width, height);
      return { width, height };
    };
    
    updateRendererSize();
    
    canvasRef.current = renderer.domElement;
    renderer.domElement.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
    containerRef.current.insertBefore(renderer.domElement, containerRef.current.firstChild);

    const isWebGL2 = (renderer.capabilities && renderer.capabilities.isWebGL2) || false;

    let rtType = THREE.HalfFloatType;
    if (isWebGL2) {
      try { rtType = THREE.FloatType; } catch (e) { rtType = THREE.HalfFloatType; }
    } else {
      rtType = (THREE.HalfFloatType !== undefined) ? THREE.HalfFloatType : THREE.UnsignedByteType;
    }

    const getResolution = () => {
      const { width, height } = getContainerSize();
      return new THREE.Vector2(
        Math.max(1, Math.floor(width * simScale)),
        Math.max(1, Math.floor(height * simScale))
      );
    };

    let resolution = getResolution();

    let renderTargetA = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: rtType
    });
    let renderTargetB = renderTargetA.clone();

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.needsUpdate = true;

    // Shaders
    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uResolution: { value: new THREE.Vector2(resolution.x, resolution.y) },
        uMouse: { value: new THREE.Vector3(-1, -1, 0) },
        uDelta: { value: waveSpeed },
        uDamping: { value: damping },
        uRippleSize: { value: rippleSize },
        uShockwave: { value: 0.0 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D uTexture; uniform vec2 uResolution; uniform vec3 uMouse; uniform float uDelta; uniform float uDamping; uniform float uRippleSize; uniform float uShockwave; varying vec2 vUv;
void main(){
    vec2 texel = 1.0 / uResolution;
    vec2 coord = vUv;
    vec4 data = texture2D(uTexture, coord);
    float pressure = data.x; float velocity = data.y;
    float p_right = texture2D(uTexture, coord + vec2(texel.x, 0.0)).x;
    float p_left = texture2D(uTexture, coord + vec2(-texel.x, 0.0)).x;
    float p_up = texture2D(uTexture, coord + vec2(0.0, texel.y)).x;
    float p_down = texture2D(uTexture, coord + vec2(0.0, -texel.y)).x;
    if (coord.x < texel.x) p_left = p_right;
    if (coord.x > 1.0 - texel.x) p_right = p_left;
    if (coord.y < texel.y) p_down = p_up;
    if (coord.y > 1.0 - texel.y) p_up = p_down;
    velocity += uDelta * (-2.0 * pressure + p_right + p_left) / 3.0;
    velocity += uDelta * (-2.0 * pressure + p_up + p_down) / 3.0;
    pressure += uDelta * velocity * 1.2;
    velocity -= 0.001 * uDelta * pressure;
    velocity *= 1.0 - 0.005 * uDelta;
    pressure *= uDamping;
    float gradX = (p_right - p_left) / 2.0;
    float gradY = (p_up - p_down) / 2.0;
    gl_FragColor = vec4(pressure, velocity, gradX, gradY);
    if (uMouse.z > 0.5) {
        float dist = distance(coord * uResolution, uMouse.xy);
        if (dist <= uRippleSize) { gl_FragColor.x += (1.0 - dist / uRippleSize) * 1.2; }
    }
    if (uShockwave > 0.5) {
        float dist = distance(coord * uResolution, uMouse.xy);
        float shockwaveRadius = uRippleSize * 2.0;
        float shockwaveThickness = 20.0;
        float distFromShockwave = abs(dist - shockwaveRadius);
        if (distFromShockwave < shockwaveThickness) {
            float shockStrength = (1.0 - distFromShockwave / shockwaveThickness);
            shockStrength = pow(shockStrength, 1.5);
            gl_FragColor.x += shockStrength * 0.5;
        }
    }
}`
    });

    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uContentTexture: { value: textTexture },
        uResolution: { value: new THREE.Vector2(getContainerSize().width, getContainerSize().height) }
      },
      transparent: true,
      blending: THREE.NormalBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D uTexture; uniform sampler2D uContentTexture; uniform vec2 uResolution; varying vec2 vUv;
void main(){
    vec4 data = texture2D(uTexture, vUv);
    vec2 distortion = data.zw * 0.25;
    vec2 distortedUV = vUv + distortion;
    vec4 content = texture2D(uContentTexture, distortedUV);
    vec3 color = content.rgb;
    float waveHeight = abs(data.x);
    color += vec3(1.0) * max(0.0, data.x) * 0.1;
    vec3 normal = normalize(vec3(-data.z * 3.5, 0.4, -data.w * 3.5));
    vec3 lightDir = normalize(vec3(-2.5,6.0,2.5));
    float spec = pow(max(0.0, dot(normal, lightDir)), 200.0);
    color += vec3(1.0,1.0,1.0) * spec * 1.0;
    float spec2 = pow(max(0.0, dot(normal, lightDir)), 100.0);
    color += vec3(1.0,0.98,0.95) * spec2 * 0.5;
    float caustic = sin(waveHeight * 20.0) * 0.5 + 0.5;
    color += vec3(1.0,0.95,0.9) * caustic * waveHeight * 0.08;
    float waterAlpha = 0.12 + waveHeight * 0.3 + spec * 0.5 + length(distortion) * 0.8;
    waterAlpha = clamp(waterAlpha, 0.08, 0.6);
    float alpha = max(content.a, waterAlpha);
    gl_FragColor = vec4(color, alpha);
}`
    });

    // Geometry / Mesh
    const geometry = new THREE.PlaneGeometry(2, 2);
    const simMesh = new THREE.Mesh(geometry, simMaterial);
    const displayMesh = new THREE.Mesh(geometry, displayMaterial);

    let currentTarget = renderTargetA;
    let previousTarget = renderTargetB;

    // Mouse / Input
    const mouse = new THREE.Vector2(-1, -1);
    const prevMouse = new THREE.Vector2(-1, -1);
    const prevPrevMouse = new THREE.Vector2(-1, -1);
    let isMouseActive = false;
    let shouldTriggerShockwave = false;
    let shockwaveTime = 0;

    function updateMouseFromEvent(ev) {
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = (ev.clientX - rect.left) * simScale;
      mouse.y = (rect.height - (ev.clientY - rect.top)) * simScale;
    }

    const container = containerRef.current;

    container.addEventListener('mouseenter', () => isMouseActive = true);
    container.addEventListener('mouseleave', () => isMouseActive = false);
    container.addEventListener('mousemove', (e) => { isMouseActive = true; updateMouseFromEvent(e); });
    container.addEventListener('touchstart', (e) => {
      isMouseActive = true;
      const t = e.touches[0];
      updateMouseFromEvent(t);
    }, { passive: true });
    container.addEventListener('touchmove', (e) => {
      isMouseActive = true;
      updateMouseFromEvent(e.touches[0]);
    }, { passive: true });
    container.addEventListener('touchend', () => { isMouseActive = false; });

    // Water animation loop
    let animationId;
    function animateWater() {
      animationId = requestAnimationFrame(animateWater);

      const mouseMoved = Math.abs(mouse.x - prevMouse.x) > 0.5 || Math.abs(mouse.y - prevMouse.y) > 0.5;

      if (isMouseActive) {
        const dx = mouse.x - prevMouse.x;
        const dy = mouse.y - prevMouse.y;
        const prevDx = prevMouse.x - prevPrevMouse.x;
        const prevDy = prevMouse.y - prevPrevMouse.y;
        const movement = Math.sqrt(dx * dx + dy * dy);
        const prevMovement = Math.sqrt(prevDx * prevDx + prevDy * prevDy);

        if (prevMovement > 2 && movement < 1) {
          shouldTriggerShockwave = true;
          shockwaveTime = 0;
        }
        if (movement > 1 && prevMovement > 1) {
          const dot = dx * prevDx + dy * prevDy;
          const denom = Math.max(0.0001, movement * prevMovement);
          const angle = Math.acos(Math.min(1, Math.max(-1, dot / denom)));
          if (angle > Math.PI / 3) {
            shouldTriggerShockwave = true;
            shockwaveTime = 0;
          }
        }
      }

      if (shockwaveTime < 10) shockwaveTime++;

      simMaterial.uniforms.uTexture.value = previousTarget.texture;
      simMaterial.uniforms.uMouse.value.set(mouse.x, mouse.y, (isMouseActive && mouseMoved) ? 1 : 0);
      simMaterial.uniforms.uDelta.value = waveSpeed;
      simMaterial.uniforms.uDamping.value = damping;
      simMaterial.uniforms.uRippleSize.value = rippleSize;
      simMaterial.uniforms.uShockwave.value = (shouldTriggerShockwave && shockwaveTime < 2) ? 1.0 : 0.0;

      renderer.setRenderTarget(currentTarget);
      scene.add(simMesh);
      renderer.render(scene, camera);
      scene.remove(simMesh);

      displayMaterial.uniforms.uTexture.value = currentTarget.texture;
      const size = getContainerSize();
      displayMaterial.uniforms.uResolution.value.set(size.width, size.height);
      renderer.setRenderTarget(null);
      scene.add(displayMesh);
      renderer.render(scene, camera);
      scene.remove(displayMesh);

      [currentTarget, previousTarget] = [previousTarget, currentTarget];

      prevPrevMouse.copy(prevMouse);
      prevMouse.copy(mouse);

      if (shockwaveTime > 3) shouldTriggerShockwave = false;
    }

    // Resize handling
    function onResize() {
      const size = updateRendererSize();
      resolution = getResolution();
      renderTargetA.setSize(resolution.x, resolution.y);
      renderTargetB.setSize(resolution.x, resolution.y);
      simMaterial.uniforms.uResolution.value.set(resolution.x, resolution.y);
      textCanvas.width = size.width;
      textCanvas.height = size.height;
      setTimeout(() => drawContent(), 100);
    }

    window.addEventListener('resize', onResize);

    // Initial canvas setup
    const initialSize = getContainerSize();
    textCanvas.width = initialSize.width;
    textCanvas.height = initialSize.height;
    
    // Draw content after delays to ensure DOM is ready
    setTimeout(() => drawContent(), 100);
    setTimeout(() => drawContent(), 300);
    setTimeout(() => drawContent(), 600);

    animateWater();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      
      if (container) {
        container.removeEventListener('mouseenter', () => isMouseActive = true);
        container.removeEventListener('mouseleave', () => isMouseActive = false);
        container.removeEventListener('mousemove', updateMouseFromEvent);
        container.removeEventListener('touchstart', updateMouseFromEvent);
        container.removeEventListener('touchmove', updateMouseFromEvent);
        container.removeEventListener('touchend', () => isMouseActive = false);
      }
      
      renderer.dispose();
      geometry.dispose();
      simMaterial.dispose();
      displayMaterial.dispose();
      renderTargetA.dispose();
      renderTargetB.dispose();
      textTexture.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#000000',
        ...style
      }}
    >
      <div ref={contentRef} style={{ visibility: 'hidden', position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
}