import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Points, PointMaterial, SoftShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';

// --------------------------------------------------------
// NOISE HELPERS
// --------------------------------------------------------
function smoothNoise(x, z) {
  // Simple multi-octave sine noise for terrain
  let v = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 4.0;
  v += Math.sin(x * 0.25 + z * 0.15) * 1.5;
  v += Math.sin(x * 0.6 - z * 0.4) * 0.5;
  return v;
}

// --------------------------------------------------------
// DIORAMA TERRAIN BLOCK
// --------------------------------------------------------
function DioramaTerrain() {
  const geomRef = useRef();

  useMemo(() => {
    if (!geomRef.current) return;
    const geometry = geomRef.current;
    const pos = geometry.attributes.position;
    const colors = [];
    
    // Premium Color Palette
    const cDeepEarth = new THREE.Color('#42352b'); // Dark brown sides
    const cSoil = new THREE.Color('#614f40');      // Riverbed soil
    const cForest = new THREE.Color('#2a4729');    // Mountain tops
    const cGrass = new THREE.Color('#476e36');     // Mid slopes
    const cValley = new THREE.Color('#618a4a');    // Valley floor
    const cAgri = new THREE.Color('#78944d');      // Crop areas
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      
      const mixedColor = new THREE.Color();
      
      // If vertex is on the top face of the box (y is positive)
      if (y > 0) {
        // Compute terrain height
        let basin = Math.pow(Math.abs(x * 0.18), 1.5) * 2.5; // V-shape
        let slope = -z * 0.15; // Drain towards +Z
        let noise = smoothNoise(x, z);
        
        let height = basin + slope + noise;
        
        // Carve central riverbed
        let isRiverbed = false;
        let isAgri = false;
        
        const distFromRiver = Math.abs(x);
        if (distFromRiver < 2.5) {
          // Sharp carve for stream
          height -= (2.5 - distFromRiver) * 1.2;
          isRiverbed = true;
        } else if (distFromRiver < 8 && z > 0 && z < 10) {
          // Flat agricultural terraces
          height = Math.floor(height * 0.5) * 2.0;
          if (Math.sin(x * 4) > 0) isAgri = true; // crop rows
        }

        // Apply height (base of box is -4, top is original 4)
        pos.setY(i, 4 + height * 0.8);

        // Coloring top face
        if (isRiverbed) {
          mixedColor.copy(cSoil);
        } else if (isAgri) {
          mixedColor.copy(cAgri);
        } else {
          const elevation = height;
          if (elevation > 5) {
            mixedColor.copy(cForest);
          } else if (elevation > 2) {
            mixedColor.copy(cGrass).lerp(cForest, (elevation - 2) / 3);
          } else {
            mixedColor.copy(cValley).lerp(cGrass, (elevation + 4) / 6);
          }
        }
        
        // Add tiny noise to break up solid colors
        mixedColor.r += (Math.random() - 0.5) * 0.03;
        mixedColor.g += (Math.random() - 0.5) * 0.03;
        mixedColor.b += (Math.random() - 0.5) * 0.03;

      } else {
        // Side/Bottom faces of the diorama block
        mixedColor.copy(cDeepEarth);
        // Vertical gradient for sides
        mixedColor.multiplyScalar(1.0 - (Math.abs(y + 4) / 8) * 0.4);
      }
      
      colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
  }, []);

  return (
    <mesh castShadow receiveShadow position={[0, -4, 0]}>
      {/* 40x40 diorama block. High segments on top face (x/z axes) */}
      <boxGeometry ref={geomRef} args={[40, 8, 40, 128, 1, 128]} />
      <meshStandardMaterial 
        vertexColors={true} 
        roughness={0.85} 
        flatShading={false}
      />
    </mesh>
  );
}

