import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LiquidShader({ children, className = '', style = {} }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const animationFrameRef = useRef(null);

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

    // THREE.js / WebGL setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      premultipliedAlpha: false,
      preserveDrawingBuffer: true 
    });
    
    const updateRendererSize = () => {
      const { width, height } = getContainerSize();
      renderer.setSize(width, height);
      return { width, height };
    };
    
    updateRendererSize();
    
    canvasRef.current = renderer.domElement;
    renderer.domElement.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;';
    containerRef.current.appendChild(renderer.domElement);

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

    // Create texture from child canvas
    let contentTexture = null;
    let childCanvas = null;

    function updateContentTexture() {
      // Find the child canvas element
      const canvas = contentRef.current?.querySelector('canvas');
      
      if (canvas && canvas !== childCanvas) {
        childCanvas = canvas;
        // Create texture from the child canvas
        contentTexture = new THREE.CanvasTexture(canvas);
        contentTexture.minFilter = THREE.LinearFilter;
        contentTexture.magFilter = THREE.LinearFilter;
        displayMaterial.uniforms.uContentTexture.value = contentTexture;
      }
      
      if (contentTexture && childCanvas) {
        contentTexture.needsUpdate = true;
      }
    }

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
    velocity *= 1.0 - 0.005 * uDelta;
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
        uContentTexture: { value: null },
        uResolution: { value: new THREE.Vector2(getContainerSize().width, getContainerSize().height) }
      },
      transparent: true,
      blending: THREE.NormalBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D uTexture; uniform sampler2D uContentTexture; uniform vec2 uResolution; varying vec2 vUv;
void main(){
    vec4 data = texture2D(uTexture, vUv);
    vec2 distortion = data.zw * 0.3;
    vec2 distortedUV = vUv + distortion;
    
    // Sample the content texture with distortion
    vec4 content = texture2D(uContentTexture, distortedUV);
    vec3 color = content.rgb;
    
    float waveHeight = abs(data.x);
    
    // Add brightness where water is raised
    color += vec3(1.0) * max(0.0, data.x) * 0.15;
    
    // Calculate normal from gradients for specular lighting
    vec3 normal = normalize(vec3(-data.z * 4.0, 0.5, -data.w * 4.0));
    vec3 lightDir = normalize(vec3(-2.5, 6.0, 2.5));
    
    // Sharp specular highlights
    float spec = pow(max(0.0, dot(normal, lightDir)), 200.0);
    color += vec3(1.0, 1.0, 1.0) * spec * 1.2;
    
    // Softer specular
    float spec2 = pow(max(0.0, dot(normal, lightDir)), 100.0);
    color += vec3(1.0, 0.98, 0.95) * spec2 * 0.6;
    
    // Caustic effect
    float caustic = sin(waveHeight * 25.0) * 0.5 + 0.5;
    color += vec3(1.0, 0.95, 0.9) * caustic * waveHeight * 0.1;
    
    // Calculate alpha - make water visible especially where there's distortion
    float waterAlpha = 0.15 + waveHeight * 0.4 + spec * 0.6 + length(distortion) * 1.0;
    waterAlpha = clamp(waterAlpha, 0.1, 0.7);
    
    // If content has alpha, respect it
    float finalAlpha = content.a > 0.01 ? max(content.a, waterAlpha) : waterAlpha;
    
    gl_FragColor = vec4(color, finalAlpha);
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

    const handleMouseEnter = () => { isMouseActive = true; };
    const handleMouseLeave = () => { isMouseActive = false; };
    const handleMouseMove = (e) => { isMouseActive = true; updateMouseFromEvent(e); };
    const handleTouchStart = (e) => {
      isMouseActive = true;
      const t = e.touches[0];
      updateMouseFromEvent(t);
    };
    const handleTouchMove = (e) => {
      isMouseActive = true;
      updateMouseFromEvent(e.touches[0]);
    };
    const handleTouchEnd = () => { isMouseActive = false; };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    // Animation loop
    let frameCount = 0;
    function animateWater() {
      animationFrameRef.current = requestAnimationFrame(animateWater);

      // Update content texture from child canvas
      updateContentTexture();

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

      // Simulate water physics
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

      // Display with distortion
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
      
      frameCount++;
    }

    // Resize handling
    function onResize() {
      const size = updateRendererSize();
      resolution = getResolution();
      renderTargetA.setSize(resolution.x, resolution.y);
      renderTargetB.setSize(resolution.x, resolution.y);
      simMaterial.uniforms.uResolution.value.set(resolution.x, resolution.y);
    }

    window.addEventListener('resize', onResize);

    // Start after a small delay to ensure child canvas is ready
    setTimeout(() => {
      updateContentTexture();
      animateWater();
    }, 100);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', onResize);
      
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      
      renderer.dispose();
      geometry.dispose();
      simMaterial.dispose();
      displayMaterial.dispose();
      renderTargetA.dispose();
      renderTargetB.dispose();
      if (contentTexture) contentTexture.dispose();
      if (renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

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
      <div ref={contentRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}