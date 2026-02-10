import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useControls } from 'leva';

// Physics object class
class PhysicsObject {
  constructor(position, velocity, color, geometry) {
    this.position = new THREE.Vector3(...position);
    this.velocity = new THREE.Vector3(...velocity);
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.color = color;
    this.geometry = geometry;
    this.radius = geometry === 'sphere' ? 0.5 : 0.6;
    this.mass = 1;
    this.restitution = 0.6; // Bounciness
  }

  applyForce(force) {
    const f = force.clone().divideScalar(this.mass);
    this.acceleration.add(f);
  }

  update(deltaTime) {
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
    this.velocity.multiplyScalar(0.98); // Air resistance
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.acceleration.set(0, 0, 0);
  }

  checkCollision(other) {
    const distance = this.position.distanceTo(other.position);
    const minDistance = this.radius + other.radius;
    return distance < minDistance;
  }

  resolveCollision(other) {
    const normal = new THREE.Vector3()
      .subVectors(other.position, this.position)
      .normalize();
    
    const relativeVelocity = new THREE.Vector3()
      .subVectors(other.velocity, this.velocity);
    
    const velocityAlongNormal = relativeVelocity.dot(normal);
    
    if (velocityAlongNormal > 0) return;
    
    const restitution = Math.min(this.restitution, other.restitution);
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    const impulse = normal.clone().multiplyScalar(impulseScalar / 2);
    
    this.velocity.sub(impulse);
    other.velocity.add(impulse);
    
    // Separate overlapping objects
    const overlap = (this.radius + other.radius) - this.position.distanceTo(other.position);
    const separation = normal.clone().multiplyScalar(overlap / 2);
    this.position.sub(separation);
    other.position.add(separation);
  }
}