// --------------------------------------------------------
// WATER & HYDROLOGY
// --------------------------------------------------------
function Hydrology() {
  const streamRef = useRef();
  
  useFrame(({ clock }) => {
    if (streamRef.current) {
      // Offset UV to make water flow
      streamRef.current.material.map && (streamRef.current.material.map.offset.y = clock.getElapsedTime() * 0.2);
    }
  });

  return (
    <group>
      {/* Check Dam Structure */}
      <group position={[0, 0.2, 5]} castShadow receiveShadow>
        {/* Main Wall */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.8, 1.6, 0.8]} />
          <meshStandardMaterial color="#9ea6a1" roughness={0.7} />
        </mesh>
        {/* Spillway Cutout (Simulated by side blocks) */}
        <mesh position={[-1.7, 1.0, 0]}>
          <boxGeometry args={[1.4, 0.5, 0.81]} />
          <meshStandardMaterial color="#8e9691" />
        </mesh>
        <mesh position={[1.7, 1.0, 0]}>
          <boxGeometry args={[1.4, 0.5, 0.81]} />
          <meshStandardMaterial color="#8e9691" />
        </mesh>
      </group>

      {/* Reservoir (Behind Dam, Z: -2 to 4.5) */}
      <mesh position={[0, 0.8, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.8, 8, 10, 10]} />
        <meshPhysicalMaterial 
          color="#236e87" 
          transparent opacity={0.85}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          ior={1.4}
        />
      </mesh>

      {/* Upstream River Flowing into Reservoir */}
      <mesh ref={streamRef} position={[0, 2.0, -10]} rotation={[-Math.PI / 2 + 0.12, 0, 0]} receiveShadow>
        <planeGeometry args={[1.8, 20, 4, 10]} />
        <meshPhysicalMaterial color="#3086a3" transparent opacity={0.8} roughness={0.2} transmission={0.5} />
      </mesh>

      {/* Waterfall / Spillover */}
      <mesh position={[0, 0.3, 5.5]} rotation={[Math.PI / 4, 0, 0]}>
        <planeGeometry args={[1.8, 1.5]} />
        <meshPhysicalMaterial color="#68b4d1" transparent opacity={0.7} roughness={0.3} />
      </mesh>

      {/* Downstream River */}
      <mesh position={[0, -0.6, 12]} rotation={[-Math.PI / 2 + 0.08, 0, 0]} receiveShadow>
        <planeGeometry args={[1.6, 14, 4, 10]} />
        <meshPhysicalMaterial color="#3086a3" transparent opacity={0.8} roughness={0.2} transmission={0.5} />
      </mesh>
      
      {/* Infiltration (Groundwater charging) */}
      <Infiltration />
    </group>
  );
}

// Subtle groundwater charging particles inside the diorama base
function Infiltration() {
  const count = 40;
  const p = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for(let i=0; i<count; i++){
      arr[i*3] = (Math.random() - 0.5) * 3;
      arr[i*3+1] = Math.random() * -3; // negative Y
      arr[i*3+2] = Math.random() * 4;  // under reservoir
    }
    return arr;
  }, []);
  
  const ref = useRef();
  useFrame(() => {
    if(!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    for(let i=0; i<count; i++){
      pos[i*3+1] -= 0.005; // very slow
      if (pos[i*3+1] < -3) pos[i*3+1] = 0; // reset to just under reservoir
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={p} position={[0, 0, 1]}>
      <PointMaterial color="#4da2c7" size={0.15} transparent opacity={0.3} depthWrite={false} />
    </Points>
  );
}

// --------------------------------------------------------
// PREMIUM VEGETATION (Instanced)
// --------------------------------------------------------
function Forests() {
  const count = 500;
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (!meshRef.current) return;
    let idx = 0;
    const seed = 9876;
    const rand = () => {
      let x = Math.sin(idx * seed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 36;
      const z = (rand() - 0.5) * 36;
      
      const distFromRiver = Math.abs(x);
      // Avoid riverbed and check dam area
      if (distFromRiver < 3.0 || (distFromRiver < 5 && z > -2 && z < 6)) continue;
      
      // Calculate terrain height exactly as in geometry
      let basin = Math.pow(distFromRiver * 0.18, 1.5) * 2.5;
      let slope = -z * 0.15;
      let noise = smoothNoise(x, z);
      let height = basin + slope + noise;
      
      // Do not plant on the agricultural terraces
      if (distFromRiver < 8 && z > 0 && z < 10) continue;

      const scale = 0.3 + rand() * 0.5;
      dummy.position.set(x, height * 0.8 + scale * 1.5, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = rand() * Math.PI;
      
      // Sway setup
      dummy.rotation.z = (rand() - 0.5) * 0.2;
      dummy.rotation.x = (rand() - 0.5) * 0.2;
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx++, dummy.matrix);
    }
    meshRef.current.count = idx;
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.5) * 0.015;
    }
  });

  // Soft stylized tree (overlapping spheres)
  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1.5, 1]} />
      <meshStandardMaterial color="#223b1c" roughness={0.9} flatShading={true} />
    </instancedMesh>
  );
}

