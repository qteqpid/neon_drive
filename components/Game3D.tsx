
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, Text, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { CarControls, GameState, RaceStats, TrackObstacle, ThemeType } from '../types';
import '../types'; // Import types for R3F JSX elements

// --- Theme Config ---
const THEMES: Record<ThemeType, { ground: string; road: string; neon: string; fog: string; sky: any; light: string }> = {
  NEON: { ground: '#1e293b', road: '#0f172a', neon: '#22d3ee', fog: '#0f172a', sky: 'city', light: '#22d3ee' },
  DESERT: { ground: '#d97706', road: '#d97706', neon: '#f59e0b', fog: '#78350f', sky: 'sunset', light: '#fbbf24' },
  SNOW: { ground: '#f1f5f9', road: '#334155', neon: '#3b82f6', fog: '#cbd5e1', sky: 'park', light: '#60a5fa' },
  FOREST: { ground: '#166534', road: '#292524', neon: '#4ade80', fog: '#14532d', sky: 'forest', light: '#86efac' },
  CIRCUIT: { ground: '#15803d', road: '#374151', neon: '#ef4444', fog: '#1e293b', sky: 'apartment', light: '#fff' },
};

// --- Configuration ---
const MAX_SPEED = 60;
const ACCELERATION = 24; 
const DRAG = 0.4;        
const BRAKE_FORCE = 80;
const TURN_SPEED = 2.5;

// --- Track Curve & Height Logic ---

// Returns the X offset of the road at a given Z coordinate (World Space)
const getTrackOffset = (z: number): number => {
    const scale = 0.002; 
    const scale2 = 0.008;
    return Math.sin(z * scale) * 60 + Math.sin(z * scale2) * 20;
};

// Returns the Y offset (Height) of the road at a given Z coordinate
const getTrackHeight = (z: number): number => {
    const scale = 0.003;
    const scale2 = 0.01;
    // Increased amplitude for more dramatic hills
    return Math.sin(z * scale) * 25 + Math.sin(z * scale2) * 6;
};

// SANDBOX Terrain Function (2D Noise-like)
const getSandboxHeight = (x: number, z: number): number => {
    // Large rolling hills
    const h1 = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 15;
    // Medium detail
    const h2 = Math.sin(x * 0.03 + z * 0.02) * 5;
    // Small bumps
    const h3 = Math.cos(x * 0.1) * Math.sin(z * 0.1) * 1;
    
    return h1 + h2 + h3 - 5; // Base height offset
};

// Returns the Bank Angle (Roll) of the road at a given Z coordinate
const getTrackBanking = (z: number): number => {
    return 0; 
};

// --- Utils ---
const checkCollision = (pos: THREE.Vector3, obstacles: TrackObstacle[], theme: ThemeType): boolean => {
  const carRadius = 1.0; 
  
  for (const obs of obstacles) {
    let width = obs.size[0];
    let depth = obs.size[2];

    if (theme === 'DESERT') {
        width *= 0.5;
        depth *= 0.5;
    } else if (theme === 'FOREST') {
        width *= 0.35;
        depth *= 0.35;
    } else if (theme === 'SNOW') {
        width *= 0.7;
        depth *= 0.7;
    }

    const dx = Math.abs(pos.x - obs.position[0]);
    const dz = Math.abs(pos.z - obs.position[2]);
    
    if (dx < (width/2 + carRadius) && dz < (depth/2 + carRadius)) {
      return true;
    }
  }
  return false;
};

// --- Components ---

