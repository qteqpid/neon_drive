
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Home, RefreshCw, Zap, Trophy, Skull } from 'lucide-react';
import '../types'; // Import types for R3F JSX elements

// --- Types ---
interface Bullet {
  id: number;
  x: number;
  y: number;
}

interface Meteor {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  rotSpeedX: number;
  rotSpeedY: number;
  hp: number;
  maxHp: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// --- Game Engine ---
const SpaceShooterEngine: React.FC<{
  onScore: (amount: number) => void;
  onGameOver: () => void;
  gameState: 'PLAYING' | 'GAMEOVER';
}> = ({ onScore, onGameOver, gameState }) => {
  const { viewport, clock } = useThree();
  
  // Game State Refs
  const playerRef = useRef({ x: 0, y: -5, width: 0.8, height: 1.0, tilt: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const lastShotTime = useRef(0);
  const lastSpawnTime = useRef(0);
  const startTime = useRef(Date.now());

  // Input Handling
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  // Visual State for Rendering
  const [playerPos, setPlayerPos] = useState({ x: 0, y: -5, tilt: 0 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  useFrame((state, delta) => {
    if (gameState !== 'PLAYING') return;

    const time = state.clock.elapsedTime;
    const difficultyMultiplier = 1 + (time / 60); // Harder over time

    // --- 1. Player Movement ---
    const speed = 12 * delta; 
    let targetTilt = 0;

    if ((keysRef.current['ArrowUp'] || keysRef.current['KeyW']) && playerRef.current.y < viewport.height/2 - 1) playerRef.current.y += speed;
    if ((keysRef.current['ArrowDown'] || keysRef.current['KeyS']) && playerRef.current.y > -viewport.height/2 + 1) playerRef.current.y -= speed;
    
    if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
        if (playerRef.current.x > -viewport.width/2 + 0.5) playerRef.current.x -= speed;
        targetTilt = 0.5; // Left tilt
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
        if (playerRef.current.x < viewport.width/2 - 0.5) playerRef.current.x += speed;
        targetTilt = -0.5; // Right tilt
    }

    // Smooth tilt
    playerRef.current.tilt += (targetTilt - playerRef.current.tilt) * 10 * delta;

    setPlayerPos({ x: playerRef.current.x, y: playerRef.current.y, tilt: playerRef.current.tilt });

    // --- 2. Auto Fire ---
    if (time - lastShotTime.current > 0.15) { // Fire rate
      lastShotTime.current = time;
      // Dual fire from wings
      bulletsRef.current.push({ id: Math.random(), x: playerRef.current.x - 0.4, y: playerRef.current.y + 0.2 });
      bulletsRef.current.push({ id: Math.random(), x: playerRef.current.x + 0.4, y: playerRef.current.y + 0.2 });
    }

    // --- 3. Update Bullets ---
    const bulletSpeed = 20 * delta;
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      bulletsRef.current[i].y += bulletSpeed;
      if (bulletsRef.current[i].y > viewport.height / 2) {
        bulletsRef.current.splice(i, 1);
      }
    }

    // --- 4. Spawn Meteors ---
    const spawnRate = Math.max(0.3, 1.2 / difficultyMultiplier);
    if (time - lastSpawnTime.current > spawnRate) {
      lastSpawnTime.current = time;
      const size = 0.5 + Math.random() * 1.0;
      const hp = 3; 

      meteorsRef.current.push({
        id: Math.random(),
        x: (Math.random() - 0.5) * viewport.width * 0.9,
        y: viewport.height / 2 + 2,
        speed: (2 + Math.random() * 3) * difficultyMultiplier,
        size: size,
        rotSpeedX: Math.random() - 0.5,
        rotSpeedY: Math.random() - 0.5,
        hp: hp,
        maxHp: hp
      });
    }

    // --- 5. Update Meteors & Collisions ---
    for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
      const m = meteorsRef.current[i];
      m.y -= m.speed * delta;

      // Check vs Player
      const dx = m.x - playerRef.current.x;
      const dy = m.y - playerRef.current.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Simple collision radius
      if (dist < m.size/2 + 0.4) {
         onGameOver();
      }

      // Check vs Bullets
      for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
        const b = bulletsRef.current[j];
        const bdx = m.x - b.x;
        const bdy = m.y - b.y;
        if (Math.sqrt(bdx*bdx + bdy*bdy) < m.size/2 + 0.2) {
           bulletsRef.current.splice(j, 1);
           
           m.hp -= 1; // Decrease HP

           // Spawn Sparks
           for(let k=0; k<3; k++) {
             particlesRef.current.push({
               id: Math.random(),
               x: m.x,
               y: m.y,
               vx: (Math.random() - 0.5) * 5,
               vy: (Math.random() - 0.5) * 5,
               life: 0.2 + Math.random() * 0.2,
               color: '#facc15' // Yellow sparks
             });
           }
           
           if (m.hp <= 0) {
               onScore(100 * Math.ceil(m.size));
               
               // Explosion
               for(let k=0; k<8; k++) {
                particlesRef.current.push({
                  id: Math.random(),
                  x: m.x,
                  y: m.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  life: 0.5 + Math.random() * 0.5,
                  color: '#ef4444' // Red explosion
                });
              }
           }
           break; // Bullet consumed
        }
      }

      if (m.hp <= 0 || m.y < -viewport.height / 2 - 2) {
        meteorsRef.current.splice(i, 1);
      }
    }

    // --- 6. Update Particles ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // Sync state for render
    setBullets([...bulletsRef.current]);
    setMeteors([...meteorsRef.current]);
    setParticles([...particlesRef.current]);
  });

  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={2} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, 5]} intensity={0.5} color="#06b6d4" />

      {/* Player Ship - Detailed Model */}
      <group position={[playerPos.x, playerPos.y, 0]} rotation={[0, playerPos.tilt, 0]}>
        
        {/* Fuselage (Main Body) */}
        <mesh position={[0, 0, 0]}>
          <coneGeometry args={[0.3, 1.8, 6]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.8} />
        </mesh>
        
        {/* Cockpit */}
        <mesh position={[0, -0.2, 0.15]}>
          <capsuleGeometry args={[0.15, 0.6, 4, 8]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.5} roughness={0.1} metalness={0.9} />
        </mesh>

        {/* Wings */}
        <mesh position={[0, -0.4, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.8, 0.1, 3]} /> {/* Flat triangleish shape */}
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.7} />
        </mesh>
        
        {/* Wing Guns */}
        <mesh position={[0.4, -0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
            <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[-0.4, -0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
            <meshStandardMaterial color="#334155" />
        </mesh>

        {/* Engine Thrusters */}
        <group position={[0, -0.9, 0]}>
             <mesh position={[0.2, 0, 0]}>
                 <cylinderGeometry args={[0.1, 0.15, 0.4, 8]} />
                 <meshStandardMaterial color="#475569" />
             </mesh>
             <mesh position={[-0.2, 0, 0]}>
                 <cylinderGeometry args={[0.1, 0.15, 0.4, 8]} />
                 <meshStandardMaterial color="#475569" />
             </mesh>
             
             {/* Glow */}
             <mesh position={[0.2, -0.3, 0]}>
                 <coneGeometry args={[0.1, 0.5, 8]} />
                 <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
             </mesh>
             <mesh position={[-0.2, -0.3, 0]}>
                 <coneGeometry args={[0.1, 0.5, 8]} />
                 <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
             </mesh>
        </group>

        {/* Rear Light */}
        <pointLight position={[0, -1.2, 0]} color="#3b82f6" intensity={2} distance={3} />
      </group>

      {/* Bullets */}
      {bullets.map(b => (
        <mesh key={b.id} position={[b.x, b.y, 0]}>
          <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      ))}

      {/* Meteors */}
      {meteors.map(m => {
          return (
            <mesh key={m.id} position={[m.x, m.y, 0]} rotation={[clock.elapsedTime * m.rotSpeedX, clock.elapsedTime * m.rotSpeedY, 0]}>
              <dodecahedronGeometry args={[m.size, 1]} />
              <meshStandardMaterial 
                  color="#ffffff" 
                  roughness={0.8}
                  flatShading
              />
            </mesh>
          );
      })}

      {/* Particles */}
      {particles.map(p => (
        <mesh key={p.id} position={[p.x, p.y, 0]} scale={p.life}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.life} />
        </mesh>
      ))}
    </>
  );
};