// --------------------------------------------------------
// CLOUDS & RAINFALL
// --------------------------------------------------------
function Weather() {
  const rainCount = 1500;
  const rainPos = useMemo(() => {
    const p = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount; i++){
      p[i*3] = (Math.random() - 0.5) * 20; // Focused over mountains
      p[i*3+1] = Math.random() * 15 + 5;
      p[i*3+2] = (Math.random() - 0.5) * 15 - 10;
    }
    return p;
  }, []);

  const rainRef = useRef();
  useFrame(() => {
    if (rainRef.current) {
      const pos = rainRef.current.geometry.attributes.position.array;
      for(let i=0; i<rainCount; i++){
        pos[i*3+1] -= 0.3; // falling
        pos[i*3] -= 0.01;  // wind drift
        pos[i*3+2] += 0.02; 
        if (pos[i*3+1] < 0) { // reset at ground
          pos[i*3+1] = 15;
          pos[i*3] = (Math.random() - 0.5) * 20;
          pos[i*3+2] = (Math.random() - 0.5) * 15 - 10;
        }
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Rainfall Particles */}
      <Points ref={rainRef} positions={rainPos}>
        <PointMaterial color="#a7c3d1" size={0.08} transparent opacity={0.4} depthWrite={false} />
      </Points>
      
      {/* Soft Volumetric Clouds (Diorama style) */}
      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.5} position={[-5, 14, -12]}>
        <mesh castShadow position={[0,0,0]}><sphereGeometry args={[3, 32, 32]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9} /></mesh>
        <mesh castShadow position={[2,0.5,-1]}><sphereGeometry args={[2.5, 32, 32]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9}/></mesh>
        <mesh castShadow position={[-2.5,-0.5,1]}><sphereGeometry args={[2, 32, 32]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9}/></mesh>
      </Float>
      
      <Float speed={0.8} rotationIntensity={0} floatIntensity={0.3} position={[6, 12, -8]}>
        <mesh castShadow position={[0,0,0]}><sphereGeometry args={[4, 32, 32]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9}/></mesh>
        <mesh castShadow position={[-3,1,-1]}><sphereGeometry args={[2.5, 32, 32]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9}/></mesh>
        <mesh castShadow position={[3,-1,1]}><sphereGeometry args={[2.2, 32, 32]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9}/></mesh>
      </Float>
    </group>
  );
}

// --------------------------------------------------------
// CINEMATIC CAMERA (3/4 Aerial View)
// --------------------------------------------------------
function DioramaCamera() {
  useFrame(({ camera, clock }) => {
    // Elegant slow orbital drift across the diorama
    const t = clock.getElapsedTime();
    // Base position: Elevated 3/4 view looking down the valley
    camera.position.x = 22 + Math.sin(t * 0.05) * 4;
    camera.position.y = 18 + Math.cos(t * 0.04) * 2;
    camera.position.z = 25 + Math.cos(t * 0.05) * 4;
    
    // Look dead center at the check dam/reservoir area
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// --------------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------------
export default function Watershed3D() {
  return (
    <div className="watershed-3d-wrapper" style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      padding: '0', 
      borderRadius: '16px',
      border: '1px solid #d8e8df',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      marginBottom: '40px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Clean elegant UI overlay without empty space */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '25px', background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 100%)', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#168a4c', display: 'inline-block' }}></span>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#102c3b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Watershed in Action</h2>
        </div>
        <p style={{ margin: 0, color: '#354a40', fontSize: '15px', lineHeight: '1.6', maxWidth: '850px', fontWeight: '500', textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}>
          Rainfall becomes runoff. Smart watershed interventions slow, store and conserve water while protecting soil and supporting vegetation.
        </p>
      </div>
      
      {/* Main 3D Viewport */}
      <div style={{ width: '100%', height: '500px', backgroundColor: '#e9f2f5' }}>
        <Canvas shadows dpr={[1, 2]}>
          {/* Beautiful Soft Shadows for Premium Look */}
          <SoftShadows size={15} samples={16} focus={0.5} />
          
          <color attach="background" args={['#e9f2f5']} />
          <fogExp2 attach="fog" args={['#e9f2f5', 0.015]} />
          
          {/* Cinematic Studio Lighting */}
          <ambientLight intensity={0.5} color="#e0f0f5" />
          <directionalLight 
            castShadow 
            position={[30, 40, -10]} 
            intensity={1.8} 
            color="#fffdf5"
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-30}
            shadow-camera-right={30}
            shadow-camera-top={30}
            shadow-camera-bottom={-30}
            shadow-bias={-0.0001}
          />
          <hemisphereLight skyColor="#e9f2f5" groundColor="#4a633d" intensity={0.4} />

          {/* Diorama Group */}
          <group position={[0, -2, 0]}>
            <DioramaTerrain />
            <Forests />
            <Hydrology />
            <Weather />
          </group>

          <DioramaCamera />
          
          {/* Environment map for realistic water reflections */}
          <Environment preset="city" opacity={0.2} />
        </Canvas>
      </div>
    </div>
  );
}