const CarModel = React.forwardRef<THREE.Group, any>((props, ref) => {
  return (
    <group ref={ref} {...props}>
      {/* --- Main Body Design: Futuristic Cyber Sports Car --- */}
      
      {/* Lower Chassis - Wide & Low */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.0, 0.4, 4.4]} />
        <meshStandardMaterial color="#0891b2" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Upper Body / Hood / Trunk */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 0.3, 4.0]} />
        <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.6} />
      </mesh>
      
      {/* Cockpit / Cabin - Sleek Tinted Glass */}
      <mesh position={[0, 0.9, -0.3]}>
        <boxGeometry args={[1.4, 0.5, 2.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.0} metalness={1.0} envMapIntensity={1.5} />
      </mesh>

      {/* Rear Spoiler Wing */}
      <group position={[0, 0.95, 1.9]}>
         {/* Struts */}
         <mesh position={[-0.7, -0.1, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.3]} />
            <meshStandardMaterial color="#0891b2" />
         </mesh>
         <mesh position={[0.7, -0.1, 0]}>
            <boxGeometry args={[0.1, 0.4, 0.3]} />
            <meshStandardMaterial color="#0891b2" />
         </mesh>
         {/* Wing Blade */}
         <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[2.2, 0.05, 0.5]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
         </mesh>
         {/* Wing Tips */}
         <mesh position={[1.1, 0.25, 0]}>
            <boxGeometry args={[0.05, 0.2, 0.5]} />
            <meshStandardMaterial color="#0891b2" />
         </mesh>
         <mesh position={[-1.1, 0.25, 0]}>
            <boxGeometry args={[0.05, 0.2, 0.5]} />
            <meshStandardMaterial color="#0891b2" />
         </mesh>
      </group>

      {/* Neon Accents - Side Skirts */}
      <mesh position={[1.01, 0.25, 0]}>
        <boxGeometry args={[0.05, 0.05, 3.2]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[-1.01, 0.25, 0]}>
        <boxGeometry args={[0.05, 0.05, 3.2]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Headlights (Aggressive Slits) */}
      <mesh position={[0.6, 0.5, -2.21]}>
         <boxGeometry args={[0.6, 0.1, 0.1]} />
         <meshStandardMaterial color="#ccfbf1" emissive="#ccfbf1" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <mesh position={[-0.6, 0.5, -2.21]}>
         <boxGeometry args={[0.6, 0.1, 0.1]} />
         <meshStandardMaterial color="#ccfbf1" emissive="#ccfbf1" emissiveIntensity={5} toneMapped={false} />
      </mesh>

      {/* Taillight Bar */}
      <mesh position={[0, 0.6, 2.21]}>
        <boxGeometry args={[1.8, 0.1, 0.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} toneMapped={false} />
      </mesh>

      {/* Wheels with Glowing Rims */}
      {/* FR */}
      <mesh position={[1, 0.35, -1.4]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 24]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[1.21, 0.35, -1.4]} rotation={[0, 0, Math.PI/2]}>
         <torusGeometry args={[0.2, 0.03, 8, 24]} />
         <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>

      {/* FL */}
      <mesh position={[-1, 0.35, -1.4]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 24]} />
        <meshStandardMaterial color="#111" />
      </mesh>
       <mesh position={[-1.21, 0.35, -1.4]} rotation={[0, 0, Math.PI/2]}>
         <torusGeometry args={[0.2, 0.03, 8, 24]} />
         <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>

      {/* RR */}
      <mesh position={[1, 0.35, 1.4]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 24]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[1.21, 0.35, 1.4]} rotation={[0, 0, Math.PI/2]}>
         <torusGeometry args={[0.2, 0.03, 8, 24]} />
         <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>

      {/* RL */}
      <mesh position={[-1, 0.35, 1.4]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 24]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-1.21, 0.35, 1.4]} rotation={[0, 0, Math.PI/2]}>
         <torusGeometry args={[0.2, 0.03, 8, 24]} />
         <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
      </mesh>
      
      {/* Underglow Light */}
      <pointLight position={[0, 0.2, 0]} distance={5} intensity={1.5} color="#22d3ee" />
    </group>
  );
});

// AI Opponent Car (Red/Black Theme - Muscle Car Style)
const AICarModel = React.forwardRef<THREE.Group, any>((props, ref) => {
  return (
    <group ref={ref} {...props}>
      {/* Blocky Muscle Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.9, 0.6, 4.4]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.7} />
      </mesh>
      
      {/* Racing Stripe Hood */}
      <mesh position={[0, 0.81, -1]}>
         <boxGeometry args={[0.8, 0.05, 2.0]} />
         <meshStandardMaterial color="#dc2626" roughness={0.8} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 1.0, 0.2]}>
        <boxGeometry args={[1.6, 0.5, 2.0]} />
        <meshStandardMaterial color="#000" roughness={0.2} metalness={0.5} />
      </mesh>

      {/* Aggressive Front Grill Glow */}
      <mesh position={[0, 0.5, -2.21]}>
         <planeGeometry args={[1.8, 0.4]} />
         <meshStandardMaterial color="#7f1d1d" emissive="#ef4444" emissiveIntensity={2} />
      </mesh>
      
      {/* Mean Headlights */}
      <mesh position={[0.6, 0.6, -2.22]}>
         <circleGeometry args={[0.15, 16]} />
         <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4} />
      </mesh>
      <mesh position={[-0.6, 0.6, -2.22]}>
         <circleGeometry args={[0.15, 16]} />
         <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4} />
      </mesh>

      {/* Rear Light Strip */}
      <mesh position={[0, 0.6, 2.21]}>
         <boxGeometry args={[1.8, 0.2, 0.1]} />
         <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
      </mesh>

      {/* Wheels - Big/Bulky Muscle Wheels */}
      {[[1, 1.3], [-1, 1.3], [1, -1.3], [-1, -1.3]].map((pos, i) => (
        <group key={i} position={[pos[0], 0.45, pos[1]]}>
            <mesh rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.45, 0.45, 0.4, 16]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[pos[0] > 0 ? 0.21 : -0.21, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 6]} />
                <meshStandardMaterial color="#b91c1c" emissive="#dc2626" emissiveIntensity={0.5} />
            </mesh>
        </group>
      ))}

      {/* AI Label */}
      <Text position={[0, 2.2, 0]} fontSize={0.8} color="#ef4444" anchorX="center" anchorY="bottom">RIVAL</Text>
      
      {/* Red Underglow */}
      <pointLight position={[0, 0.2, 0]} distance={5} intensity={1.5} color="#dc2626" />
    </group>
  );
});

