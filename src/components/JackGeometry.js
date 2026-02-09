import * as THREE from 'three';

/**
 * Creates a procedural cylindrical jack geometry with 4 perpendicular arms
 * @param {Object} params - Configuration parameters
 * @param {number} params.armLength - Length of each arm (default: 1.2)
 * @param {number} params.armRadius - Radius of cylindrical arms (default: 0.18)
 * @param {number} params.centerRadius - Radius of center sphere (default: 0.3)
 * @param {number} params.radialSegments - Segments for cylinder smoothness (default: 24)
 * @returns {THREE.BufferGeometry} - Merged geometry of all jack components
 */
export function createJackGeometry({
  armLength = 1.2,
  armRadius = 0.18,
  centerRadius = 0.3,
  radialSegments = 24
} = {}) {
  const geometries = [];

  // Create center sphere (icosphere for smooth appearance)
  const centerSphere = new THREE.IcosahedronGeometry(centerRadius, 2);
  geometries.push(centerSphere);

  // Create 4 perpendicular cylindrical arms
  // Arms positioned along: +X, -X, +Y, -Y axes
  const armGeometry = new THREE.CylinderGeometry(
    armRadius,
    armRadius,
    armLength,
    radialSegments,
    1,
    false
  );

  // Arm 1: +X axis (rotate 90° around Z)
  const arm1 = armGeometry.clone();
  arm1.rotateZ(Math.PI / 2);
  arm1.translate(armLength / 2, 0, 0);
  geometries.push(arm1);

  // Arm 2: -X axis (rotate -90° around Z)
  const arm2 = armGeometry.clone();
  arm2.rotateZ(-Math.PI / 2);
  arm2.translate(-armLength / 2, 0, 0);
  geometries.push(arm2);

  // Arm 3: +Y axis (no rotation needed, cylinder is vertical by default)
  const arm3 = armGeometry.clone();
  arm3.translate(0, armLength / 2, 0);
  geometries.push(arm3);

  // Arm 4: -Y axis
  const arm4 = armGeometry.clone();
  arm4.translate(0, -armLength / 2, 0);
  geometries.push(arm4);

  // Add rounded end caps (small spheres at arm tips)
  const capGeometry = new THREE.SphereGeometry(armRadius, 16, 16);

  // Caps for X arms
  const capXPos = capGeometry.clone();
  capXPos.translate(armLength, 0, 0);
  geometries.push(capXPos);

  const capXNeg = capGeometry.clone();
  capXNeg.translate(-armLength, 0, 0);
  geometries.push(capXNeg);

  // Caps for Y arms
  const capYPos = capGeometry.clone();
  capYPos.translate(0, armLength, 0);
  geometries.push(capYPos);

  const capYNeg = capGeometry.clone();
  capYNeg.translate(0, -armLength, 0);
  geometries.push(capYNeg);

  // Merge all geometries into one
  const mergedGeometry = new THREE.BufferGeometry();
  const mergedAttributes = {
    position: [],
    normal: [],
    uv: []
  };

  geometries.forEach(geo => {
    const positions = geo.attributes.position.array;
    const normals = geo.attributes.normal.array;
    const uvs = geo.attributes.uv ? geo.attributes.uv.array : [];

    mergedAttributes.position.push(...positions);
    mergedAttributes.normal.push(...normals);
    if (uvs.length > 0) {
      mergedAttributes.uv.push(...uvs);
    }
  });

  mergedGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(mergedAttributes.position, 3)
  );
  mergedGeometry.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(mergedAttributes.normal, 3)
  );
  if (mergedAttributes.uv.length > 0) {
    mergedGeometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(mergedAttributes.uv, 2)
    );
  }

  mergedGeometry.computeBoundingSphere();

  return mergedGeometry;
}

/**
 * Creates a metallic glass material for jack models
 * @param {string} color - Base color in hex format
 * @returns {THREE.MeshPhysicalMaterial}
 */
export function createJackMaterial(color = '#5227FF') {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.9,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5
  });
}