export const SpaceBattleGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'PLAYING' | 'GAMEOVER'>('PLAYING');

  const restart = () => {
    setScore(0);
    setGameState('PLAYING');
  };

  return (
    <div className="w-full h-full relative bg-slate-950 overflow-hidden">
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        <div>
          <h1 className="text-4xl font-black font-display italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            太空激战
          </h1>
          <p className="text-cyan-400/60 font-mono text-xs mt-1 tracking-widest flex gap-2 items-center">
             <Zap size={12} /> 自动射击已启用
          </p>
        </div>
        
        <div className="bg-slate-900/80 backdrop-blur border border-cyan-500/30 px-6 py-3 rounded-xl flex items-center gap-3">
             <Trophy className="text-yellow-400" size={20} />
             <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400 uppercase font-bold">分数</span>
                <span className="text-2xl font-mono text-white leading-none">{score}</span>
             </div>
        </div>
      </div>

      <button 
          onClick={onExit}
          className="absolute bottom-6 right-6 bg-slate-800 hover:bg-red-500/80 text-white px-4 py-2 rounded border border-slate-600 hover:border-red-400 transition-colors flex items-center gap-2 z-10"
      >
          <Home size={16} /> 退出
      </button>

      <div className="absolute bottom-6 left-6 text-slate-500 text-xs font-mono z-10">
         使用方向键移动
      </div>

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
           <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl text-center max-w-sm w-full shadow-2xl shadow-red-900/30">
               <Skull className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
               <h2 className="text-3xl font-bold text-white mb-2">任务失败</h2>
               <p className="text-slate-400 mb-6">飞船已被摧毁</p>
               
               <div className="bg-slate-800 p-4 rounded-xl mb-6">
                   <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">最终得分</div>
                   <div className="text-4xl font-mono text-yellow-400">{score}</div>
               </div>

               <div className="flex gap-4">
                   <button 
                       onClick={restart}
                       className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                   >
                       <RefreshCw size={18} /> 重试
                   </button>
                   <button 
                       onClick={onExit}
                       className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-all"
                   >
                       退出
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* 3D Scene */}
      <Canvas>
        {/* Increased Z position to 15 for wider FOV */}
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
        <SpaceShooterEngine 
          onScore={(amt) => setScore(s => s + amt)} 
          onGameOver={() => setGameState('GAMEOVER')}
          gameState={gameState}
        />
      </Canvas>
    </div>
  );
};