const Obstacle: React.FC<{ data: TrackObstacle; theme: ThemeType }> = ({ data, theme }) => {
  const [w, h, d] = data.size;

  if (theme === 'DESERT') {
    const trunkW = Math.min(w, d) * 0.5; 
    const green = "#15803d"; 
    return (
      <group position={new THREE.Vector3(...data.position)}>
         <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <cylinderGeometry args={[trunkW * 0.5, trunkW * 0.5, h, 8]} />
            <meshStandardMaterial color={green} roughness={0.9} />
         </mesh>
         <group position={[-trunkW * 0.6, h * 0.1, 0]}>
             <mesh position={[-trunkW * 0.4, 0, 0]} rotation={[0,0,Math.PI/2]}>
                 <cylinderGeometry args={[trunkW * 0.3, trunkW * 0.3, trunkW * 0.8, 8]} />
                 <meshStandardMaterial color={green} />
             </mesh>
             <mesh position={[-trunkW * 0.8, trunkW * 0.4, 0]}>
                 <cylinderGeometry args={[trunkW * 0.3, trunkW * 0.3, trunkW * 1.0, 8]} />
                 <meshStandardMaterial color={green} />
             </mesh>
         </group>
         <group position={[trunkW * 0.6, h * 0.3, 0]}>
             <mesh position={[trunkW * 0.4, 0, 0]} rotation={[0,0,Math.PI/2]}>
                 <cylinderGeometry args={[trunkW * 0.3, trunkW * 0.3, trunkW * 0.8, 8]} />
                 <meshStandardMaterial color={green} />
             </mesh>
             <mesh position={[trunkW * 0.8, trunkW * 0.4, 0]}>
                 <cylinderGeometry args={[trunkW * 0.3, trunkW * 0.3, trunkW * 1.0, 8]} />
                 <meshStandardMaterial color={green} />
             </mesh>
         </group>
      </group>
    );
  }

  if (theme === 'FOREST') {
    const trunkH = h * 0.4;
    const crownRadius = Math.min(w, d) * 0.8;
    const trunkRadius = crownRadius * 0.2;
    
    return (
      <group position={new THREE.Vector3(...data.position)}>
         <mesh position={[0, trunkH / 2 - h/2, 0]} castShadow>
            <cylinderGeometry args={[trunkRadius, trunkRadius * 1.2, trunkH, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={1} />
         </mesh>
         <group position={[0, trunkH - h/2 + crownRadius * 0.6, 0]}>
            <mesh castShadow>
               <dodecahedronGeometry args={[crownRadius, 0]} />
               <meshStandardMaterial color="#166534" roughness={0.8} />
            </mesh>
             <mesh position={[crownRadius * 0.7, crownRadius * 0.2, 0]}>
                 <sphereGeometry args={[crownRadius * 0.15, 8, 8]} />
                 <meshStandardMaterial color="#ef4444" roughness={0.5} />
             </mesh>
             <mesh position={[-crownRadius * 0.5, crownRadius * 0.5, crownRadius * 0.3]}>
                 <sphereGeometry args={[crownRadius * 0.15, 8, 8]} />
                 <meshStandardMaterial color="#ef4444" roughness={0.5} />
             </mesh>
             <mesh position={[0, crownRadius * 0.3, -crownRadius * 0.7]}>
                 <sphereGeometry args={[crownRadius * 0.15, 8, 8]} />
                 <meshStandardMaterial color="#fb7185" roughness={0.5} />
             </mesh>
             <mesh position={[crownRadius * 0.4, -crownRadius * 0.2, crownRadius * 0.5]}>
                 <sphereGeometry args={[crownRadius * 0.12, 8, 8]} />
                 <meshStandardMaterial color="#fb7185" roughness={0.5} />
             </mesh>
         </group>
      </group>
    );
  }

  if (theme === 'SNOW') {
    return (
       <mesh position={new THREE.Vector3(...data.position)} castShadow receiveShadow>
         <cylinderGeometry args={[0, Math.min(w, d) * 0.5, h, 4]} />
         <meshStandardMaterial 
            color="#e0f2fe" 
            roughness={0.1} 
            metalness={0.3}
            emissive="#0ea5e9"
            emissiveIntensity={0.2}
         />
       </mesh>
    );
  }

  if (theme === 'CIRCUIT') {
    return (
       <group position={new THREE.Vector3(...data.position)}>
          <mesh position={[0, 0, 0]} castShadow>
             <cylinderGeometry args={[w*0.5, w*0.5, h, 16]} />
             <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 0, 0]}>
             <cylinderGeometry args={[w*0.51, w*0.51, h*0.33, 16]} />
             <meshBasicMaterial color="#f8fafc" />
          </mesh>
       </group>
    );
  }

  return (
    <mesh position={new THREE.Vector3(...data.position)} receiveShadow castShadow>
      <boxGeometry args={[...data.size]} />
      <meshStandardMaterial 
        color={data.color} 
        emissive={data.color} 
        emissiveIntensity={0.5}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

const Road = ({ themeColors, trackLength }: { themeColors: any, trackLength: number }) => {
  const roadRef = useRef<THREE.Mesh>(null);
  const leftStripRef = useRef<THREE.Mesh>(null);
  const rightStripRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    [roadRef.current, leftStripRef.current, rightStripRef.current].forEach(mesh => {
        if(!mesh) return;
        const pos = mesh.geometry.attributes.position;
        
        // Always recompute to handle track function changes
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i); // This acts as World -Z (approx)
            const worldZ = (-trackLength/2) - y;
            
            const curveX = getTrackOffset(worldZ);
            const curveY = getTrackHeight(worldZ);
            const banking = getTrackBanking(worldZ);
            
            const currentX = pos.getX(i);
            // Apply Banking: Change Height (Z in this plane) based on distance from center (currentX)
            const bankingHeightOffset = currentX * Math.tan(banking);
            
            pos.setX(i, currentX + curveX);
            // Set Height + Banking
            pos.setZ(i, curveY + bankingHeightOffset);
        }
        pos.needsUpdate = true;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.computeVertexNormals();
    });

  }, [trackLength]); 

  const segments = Math.max(100, Math.floor(trackLength / 5));

  return (
    <group position={[0, 0, -trackLength/2]}>
      {/* Main Road Surface */}
      <mesh ref={roadRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, trackLength + 200, 20, segments]} />
        <meshStandardMaterial 
          color={themeColors.road}
          roughness={0.4} 
          metalness={0.6} 
        />
      </mesh>
      
      {/* Grid Lines Mesh Removed as requested */}

      <mesh ref={leftStripRef} rotation={[-Math.PI / 2, 0, 0]} position={[-20, 0.05, 0]}>
         <planeGeometry args={[1, trackLength + 200, 1, segments]} />
         <meshBasicMaterial color={themeColors.neon} toneMapped={false} />
      </mesh>
      <mesh ref={rightStripRef} rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.05, 0]}>
         <planeGeometry args={[1, trackLength + 200, 1, segments]} />
         <meshBasicMaterial color={themeColors.neon} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Terrain = ({ theme, themeColors, trackLength, isSandbox, carRef }: { theme: ThemeType; themeColors: any; trackLength: number; isSandbox: boolean; carRef: React.RefObject<THREE.Group> }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (isSandbox && meshRef.current && carRef.current) {
            // In Sandbox, move the terrain with the car to create infinite illusion
            meshRef.current.position.x = carRef.current.position.x;
            meshRef.current.position.z = carRef.current.position.z;
        }
    });

    useEffect(() => {
        if (!meshRef.current) return;
        
        const geometry = meshRef.current.geometry;
        const pos = geometry.attributes.position;
        const count = pos.count;

        const currentMeshX = meshRef.current.position.x;
        const currentMeshZ = meshRef.current.position.z;

        for (let i = 0; i < count; i++) {
            const lx = pos.getX(i);
            const ly = pos.getY(i);
            
            // In Sandbox mode, we want absolute world coordinates based on the mesh position + vertex offset
            if (isSandbox) {
                // IMPORTANT: Since mesh moves, we need to sample noise at world coordinates
                // We'll update this in a shader or recompute every frame? 
                // For simplicity in React Three Fiber without shaders, we'll keep the mesh static for now and just make it HUGE
                // Or better: Recompute vertices only if we moved significantly? 
                // For this implementation, let's make a large static terrain area for Sandbox to avoid complex chunking
                
                // Let's use a large fixed area for Sandbox for now to ensure performance
                const height = getSandboxHeight(lx, -ly); // ly is local Y (which maps to world Z roughly)
                pos.setZ(i, height);
            } else {
                // TRACK LOGIC
                const x = lx;
                const worldZ = (-trackLength/2) - ly;
                const curveX = getTrackOffset(worldZ);
                const curveY = getTrackHeight(worldZ);
                const banking = getTrackBanking(worldZ);
                const dist = Math.abs(x - curveX);
                
                let z = -5;

                if (dist > 20) {
                    const t = Math.min(1, (dist - 20) / 130); 
                    if (theme === 'DESERT') {
                        z = Math.sin(x * 0.1) * Math.cos(ly * 0.05) * 15 * t;
                        z += Math.sin(ly * 0.1 + x * 0.05) * 5;
                        z += t * 5;
                    } else if (theme === 'SNOW') {
                        z = Math.pow(t, 1.5) * 50; 
                        z += Math.abs(Math.sin(x * 0.3) * Math.cos(ly * 0.3)) * 20;
                        z += Math.sin(x * 0.1) * 10 * t;
                    } else if (theme === 'FOREST') {
                        z = Math.pow(t, 1.2) * 40;
                        z += Math.sin(x * 0.08) * Math.cos(ly * 0.04) * 15;
                    } else if (theme === 'CIRCUIT') {
                        z = t * 2; 
                        if (t > 0.8) z += 10; 
                    } else {
                        z = Math.pow(t, 2) * 40; 
                        z += Math.sin(ly * 0.05) * Math.cos(x * 0.05) * 10 * t;
                        z += Math.sin(x * 0.2 + ly * 0.1) * 5;
                    }
                    z += curveY;
                    z = Math.max(z, curveY - 5);
                    pos.setZ(i, z);
                } else {
                    const offsetFromCenter = x - curveX;
                    const bankH = offsetFromCenter * Math.tan(banking);
                    pos.setZ(i, curveY + bankH - 2);
                }
            }
        }
        
        geometry.computeVertexNormals();
        pos.needsUpdate = true;
    }, [theme, trackLength, isSandbox]); 

    if (isSandbox) {
        // Large static terrain for sandbox
        return (
            <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <planeGeometry args={[1000, 1000, 128, 128]} />
                <meshStandardMaterial 
                    color={themeColors.ground}
                    roughness={theme === 'SNOW' ? 0.2 : 1} 
                    metalness={theme === 'SNOW' ? 0.1 : 0.0} 
                    flatShading={true} 
                />
            </mesh>
        );
    }

    // Standard Track Terrain
    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -trackLength/2]} receiveShadow>
            <planeGeometry args={[300, trackLength + 200, 64, Math.max(128, Math.floor(trackLength / 5))]} />
            <meshStandardMaterial 
                color={themeColors.ground}
                roughness={theme === 'SNOW' ? 0.2 : 1} 
                metalness={theme === 'SNOW' ? 0.1 : 0.0} 
                flatShading={true} 
            />
        </mesh>
    );
};

