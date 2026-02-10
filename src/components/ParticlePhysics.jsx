// src/components/ParticlePhysics.jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';

const ParticlePhysics = ({
  bgColor = '#ff00ff',
  modelPath = '/smooth_six_faces_pipe.glb',
  initialCount = 50,
  colors = ['#81C3D7', '#D9DCD6', '#3A7CA5', '#2F6690']
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, z: 0 });
  const guiRef = useRef(null);
  const modelRef = useRef(null);
  const gravityPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const settingsRef = useRef({
    particleCount: initialCount,
    friction: 0.995,
    gravityStrength: 1,
    explosionDistance: 2,
    particleScale: 0.5,
    mouseRadius: 2,
    enableCollisions: true,
    enableMouseCollision: true,
    bounciness: 0.5,
    rotationSpeed: 0.01,
    bgColor: bgColor,
    // Gravity settings
    gravityX: 0,
    gravityY: 0,
    gravityZ: 0,
    followMouse: false,
    // Camera settings
    cameraX: 0,
    cameraY: 0,
    cameraZ: 20,
    cameraLookAtX: 0,
    cameraLookAtY: 0,
    cameraLookAtZ: 0,
    enableOrbitControls: true,
    fov: 75
  });

  // Particle class
  class Particle {
    constructor(model, position, velocity, scale, color) {
      this.mesh = model.clone();
      this.mesh.scale.setScalar(scale);
      this.position = new THREE.Vector3(...position);
      this.velocity = new THREE.Vector3(...velocity);
      this.gravityVelocity = new THREE.Vector3(0, 0, 0);
      this.radius = scale;
      this.rotation = new THREE.Vector3(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      this.rotationVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );

      // Apply color to model
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.set(color);
        }
      });

      this.mesh.position.copy(this.position);
    }

    update(gravityPos, friction, gravityStrength, shouldExplode, settings) {
      // Calculate gravity vector
      const gravityVector = new THREE.Vector3().subVectors(gravityPos, this.position);
      const distance = gravityVector.length();
      
      if (distance > 0.1) {
        const gravityPower = (1 / distance) * gravityStrength;
        this.gravityVelocity.copy(gravityVector.normalize().multiplyScalar(gravityPower * friction));
      }

      // Explode if needed
      if (shouldExplode) {
        this.velocity.x *= (Math.random() - 0.5) * 20;
        this.velocity.y *= (Math.random() - 0.5) * 20;
        this.velocity.z *= (Math.random() - 0.5) * 20;
      }

      // Apply friction
      this.velocity.multiplyScalar(friction);

      // Add gravity
      this.velocity.add(this.gravityVelocity);

      // Update position
      this.position.add(this.velocity);

      // Update rotation
      this.rotation.add(this.rotationVelocity.clone().multiplyScalar(settings.rotationSpeed));

      // Update mesh
      this.mesh.position.copy(this.position);
      this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    }

    checkCollision(other, bounciness) {
      const dx = this.position.x - other.position.x;
      const dy = this.position.y - other.position.y;
      const dz = this.position.z - other.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDistance = this.radius + other.radius;

      if (distance < minDistance) {
        // Collision detected - calculate bounce
        const angle = Math.atan2(dy, dx);
        const targetX = other.position.x + Math.cos(angle) * minDistance;
        const targetY = other.position.y + Math.sin(angle) * minDistance;
        
        const ax = (targetX - this.position.x) * bounciness;
        const ay = (targetY - this.position.y) * bounciness;
        
        this.velocity.x -= ax;
        this.velocity.y -= ay;
        other.velocity.x += ax;
        other.velocity.y += ay;

        // Separate particles
        this.position.x = targetX;
        this.position.y = targetY;
      }
    }

    checkMouseCollision(mousePos, mouseRadius, bounciness) {
      const dx = this.position.x - mousePos.x;
      const dy = this.position.y - mousePos.y;
      const dz = this.position.z - mousePos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDistance = this.radius + mouseRadius;

      if (distance < minDistance) {
        const angle = Math.atan2(dy, dx);
        const force = (minDistance - distance) * bounciness;
        
        this.velocity.x += Math.cos(angle) * force;
        this.velocity.y += Math.sin(angle) * force;
      }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settingsRef.current.bgColor);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      settingsRef.current.fov,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(
      settingsRef.current.cameraX,
      settingsRef.current.cameraY,
      settingsRef.current.cameraZ
    );
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = settingsRef.current.enableOrbitControls;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -10, -10);
    scene.add(directionalLight2);

    // Add a visual indicator for gravity center (optional)
    const gravityIndicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );
    scene.add(gravityIndicator);

    // Load model
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        modelRef.current = gltf.scene;
        initParticles();
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
      }
    );

    // Setup dat.GUI
    const gui = new dat.GUI();
    guiRef.current = gui;

    // Particle Settings Folder
    const particleFolder = gui.addFolder('Particle Settings');
    particleFolder.add(settingsRef.current, 'particleCount', 1, 200, 1).name('Particle Count').onChange(() => {
      if (modelRef.current) initParticles();
    });
    particleFolder.add(settingsRef.current, 'particleScale', 0.1, 2, 0.1).name('Particle Scale').onChange(() => {
      if (modelRef.current) initParticles();
    });
    particleFolder.add(settingsRef.current, 'rotationSpeed', 0, 0.1, 0.001).name('Rotation Speed');
    particleFolder.open();

    // Physics Settings Folder
    const physicsFolder = gui.addFolder('Physics Settings');
    physicsFolder.add(settingsRef.current, 'friction', 0.9, 0.999, 0.001).name('Friction');
    physicsFolder.add(settingsRef.current, 'gravityStrength', 0.1, 5, 0.1).name('Gravity Strength');
    physicsFolder.add(settingsRef.current, 'explosionDistance', 0.1, 5, 0.1).name('Explosion Distance');
    physicsFolder.open();

    // Gravity Settings Folder
    const gravityFolder = gui.addFolder('Gravity Settings');
    gravityFolder.add(settingsRef.current, 'followMouse').name('Follow Mouse').onChange((value) => {
      if (!value) {
        // Reset to center when disabling mouse follow
        settingsRef.current.gravityX = 0;
        settingsRef.current.gravityY = 0;
        settingsRef.current.gravityZ = 0;
      }
    });
    gravityFolder.add(settingsRef.current, 'gravityX', -20, 20, 0.1).name('Gravity X').onChange((value) => {
      gravityPosRef.current.x = value;
      gravityIndicator.position.x = value;
    });
    gravityFolder.add(settingsRef.current, 'gravityY', -20, 20, 0.1).name('Gravity Y').onChange((value) => {
      gravityPosRef.current.y = value;
      gravityIndicator.position.y = value;
    });
    gravityFolder.add(settingsRef.current, 'gravityZ', -20, 20, 0.1).name('Gravity Z').onChange((value) => {
      gravityPosRef.current.z = value;
      gravityIndicator.position.z = value;
    });
    gravityFolder.open();

    // Collision Settings Folder
    const collisionFolder = gui.addFolder('Collision Settings');
    collisionFolder.add(settingsRef.current, 'enableCollisions').name('Particle Collisions');
    collisionFolder.add(settingsRef.current, 'enableMouseCollision').name('Mouse Collision');
    collisionFolder.add(settingsRef.current, 'mouseRadius', 0.5, 5, 0.1).name('Mouse Radius');
    collisionFolder.add(settingsRef.current, 'bounciness', 0.1, 1, 0.05).name('Bounciness');
    collisionFolder.open();

    // Camera Settings Folder
    const cameraFolder = gui.addFolder('Camera Settings');
    cameraFolder.add(settingsRef.current, 'enableOrbitControls').name('Orbit Controls').onChange((value) => {
      controls.enabled = value;
    });
    cameraFolder.add(settingsRef.current, 'fov', 30, 120, 1).name('Field of View').onChange((value) => {
      camera.fov = value;
      camera.updateProjectionMatrix();
    });
    cameraFolder.add(settingsRef.current, 'cameraX', -50, 50, 0.5).name('Camera X').onChange((value) => {
      if (!settingsRef.current.enableOrbitControls) {
        camera.position.x = value;
      }
    });
    cameraFolder.add(settingsRef.current, 'cameraY', -50, 50, 0.5).name('Camera Y').onChange((value) => {
      if (!settingsRef.current.enableOrbitControls) {
        camera.position.y = value;
      }
    });
    cameraFolder.add(settingsRef.current, 'cameraZ', -50, 50, 0.5).name('Camera Z').onChange((value) => {
      if (!settingsRef.current.enableOrbitControls) {
        camera.position.z = value;
      }
    });
    cameraFolder.add(settingsRef.current, 'cameraLookAtX', -20, 20, 0.5).name('Look At X').onChange((value) => {
      if (!settingsRef.current.enableOrbitControls) {
        camera.lookAt(value, settingsRef.current.cameraLookAtY, settingsRef.current.cameraLookAtZ);
      }
    });
    cameraFolder.add(settingsRef.current, 'cameraLookAtY', -20, 20, 0.5).name('Look At Y').onChange((value) => {
      if (!settingsRef.current.enableOrbitControls) {
        camera.lookAt(settingsRef.current.cameraLookAtX, value, settingsRef.current.cameraLookAtZ);
      }
    });
    cameraFolder.add(settingsRef.current, 'cameraLookAtZ', -20, 20, 0.5).name('Look At Z').onChange((value) => {
      if (!settingsRef.current.enableOrbitControls) {
        camera.lookAt(settingsRef.current.cameraLookAtX, settingsRef.current.cameraLookAtY, value);
      }
    });
    cameraFolder.open();

    // Visual Settings Folder
    const visualFolder = gui.addFolder('Visual Settings');
    visualFolder.addColor(settingsRef.current, 'bgColor').name('Background Color').onChange((value) => {
      scene.background.set(value);
    });
    visualFolder.open();

    // Mouse move handler
    const handleMouseMove = (event) => {
      if (!settingsRef.current.followMouse) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      mouseRef.current.x = x * 15;
      mouseRef.current.y = y * 15;
      mouseRef.current.z = 0;

      // Update gravity position when following mouse
      gravityPosRef.current.x = mouseRef.current.x;
      gravityPosRef.current.y = mouseRef.current.y;
      gravityPosRef.current.z = mouseRef.current.z;

      // Update gravity indicator
      gravityIndicator.position.copy(gravityPosRef.current);

      // Update GUI values
      settingsRef.current.gravityX = mouseRef.current.x;
      settingsRef.current.gravityY = mouseRef.current.y;
      settingsRef.current.gravityZ = mouseRef.current.z;

      // Update GUI display
      gui.updateDisplay();
    };

    const handleMouseOut = () => {
      // Don't reset to center when mouse leaves
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let shouldExplode = false;
    const animate = () => {
      requestAnimationFrame(animate);

      // Update orbit controls
      if (controlsRef.current && settingsRef.current.enableOrbitControls) {
        controlsRef.current.update();
      }

      // Use gravity position from ref (either center or mouse position)
      const gravityPos = gravityPosRef.current.clone();

      // Update gravity indicator position
      gravityIndicator.position.copy(gravityPos);

      // Update particles
      particlesRef.current.forEach((particle) => {
        particle.update(
          gravityPos,
          settingsRef.current.friction,
          settingsRef.current.gravityStrength,
          shouldExplode,
          settingsRef.current
        );
      });

      // Check collisions between particles
      if (settingsRef.current.enableCollisions) {
        for (let i = 0; i < particlesRef.current.length; i++) {
          for (let j = i + 1; j < particlesRef.current.length; j++) {
            particlesRef.current[i].checkCollision(
              particlesRef.current[j],
              settingsRef.current.bounciness
            );
          }
        }
      }

      // Check mouse collisions
      if (settingsRef.current.enableMouseCollision) {
        particlesRef.current.forEach((particle) => {
          particle.checkMouseCollision(
            mouseRef.current,
            settingsRef.current.mouseRadius,
            settingsRef.current.bounciness
          );
        });
      }

      // Calculate if should explode
      let totalVel = 0;
      particlesRef.current.forEach((p) => {
        totalVel += Math.abs(p.velocity.x) + Math.abs(p.velocity.y) + Math.abs(p.velocity.z);
      });
      shouldExplode = totalVel / particlesRef.current.length < settingsRef.current.explosionDistance;

      renderer.render(scene, camera);
    };

    animate();

    // Initialize particles
    const initParticles = () => {
      if (!modelRef.current) return;

      // Remove old particles
      particlesRef.current.forEach((p) => {
        scene.remove(p.mesh);
      });
      particlesRef.current = [];

      // Create new particles
      for (let i = 0; i < settingsRef.current.particleCount; i++) {
        const position = [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 10
        ];
        const velocity = [
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const particle = new Particle(
          modelRef.current,
          position,
          velocity,
          settingsRef.current.particleScale,
          color
        );
        
        particlesRef.current.push(particle);
        scene.add(particle.mesh);
      }
    };

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
      
      if (guiRef.current) {
        guiRef.current.destroy();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, [modelPath, colors]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100vh',
        overflow: 'hidden'
      }} 
    />
  );
};

export default ParticlePhysics;