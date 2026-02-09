import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createJackGeometry, createJackMaterial } from './JackGeometry';

export default function Ballpit({
  objectCount = 18,
  minSize = 0.7,
  maxSize = 1.4,
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  gravity = 0,
  friction = 0.998,
  wallBounce = 0.88,
  maxVelocity = 0.22,
  mouseForce = 35,
  mouseRadius = 2.5,
  style = {},
  className = ''
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const objectsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0, isMoving: false });
  const boundsRef = useRef({ maxX: 100, maxY: 100, maxZ: 100 });
  const rafRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup - closer and wider FOV for full-screen coverage
    const camera = new THREE.PerspectiveCamera(
      70, // FOV
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 14;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup for metallic materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xff9ffc, 0.5);
    directionalLight2.position.set(-5, -3, 3);
    scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0x5227ff, 0.6);
    directionalLight3.position.set(0, -5, -3);
    scene.add(directionalLight3);

    // Point light for extra highlights
    const pointLight = new THREE.PointLight(0xb19eef, 1, 50);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    // Calculate world boundaries based on camera
    const calculateBounds = () => {
      const aspect = window.innerWidth / window.innerHeight;
      const vFov = (camera.fov * Math.PI) / 180;
      const planeHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
      const planeWidth = planeHeight * aspect;
      
      // Use 85% of visible area to keep objects on screen
      boundsRef.current = {
        maxX: (planeWidth / 2) * 0.85,
        maxY: (planeHeight / 2) * 0.85,
        maxZ: 3.5
      };
    };
    calculateBounds();

    // Create jack objects with physics properties
    const objects = [];
    const jackGeometry = createJackGeometry({
      armLength: 1.2,
      armRadius: 0.18,
      centerRadius: 0.3
    });

    for (let i = 0; i < objectCount; i++) {
      const color = colors[i % colors.length];
      const material = createJackMaterial(color);
      const mesh = new THREE.Mesh(jackGeometry, material);

      // Random size
      const scale = minSize + Math.random() * (maxSize - minSize);
      mesh.scale.setScalar(scale);

      // Random position within bounds
      mesh.position.x = (Math.random() - 0.5) * boundsRef.current.maxX * 1.8;
      mesh.position.y = (Math.random() - 0.5) * boundsRef.current.maxY * 1.8;
      mesh.position.z = (Math.random() - 0.5) * boundsRef.current.maxZ * 2;

      // Random rotation
      mesh.rotation.x = Math.random() * Math.PI * 2;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;

      // Physics properties
      mesh.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      mesh.userData.angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
      mesh.userData.radius = scale * 1.2; // Approximate bounding radius

      scene.add(mesh);
      objects.push(mesh);
    }
    objectsRef.current = objects;

    // Mouse tracking
    const onMouseMove = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.isMoving = true;

      // Convert to world coordinates
      const vector = new THREE.Vector3(mouseRef.current.x, mouseRef.current.y, 0.5);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      mouseRef.current.worldX = pos.x;
      mouseRef.current.worldY = pos.y;

      setTimeout(() => {
        mouseRef.current.isMoving = false;
      }, 100);
    };

    window.addEventListener('mousemove', onMouseMove);

    // Physics update function
    const updatePhysics = () => {
      const bounds = boundsRef.current;

      objects.forEach((obj, i) => {
        const vel = obj.userData.velocity;
        const angVel = obj.userData.angularVelocity;

        // Apply gravity
        vel.y -= gravity * 0.016;

        // Apply mouse force
        if (mouseRef.current.isMoving) {
          const dx = obj.position.x - mouseRef.current.worldX;
          const dy = obj.position.y - mouseRef.current.worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRadius) {
            const force = (1 - dist / mouseRadius) * mouseForce;
            vel.x += (dx / dist) * force * 0.016;
            vel.y += (dy / dist) * force * 0.016;
          }
        }

        // Collision with other objects
        for (let j = i + 1; j < objects.length; j++) {
          const other = objects[j];
          const dx = other.position.x - obj.position.x;
          const dy = other.position.y - obj.position.y;
          const dz = other.position.z - obj.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const minDist = obj.userData.radius + other.userData.radius;

          if (dist < minDist) {
            // Collision response
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            // Separate objects
            obj.position.x -= nx * overlap * 0.5;
            obj.position.y -= ny * overlap * 0.5;
            obj.position.z -= nz * overlap * 0.5;
            other.position.x += nx * overlap * 0.5;
            other.position.y += ny * overlap * 0.5;
            other.position.z += nz * overlap * 0.5;

            // Exchange velocities (simplified elastic collision)
            const relVelX = vel.x - other.userData.velocity.x;
            const relVelY = vel.y - other.userData.velocity.y;
            const relVelZ = vel.z - other.userData.velocity.z;
            const dotProduct = relVelX * nx + relVelY * ny + relVelZ * nz;

            if (dotProduct < 0) {
              const impulse = dotProduct * 0.9; // Bounce factor
              vel.x -= nx * impulse;
              vel.y -= ny * impulse;
              vel.z -= nz * impulse;
              other.userData.velocity.x += nx * impulse;
              other.userData.velocity.y += ny * impulse;
              other.userData.velocity.z += nz * impulse;
            }
          }
        }

        // Wall collisions
        if (obj.position.x > bounds.maxX) {
          obj.position.x = bounds.maxX;
          vel.x *= -wallBounce;
        } else if (obj.position.x < -bounds.maxX) {
          obj.position.x = -bounds.maxX;
          vel.x *= -wallBounce;
        }

        if (obj.position.y > bounds.maxY) {
          obj.position.y = bounds.maxY;
          vel.y *= -wallBounce;
        } else if (obj.position.y < -bounds.maxY) {
          obj.position.y = -bounds.maxY;
          vel.y *= -wallBounce;
        }

        if (obj.position.z > bounds.maxZ) {
          obj.position.z = bounds.maxZ;
          vel.z *= -wallBounce;
        } else if (obj.position.z < -bounds.maxZ) {
          obj.position.z = -bounds.maxZ;
          vel.z *= -wallBounce;
        }

        // Apply friction
        vel.multiplyScalar(friction);
        angVel.multiplyScalar(friction);

        // Limit velocity
        const speed = vel.length();
        if (speed > maxVelocity) {
          vel.multiplyScalar(maxVelocity / speed);
        }

        // Update position and rotation
        obj.position.add(vel);
        obj.rotation.x += angVel.x;
        obj.rotation.y += angVel.y;
        obj.rotation.z += angVel.z;
      });
    };

    // Animation loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      updatePhysics();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      calculateBounds();
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      jackGeometry.dispose();
      objects.forEach(obj => obj.material.dispose());
    };
  }, [
    objectCount,
    minSize,
    maxSize,
    colors,
    gravity,
    friction,
    wallBounce,
    maxVelocity,
    mouseForce,
    mouseRadius
  ]);

  return <div ref={mountRef} style={style} className={className} />;
}