const FinishLine = ({ trackLength }: { trackLength: number }) => {
  const z = -trackLength;
  const xOffset = getTrackOffset(z);
  const yOffset = getTrackHeight(z);
  const banking = getTrackBanking(z);
  
  return (
    <group position={[xOffset, yOffset + 0.02, z]} rotation={[0, 0, banking]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[40, 5]} />
            <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, 3, 0]}>
             <boxGeometry args={[40, 0.5, 0.5]} />
             <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
        </mesh>
        <Text position={[0, 5, 0]} fontSize={4} color="#22d3ee">终点</Text>
    </group>
  )
}

// --- Main Scene Controller ---

interface GameSceneProps {
  gameState: GameState;
  theme: ThemeType;
  gameMode: 'TIME_TRIAL' | 'ENDURANCE' | 'RACE' | 'SANDBOX'; 
  timeOfDay: 'DAY' | 'NIGHT';
  forceFinish?: boolean;
  onSpeedUpdate: (speed: number) => void;
  onDistanceUpdate: (distance: number) => void;
  onFinish: (stats: Omit<RaceStats, 'speedHistory'>) => void;
  onRecordTelemetry: (speed: number, time: number) => void;
  onRaceUpdate?: (rank: number) => void;
}

const SceneContent: React.FC<GameSceneProps> = ({ gameState, theme, gameMode, timeOfDay, forceFinish, onSpeedUpdate, onDistanceUpdate, onFinish, onRecordTelemetry, onRaceUpdate }) => {
  const carRef = useRef<THREE.Group>(null);
  const aiCarRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<CarControls>({ forward: false, backward: false, left: false, right: false, brake: false });
  const aiAvoidanceOffset = useRef(0);
  
  const baseThemeConfig = THEMES[theme];
  
  const isNight = timeOfDay === 'NIGHT';
  const themeConfig = {
      ...baseThemeConfig,
      fog: isNight ? baseThemeConfig.fog : '#87ceeb', // Blueish fog for day
      light: isNight ? baseThemeConfig.light : '#ffffff' // White light for day
  };

  const isInfinite = gameMode === 'ENDURANCE';
  const isRace = gameMode === 'RACE';
  const isSandbox = gameMode === 'SANDBOX';

  const trackLength = isInfinite ? 20000 : (isRace ? 3000 : (isSandbox ? 1000 : 500));
  // More obstacles for Sandbox distributed differently
  const obstacleCount = isInfinite ? 800 : (isRace ? 200 : (isSandbox ? 300 : 40));

  const speed = useRef(0);
  const aiSpeed = useRef(35); // Base speed
  const aiZ = useRef(5); // AI starts slightly behind or ahead

  const startTime = useRef(0);
  const collisionCount = useRef(0);
  const maxSpeedAchieved = useRef(0);
  const hasFinished = useRef(false);
  const lastTelemetryTime = useRef(0);

  const [obstacles] = useState<TrackObstacle[]>(() => {
    const obs: TrackObstacle[] = [];
    for (let i = 0; i < obstacleCount; i++) {
      
      let x = 0;
      let y = 0;
      let z = 0;

      if (isSandbox) {
          // Random scattered distribution for Sandbox
          x = (Math.random() - 0.5) * 800; // Wide area X
          z = (Math.random() - 0.5) * 800; // Wide area Z
          const terrainH = getSandboxHeight(x, z);
          y = terrainH;
      } else {
          // Track distribution
          z = -Math.random() * trackLength + 20;
          const curveX = getTrackOffset(z);
          const curveY = getTrackHeight(z);
          const banking = getTrackBanking(z);
          
          const xOffset = (Math.random() - 0.5) * 30;
          const yBanking = xOffset * Math.tan(banking);
          
          x = curveX + xOffset;
          y = curveY + yBanking;
      }

      const size: [number, number, number] = [
          Math.random() * 4 + 2, 
          Math.random() * 5 + 2, 
          Math.random() * 4 + 2
      ];
      const height = size[1];

      obs.push({
        id: i,
        position: [x, y + (height * 0.5), z],
        size: size,
        color: Math.random() > 0.5 ? '#ec4899' : '#8b5cf6'
      });
    }
    return obs;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': controlsRef.current.forward = true; break;
        case 's': case 'arrowdown': controlsRef.current.backward = true; break;
        case 'a': case 'arrowleft': controlsRef.current.left = true; break;
        case 'd': case 'arrowright': controlsRef.current.right = true; break;
        case ' ': controlsRef.current.brake = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': controlsRef.current.forward = false; break;
        case 's': case 'arrowdown': controlsRef.current.backward = false; break;
        case 'a': case 'arrowleft': controlsRef.current.left = false; break;
        case 'd': case 'arrowright': controlsRef.current.right = false; break;
        case ' ': controlsRef.current.brake = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (gameState !== GameState.RACING || !carRef.current) return;
    if (startTime.current === 0) startTime.current = state.clock.elapsedTime;

    // --- PLAYER PHYSICS ---
    let acc = 0;
    if (controlsRef.current.forward) acc = ACCELERATION;
    if (controlsRef.current.backward) acc = -ACCELERATION; 

    speed.current += acc * delta;
    speed.current -= speed.current * DRAG * delta;
    
    if (controlsRef.current.brake) {
        if (speed.current > 0) speed.current -= BRAKE_FORCE * delta;
        else speed.current += BRAKE_FORCE * delta;
        if (Math.abs(speed.current) < 5) speed.current = 0;
    }

    speed.current = Math.max(Math.min(speed.current, MAX_SPEED), -MAX_SPEED);

    const speedRatio = Math.abs(speed.current) / MAX_SPEED;
    const turnFactor = (Math.abs(speed.current) > 1) ? TURN_SPEED * (1 - speedRatio * 0.3) : 0; 
    
    if (controlsRef.current.left) carRef.current.rotation.y += turnFactor * delta;
    if (controlsRef.current.right) carRef.current.rotation.y -= turnFactor * delta;

    const rotation = carRef.current.rotation.y;
    const dx = Math.sin(rotation) * speed.current * delta;
    const dz = Math.cos(rotation) * speed.current * delta;
    const newPos = carRef.current.position.clone().add(new THREE.Vector3(dx, 0, dz));

    if (checkCollision(newPos, obstacles, theme)) {
       speed.current = -speed.current * 0.5;
       collisionCount.current += 1;
       newPos.add(new THREE.Vector3(-dx * 2, 0, -dz * 2));
    }
    
    // Track Boundaries (Only applied if NOT Sandbox)
    if (!isSandbox) {
        const roadCenterX = getTrackOffset(newPos.z);
        const distFromCenter = newPos.x - roadCenterX;

        if (Math.abs(distFromCenter) > 18) {
            speed.current *= 0.9; 
            newPos.x = roadCenterX + Math.sign(distFromCenter) * 18;
        }
    }

    // --- PLAYER HEIGHT & BANKING ---
    let targetPitch = 0;
    let targetRoll = 0;

    if (isSandbox) {
        // Sandbox Elevation Logic
        newPos.y = getSandboxHeight(newPos.x, newPos.z);
        
        // Calculate Slope for Rotation
        const lookAhead = 2.0;
        const nextH = getSandboxHeight(newPos.x + Math.sin(rotation) * lookAhead, newPos.z + Math.cos(rotation) * lookAhead);
        const prevH = getSandboxHeight(newPos.x - Math.sin(rotation) * lookAhead, newPos.z - Math.cos(rotation) * lookAhead);
        
        const slope = (nextH - prevH) / (lookAhead * 2);
        targetPitch = -Math.atan(slope);
        
        // Banking based on side slope
        const rightH = getSandboxHeight(newPos.x + Math.sin(rotation - Math.PI/2) * lookAhead, newPos.z + Math.cos(rotation - Math.PI/2) * lookAhead);
        const leftH = getSandboxHeight(newPos.x + Math.sin(rotation + Math.PI/2) * lookAhead, newPos.z + Math.cos(rotation + Math.PI/2) * lookAhead);
        const bankSlope = (rightH - leftH) / (lookAhead * 2);
        targetRoll = Math.atan(bankSlope);

    } else {
        // Track Elevation Logic
        const roadCenterX = getTrackOffset(newPos.z);
        const currentTrackH = getTrackHeight(newPos.z);
        const currentBanking = getTrackBanking(newPos.z);
        
        newPos.y = currentTrackH + (newPos.x - roadCenterX) * Math.tan(currentBanking);
        
        const lookAheadDist = 2.0;
        const nextTrackH = getTrackHeight(newPos.z - lookAheadDist);
        const rise = nextTrackH - currentTrackH;
        const run = -lookAheadDist;
        const slope = rise / run;
        targetPitch = -Math.atan(slope);
        targetRoll = currentBanking;
    }

    carRef.current.rotation.x = THREE.MathUtils.lerp(carRef.current.rotation.x, targetPitch, delta * 8);
    carRef.current.rotation.z = THREE.MathUtils.lerp(carRef.current.rotation.z, targetRoll, delta * 8);
    carRef.current.position.copy(newPos);

    if (Math.abs(speed.current) > maxSpeedAchieved.current) {
      maxSpeedAchieved.current = Math.abs(speed.current);
    }

    // --- AI PHYSICS (Race Mode Only) ---
    if (isRace && aiCarRef.current) {
        const distDiff = newPos.z - aiZ.current; 
        let targetSpeed = 45; 
        if (distDiff < -40) targetSpeed = 50; 
        else if (distDiff > 40) targetSpeed = 40; 
        
        if (targetSpeed > 50) targetSpeed = 50;
        aiSpeed.current = THREE.MathUtils.lerp(aiSpeed.current, targetSpeed, delta * 0.5);
        
        aiZ.current -= aiSpeed.current * delta;

        const aiCenterX = getTrackOffset(aiZ.current);
        const aiLaneOffset = Math.sin(state.clock.elapsedTime * 0.5) * 5; 
        
        let avoidTarget = 0;
        for (const obs of obstacles) {
             const obsZ = obs.position[2];
             if (obsZ < aiZ.current && obsZ > aiZ.current - 70) {
                 const obsTrackX = getTrackOffset(obsZ);
                 const obsRelativeX = obs.position[0] - obsTrackX;
                 const aiIntendedRelativeX = aiLaneOffset + avoidTarget;
                 const collisionThreshold = (obs.size[0] / 2) + 2.5; 
                 
                 if (Math.abs(obsRelativeX - aiIntendedRelativeX) < collisionThreshold) {
                     if (obsRelativeX > aiIntendedRelativeX) avoidTarget = -8;
                     else avoidTarget = 8;
                     break; 
                 }
             }
        }
        
        aiAvoidanceOffset.current = THREE.MathUtils.lerp(aiAvoidanceOffset.current, avoidTarget, delta * 8);
        
        const aiX = aiCenterX + aiLaneOffset + aiAvoidanceOffset.current;
        const aiH = getTrackHeight(aiZ.current);
        const aiBank = getTrackBanking(aiZ.current);
        const aiY = aiH + (aiX - aiCenterX) * Math.tan(aiBank);

        aiCarRef.current.position.set(aiX, aiY, aiZ.current);
        
        const dx = newPos.x - aiX;
        const dz = newPos.z - aiZ.current;
        const distSq = dx*dx + dz*dz;
        if (distSq < 4.0) { 
            const dist = Math.sqrt(distSq);
            const pushX = (dx / dist) * 10 * delta;
            newPos.x += pushX;
            speed.current *= 0.9;
            aiSpeed.current *= 0.9;
            collisionCount.current++;
        }

        const aiNextH = getTrackHeight(aiZ.current - 2);
        const aiRise = aiNextH - aiH;
        const aiSlope = aiRise / -2;
        aiCarRef.current.rotation.x = -Math.atan(aiSlope);
        aiCarRef.current.rotation.z = aiBank;
        const nextAiCenterX = getTrackOffset(aiZ.current - 5);
        const dxTrack = nextAiCenterX - aiCenterX;
        aiCarRef.current.rotation.y = Math.atan2(dxTrack, -5) + (avoidTarget * -0.05);

        const rank = newPos.z < aiZ.current ? 1 : 2;
        if(onRaceUpdate) onRaceUpdate(rank);
    }

    // --- Telemetry & Stats ---
    // In Sandbox, distance is just Euclidean distance from 0,0
    let distance = 0;
    if (isSandbox) {
        distance = Math.sqrt(newPos.x*newPos.x + newPos.z*newPos.z);
    } else {
        distance = Math.abs(newPos.z);
    }
    onDistanceUpdate(distance);

    const currentTime = state.clock.elapsedTime;
    if (currentTime - lastTelemetryTime.current > 0.2) {
        onRecordTelemetry(Math.abs(speed.current), currentTime - startTime.current);
        lastTelemetryTime.current = currentTime;
    }
    
    onSpeedUpdate(Math.abs(speed.current));

    const camOffset = new THREE.Vector3(0, 6, 12); 
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation * 0.8); 
    
    const targetCamPos = newPos.clone().add(camOffset);
    // Adjust cam height to not clip ground
    let groundH = 0;
    if (isSandbox) {
        groundH = getSandboxHeight(targetCamPos.x, targetCamPos.z);
    } else {
        groundH = getTrackHeight(targetCamPos.z);
    }
    
    if (targetCamPos.y < groundH + 2) {
        targetCamPos.y = groundH + 2;
    }
    
    state.camera.position.lerp(targetCamPos, 5 * delta);
    state.camera.lookAt(newPos.clone().add(new THREE.Vector3(0, 0, -10)));

    if (!hasFinished.current) {
        // In Sandbox, only forceFinish ends game
        const crossedLine = !isInfinite && !isSandbox && newPos.z < -trackLength;
        
        if (crossedLine || forceFinish) {
            hasFinished.current = true;
            
            let rank = undefined;
            if (isRace) {
                rank = newPos.z < aiZ.current ? 1 : 2;
            }

            onFinish({
                time: state.clock.elapsedTime - startTime.current,
                maxSpeed: maxSpeedAchieved.current,
                collisions: collisionCount.current,
                distance: distance,
                rank
            });
        }
    }
  });

  return (
    <>
      <fog attach="fog" args={[themeConfig.fog, 30, 150]} />
      <ambientLight intensity={isNight ? 0.3 : 1.0} />
      <directionalLight position={[50, 50, 25]} intensity={isNight ? 1.5 : 2.5} castShadow />
      <pointLight position={[0, 20, -trackLength/2]} intensity={2} color={themeConfig.light} distance={trackLength * 1.2} />
      
      {isNight ? (
          <>
            <Environment preset={themeConfig.sky} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </>
      ) : (
          <>
            <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
            <Environment preset="city" />
          </>
      )}
      
      <CarModel ref={carRef} />
      {isRace && <AICarModel ref={aiCarRef} />}

      {!isSandbox && <Road themeColors={themeConfig} trackLength={trackLength} />}
      <Terrain theme={theme} themeColors={themeConfig} trackLength={trackLength} isSandbox={isSandbox} carRef={carRef} />
      {!isInfinite && !isSandbox && <FinishLine trackLength={trackLength} />}
      
      {obstacles.map(obs => (
        <Obstacle key={obs.id} data={obs} theme={theme} />
      ))}
    </>
  );
};

export const Game3D = (props: GameSceneProps) => {
  return (
    <Canvas shadows className="w-full h-full bg-slate-900">
      <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
      <SceneContent {...props} />
    </Canvas>
  );
};