function PhysicsScene() {
  const objectsRef = useRef([]);
  const meshRefs = useRef([]);
  const mousePos = useRef(new THREE.Vector3(0, 0, 0));
  const raycaster = useRef(new THREE.Raycaster());
  const mouseVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const lastMousePos = useRef(new THREE.Vector3(0, 0, 0));

  // GUI Controls
  const controls = useControls({
    gravityStrength: { value: 25, min: 1, max: 100, step: 1 },
    reformSpeed: { value: 0.95, min: 0.5, max: 0.99, step: 0.01 },
    mouseForce: { value: 8, min: 1, max: 50, step: 1 },
    collisionRadius: { value: 4, min: 1, max: 10, step: 0.5 },
    objectCount: { value: 10, min: 10, max: 10000, step: 5 },
    airResistance: { value: 0.98, min: 0.9, max: 0.99, step: 0.01 },
  });

  // Create physics objects
  const objects = useMemo(() => {
    const objs = [];
    const colors = ['#4169E1', '#FFFFFF', '#000000'];
    const geometries = ['sphere', 'cylinder', 'torus'];
    
    for (let i = 0; i < controls.objectCount; i++) {
      const angle = (Math.PI * 2 * i) / controls.objectCount;
      const radius = 8 + Math.random() * 4;
      const position = [
        Math.cos(angle) * radius + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 8,
        Math.sin(angle) * radius + (Math.random() - 0.5) * 2
      ];
      
      const velocity = [
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ];
      
      const color = colors[i % colors.length];
      const geometry = geometries[i % geometries.length];
      
      objs.push(new PhysicsObject(position, velocity, color, geometry));
    }
    
    objectsRef.current = objs;
    return objs;
  }, [controls.objectCount]);

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (event) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Calculate mouse position in 3D space
      const vector = new THREE.Vector3(x, y, 0.5);
      vector.unproject(new THREE.Camera());
      vector.z = 0;
      
      const newMousePos = new THREE.Vector3(x * 10, y * 8, 0);
      mouseVelocity.current.subVectors(newMousePos, lastMousePos.current).multiplyScalar(20);
      lastMousePos.current.copy(newMousePos);
      mousePos.current.copy(newMousePos);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    
    objectsRef.current.forEach((obj, index) => {
      // Gravitational attraction to center
      const toCenter = new THREE.Vector3(0, 0, 0).sub(obj.position);
      const distance = toCenter.length();
      
      if (distance > 0.1) {
        const gravity = toCenter.normalize().multiplyScalar(controls.gravityStrength / (distance * 0.5));
        obj.applyForce(gravity);
      }
      
      // Strong Z-axis pull to center plane (flatten to z=0)
      const zPull = new THREE.Vector3(0, 0, -obj.position.z);
      obj.applyForce(zPull.multiplyScalar(15));
      
      // Mouse interaction - direct collision
      const toMouse = new THREE.Vector3().subVectors(mousePos.current, obj.position);
      const mouseDistance = toMouse.length();
      
      // Increased collision radius and force for better mouse interaction
      if (mouseDistance < controls.collisionRadius) {
        const velocityMagnitude = mouseVelocity.current.length();
        const mouseForce = mouseVelocity.current.clone().multiplyScalar(controls.mouseForce / (mouseDistance + 0.1));
        
        // Apply stronger force when cursor is moving fast
        if (velocityMagnitude > 0.5) {
          mouseForce.multiplyScalar(velocityMagnitude * 2);
        }
        
        obj.applyForce(mouseForce);
        
        // Direct collision push
        if (mouseDistance < 1.5) {
          const pushAway = obj.position.clone().sub(mousePos.current).normalize();
          obj.applyForce(pushAway.multiplyScalar(20 * velocityMagnitude));
        }
      }
      
      // Collision detection with other objects
      for (let i = index + 1; i < objectsRef.current.length; i++) {
        const other = objectsRef.current[i];
        if (obj.checkCollision(other)) {
          obj.resolveCollision(other);
        }
      }
      
      // Update physics
      obj.velocity.add(obj.acceleration.clone().multiplyScalar(clampedDelta));
      obj.velocity.multiplyScalar(controls.airResistance); // Use GUI air resistance
      
      // Apply reform speed - pull back to circular formation
      const reformForce = toCenter.clone().normalize().multiplyScalar(controls.reformSpeed * 0.5);
      obj.velocity.add(reformForce);
      
      obj.position.add(obj.velocity.clone().multiplyScalar(clampedDelta));
      obj.acceleration.set(0, 0, 0);
      
      // Update mesh position
      if (meshRefs.current[index]) {
        meshRefs.current[index].position.copy(obj.position);
        meshRefs.current[index].rotation.x += obj.velocity.x * 0.01;
        meshRefs.current[index].rotation.y += obj.velocity.y * 0.01;
      }
    });
    
    // Decay mouse velocity
    mouseVelocity.current.multiplyScalar(0.9);
  });

  return (
    <>
      {objects.map((obj, index) => (
        <mesh
          key={index}
          ref={(el) => (meshRefs.current[index] = el)}
          position={[obj.position.x, obj.position.y, obj.position.z]}
        >
          {obj.geometry === 'sphere' && <sphereGeometry args={[0.5, 16, 16]} />}
          {obj.geometry === 'cylinder' && <cylinderGeometry args={[0.4, 0.4, 1, 16]} />}
          {obj.geometry === 'torus' && <torusGeometry args={[0.4, 0.2, 12, 16]} />}
          <meshStandardMaterial 
            color={obj.color} 
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
      
      {/* Center point visualization (invisible but marks the gravity center) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

export default function GravityPhysics() {
  return (
    <div style={{ height: '100%', background: '#0a0a0a' }}>
      <Canvas
        camera={{ position: [0, 0, -10], fov: 95 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <spotLight position={[0, 15, 0]} intensity={0.8} angle={0.6} penumbra={1} />
        
        <PhysicsScene />
        
        {/* <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          rotateSpeed={0.5}
        /> */}
      </Canvas>
      
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
      </div>
    </div>
  );
}