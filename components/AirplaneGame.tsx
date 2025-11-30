
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, PerspectiveCamera, Float, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Home, Anchor, Skull, Waves, Target, Activity } from 'lucide-react';
import '../types'; // Import types for R3F JSX elements

// --- Types ---
interface Ring {
  id: number;
  position: THREE.Vector3;
  collected: boolean;
}

interface Torpedo {
  id: number;
  position: THREE.Vector3;
}

// --- Utils ---
// Procedural Seabed Height Function
const getTerrainHeight = (x: number, z: number) => {
    // Base rolling seabed
    const h1 = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 10;
    // Detail sand ripples
    const h2 = Math.sin(x * 0.5 + z * 0.2) * 1;
    // Trenches/Walls on sides
    const canyon = Math.abs(x) > 35 ? (Math.abs(x) - 35) * 2 : 0;
    
    // Base depth level
    return -30 + h1 + h2 + canyon;
};

// --- Components ---

const Terrain = ({ subRef }: { subRef: React.RefObject<THREE.Group> }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (!meshRef.current || !subRef.current) return;
        
        const subZ = subRef.current.position.z;
        const subX = subRef.current.position.x;

        meshRef.current.position.z = subZ;
        meshRef.current.position.x = subX; 

        const geometry = meshRef.current.geometry;
        const pos = geometry.attributes.position;
        
        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const ly = pos.getY(i); 
            
            const wX = lx + subX;
            const wZ = -ly + subZ; 

            const height = getTerrainHeight(wX, wZ);
            pos.setZ(i, height);
        }
        
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[200, 200, 64, 64]} />
            <meshStandardMaterial 
                color="#0f172a" // Dark seabed
                emissive="#1e293b"
                emissiveIntensity={0.2}
                roughness={0.9}
                flatShading
            />
        </mesh>
    );
}

const SubmarineModel = React.forwardRef<THREE.Group, { tilt: number, roll: number }>(({ tilt, roll }, ref) => {
  const propRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (propRef.current) propRef.current.rotation.z += 10 * delta;
  });

  return (
    <group ref={ref}>
      <group rotation={[tilt, 0, -roll]}>
        {/* Main Hull Body - Uniform Cylinder - Rotated to lie on Z axis */}
        <mesh rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.75, 0.75, 4.5, 16]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.6} />
        </mesh>
        
        {/* Front Dome (Cockpit) - Facing -Z (Forward) */}
        <mesh position={[0, 0, -2.25]} rotation={[-Math.PI/2, 0, 0]}>
            <sphereGeometry args={[0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#22d3ee" roughness={0.1} metalness={0.9} transparent opacity={0.7} />
        </mesh>
        
        {/* Interior of Cockpit (Glow) */}
        <mesh position={[0, 0, -2.1]}>
             <sphereGeometry args={[0.5, 16, 16]} />
             <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
        </mesh>

        {/* Rear Cap - Facing +Z (Back) */}
        <mesh position={[0, 0, 2.25]} rotation={[Math.PI/2, 0, 0]}>
             <sphereGeometry args={[0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
             <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Hull Rings/Details - Uniform size */}
        {[1.5, 0.5, -0.5, -1.5].map((z, i) => (
            <mesh key={i} position={[0, 0, z]} rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.75, 0.08, 8, 32]} />
                <meshStandardMaterial color="#b45309" />
            </mesh>
        ))}

        {/* Top Hatch / Conning Tower - Moved forward */}
        <group position={[0, 0.7, -0.5]}>
             {/* Base */}
             <mesh>
                 <cylinderGeometry args={[0.4, 0.5, 0.6, 8]} />
                 <meshStandardMaterial color="#f59e0b" />
             </mesh>
             {/* Top Dome */}
             <mesh position={[0, 0.3, 0]}>
                 <sphereGeometry args={[0.4, 16, 16, 0, Math.PI*2, 0, Math.PI/2]} />
                 <meshStandardMaterial color="#f59e0b" />
             </mesh>
             {/* Periscope */}
             <mesh position={[0, 0.5, -0.1]}>
                 <cylinderGeometry args={[0.08, 0.08, 0.8]} />
                 <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
             </mesh>
             <mesh position={[0, 0.9, -0.1]} rotation={[Math.PI/2, 0, 0]}>
                 <cylinderGeometry args={[0.08, 0.08, 0.4]} />
                 <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
             </mesh>
        </group>

        {/* Side Thrusters / Intakes - Adjusted X to match radius */}
        <group position={[0.85, 0, 0]}>
             <mesh rotation={[0, 0, Math.PI/2]}>
                 <cylinderGeometry args={[0.25, 0.25, 0.4, 16]} />
                 <meshStandardMaterial color="#475569" />
             </mesh>
             <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                 <torusGeometry args={[0.15, 0.05, 8, 16]} />
                 <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" />
             </mesh>
        </group>
        <group position={[-0.85, 0, 0]}>
             <mesh rotation={[0, 0, Math.PI/2]}>
                 <cylinderGeometry args={[0.25, 0.25, 0.4, 16]} />
                 <meshStandardMaterial color="#475569" />
             </mesh>
             <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                 <torusGeometry args={[0.15, 0.05, 8, 16]} />
                 <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" />
             </mesh>
        </group>

        {/* Rear Fins - At +Z end */}
        <group position={[0, 0, 2.0]}>
             <mesh position={[0, 0.8, 0]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.1, 1.0, 0.8]} />
                <meshStandardMaterial color="#b45309" />
             </mesh>
             <mesh position={[0, -0.8, 0]} rotation={[-0.5, 0, 0]}>
                <boxGeometry args={[0.1, 1.0, 0.8]} />
                <meshStandardMaterial color="#b45309" />
             </mesh>
             <mesh position={[0.8, 0, 0]} rotation={[0, 0.5, 0]}>
                <boxGeometry args={[1.0, 0.1, 0.8]} />
                <meshStandardMaterial color="#b45309" />
             </mesh>
             <mesh position={[-0.8, 0, 0]} rotation={[0, -0.5, 0]}>
                <boxGeometry args={[1.0, 0.1, 0.8]} />
                <meshStandardMaterial color="#b45309" />
             </mesh>
        </group>

        {/* Shrouded Propeller - At Rear +Z */}
        <group position={[0, 0, 2.8]} ref={propRef}>
           <mesh rotation={[Math.PI/2, 0, 0]}>
               <torusGeometry args={[0.8, 0.1, 8, 32]} />
               <meshStandardMaterial color="#475569" />
           </mesh>
           <mesh>
             <boxGeometry args={[0.2, 1.5, 0.05]} />
             <meshStandardMaterial color="#94a3b8" />
           </mesh>
           <mesh rotation={[0, 0, Math.PI/2]}>
             <boxGeometry args={[0.2, 1.5, 0.05]} />
             <meshStandardMaterial color="#94a3b8" />
           </mesh>
           <mesh>
              <sphereGeometry args={[0.2]} />
              <meshStandardMaterial color="#475569" />
           </mesh>
        </group>

        {/* Headlights - Front -Z */}
        <pointLight position={[0, 0, -3]} intensity={3} distance={25} color="#ccfbf1" />
        <mesh position={[0, -0.8, -1.5]} rotation={[0.2, 0, 0]}>
             <cylinderGeometry args={[0.1, 0.2, 0.5]} rotation={[Math.PI/2, 0, 0]} />
             <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <spotLight position={[0, -0.8, -1.8]} angle={0.5} penumbra={0.5} intensity={5} color="#fff" target-position={[0, -5, -10]} />
      </group>
    </group>
  );
});

const TorpedoModel: React.FC = () => {
    return (
        <group>
            {/* Body */}
            <mesh>
                <cylinderGeometry args={[0.25, 0.25, 2, 8]} rotation={[Math.PI/2, 0, 0]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Nose - Points +Z (Towards Camera/Player) */}
            <mesh position={[0, 0, 1.2]}>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
            </mesh>
            {/* Fins */}
            <mesh position={[0, 0, -0.8]}>
                <boxGeometry args={[0.8, 0.8, 0.1]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Bubbles trail - Behind (-Z) */}
            <Sparkles count={10} scale={1} size={2} speed={0.4} opacity={0.5} color="#fff" position={[0, 0, -1.5]} />
        </group>
    )
}

const GameWorld: React.FC<{ 
    onProgress: (depth: number) => void;
    onGameOver: () => void;
    gameState: 'PLAYING' | 'GAMEOVER';
}> = ({ onProgress, onGameOver, gameState }) => {
    const { pointer, camera } = useThree();
    const subRef = useRef<THREE.Group>(null);
    const speed = useRef(15); // Slower underwater speed
    const depthRef = useRef(0);

    // Refs for game objects
    const ringsRef = useRef<Ring[]>([]);
    const torpedoesRef = useRef<Torpedo[]>([]);
    
    // Visual state
    const [rings, setRings] = useState<Ring[]>([]);
    const [torpedoes, setTorpedoes] = useState<Torpedo[]>([]);
    const [subRotation, setSubRotation] = useState({ tilt: 0, roll: 0 });

    // Initialization
    useEffect(() => {
        // Pre-populate some objects
        for (let i = 0; i < 10; i++) {
            spawnRing(i * 50 + 50);
        }
    }, []);

    const spawnRing = (zOffset: number) => {
        const x = (Math.random() - 0.5) * 40;
        const y = (Math.random() - 0.5) * 30;
        ringsRef.current.push({
            id: Math.random(),
            position: new THREE.Vector3(x, y, -zOffset),
            collected: false
        });
    };

    const spawnTorpedo = (zOffset: number) => {
        const x = (Math.random() - 0.5) * 30; // Tighter spawn area
        const y = (Math.random() - 0.5) * 20;
        torpedoesRef.current.push({
            id: Math.random(),
            position: new THREE.Vector3(x, y, -zOffset)
        });
    };

    useFrame((state, delta) => {
        if (gameState !== 'PLAYING' || !subRef.current) return;

        // 1. Controls (Mouse Follow)
        // Submarine moves heavier/slower
        const targetRoll = -pointer.x * 0.8; 
        const targetTilt = pointer.y * 0.8; 
        
        setSubRotation({ tilt: targetTilt, roll: targetRoll }); 

        // Move Sub Local Position
        subRef.current.position.x += pointer.x * 10 * delta;
        subRef.current.position.y += pointer.y * 10 * delta;
        
        // Forward Movement (simulating depth increase)
        subRef.current.position.z -= speed.current * delta;

        // Update Depth Score
        const currentDepth = Math.floor(Math.abs(subRef.current.position.z));
        depthRef.current = currentDepth;
        onProgress(currentDepth);

        // Clamp Height (Seabed collision handled separately, Ceiling clamp)
        if (subRef.current.position.y > 40) subRef.current.position.y = 40;

        const subPos = subRef.current.position;

        // 2. Camera Follow
        const camTarget = subPos.clone();
        camTarget.z += 12;
        camTarget.y += 4;
        camera.position.lerp(camTarget, delta * 3); // Laggy camera for underwater feel
        camera.lookAt(subPos);

        // 3. Ground Collision
        const terrainH = getTerrainHeight(subPos.x, subPos.z);
        if (subPos.y < terrainH + 2.0) { 
            onGameOver();
        }

        // 4. Object Spawning Logic
        const lookAhead = 150;
        const spawnZ = Math.abs(subPos.z) + lookAhead;

        // Spawn Rings
        if (ringsRef.current.length < 8) {
            spawnRing(spawnZ);
        }
        
        // Spawn Torpedoes - FEWER (Conditional spawn)
        // Only spawn if random chance hits and not too many on screen
        if (torpedoesRef.current.length < 3 && Math.random() > 0.98) {
             spawnTorpedo(spawnZ + Math.random() * 50);
        }
        
        // 5. Collision Logic
        
        // Rings
        ringsRef.current.forEach(ring => {
            if (ring.collected) return;
            const dist = subPos.distanceTo(ring.position);
            if (dist < 3.5) { 
                ring.collected = true;
                speed.current += 0.2; 
            }
        });
        ringsRef.current = ringsRef.current.filter(r => r.position.z < subPos.z + 10);

        // Torpedoes
        torpedoesRef.current.forEach(t => {
             // Move torpedoes slowly towards player Z? No, stationary mines/torpedoes for now, or moving forward?
             // Let's make them move towards player slightly
             t.position.z += 5 * delta; 
             
             const dist = subPos.distanceTo(t.position);
             if (dist < 2.0) {
                 onGameOver();
             }
        });
        torpedoesRef.current = torpedoesRef.current.filter(t => t.position.z < subPos.z + 20); // Remove when behind camera

        // Sync for React Render
        setRings([...ringsRef.current]);
        setTorpedoes([...torpedoesRef.current]);
    });

    return (
        <>
            <fog attach="fog" args={['#083344', 10, 80]} />
            <ambientLight intensity={0.4} color="#0ea5e9" />
            <directionalLight position={[50, 100, 50]} intensity={1.0} color="#e0f2fe" castShadow />
            
            {/* Particles/Plankton */}
            <Sparkles count={500} scale={100} size={4} speed={0.4} opacity={0.4} color="#22d3ee" />

            <SubmarineModel ref={subRef} tilt={subRotation.tilt} roll={subRotation.roll} />
            
            {/* Terrain Generation */}
            <Terrain subRef={subRef} />

            {/* Rings (Research Data) */}
            {rings.map(ring => !ring.collected && (
                <group key={ring.id} position={ring.position}>
                    <mesh rotation={[0, 0, 0]}>
                        <torusGeometry args={[1.5, 0.1, 8, 16]} />
                        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} />
                    </mesh>
                    <mesh>
                         <circleGeometry args={[1.5, 32]} />
                         <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            ))}

            {/* Torpedoes */}
            {torpedoes.map(t => (
                <group key={t.id} position={t.position}>
                     <TorpedoModel />
                </group>
            ))}
        </>
    );
};

export const AirplaneGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [depth, setDepth] = useState(0);
    const [gameState, setGameState] = useState<'PLAYING' | 'GAMEOVER'>('PLAYING');

    const handleGameOver = () => {
        setGameState('GAMEOVER');
    };

    const restart = () => {
        setDepth(0);
        setGameState('PLAYING');
    };

    return (
        <div className="w-full h-full relative bg-cyan-950 overflow-hidden cursor-none">
            {/* HUD */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-900/50 p-2 rounded-lg border border-cyan-500/50 backdrop-blur-sm">
                        <Activity className="text-cyan-400" size={24} />
                    </div>
                    <div>
                        <div className="text-cyan-400 font-bold text-2xl font-mono leading-none">{depth}m</div>
                        <div className="text-cyan-400/60 text-xs font-bold uppercase tracking-wider">Current Depth</div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-6 z-10 pointer-events-none text-cyan-200/50 text-xs font-mono">
                <Waves size={14} className="inline mr-2" />
                鼠标导航 // 躲避地形与鱼雷
            </div>

            <button 
                onClick={onExit}
                className="absolute top-6 right-6 z-10 bg-slate-900/50 hover:bg-slate-900 text-white px-4 py-2 rounded-lg border border-white/10 transition-all backdrop-blur-sm flex items-center gap-2 cursor-pointer"
            >
                <Home size={16} /> 撤离
            </button>

            {/* Game Over Modal */}
            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-auto">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl text-center max-w-sm w-full shadow-2xl shadow-cyan-900/50">
                        <Skull className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white mb-2">船体破裂!</h2>
                        <p className="text-slate-400 mb-6">在深海中迷失...</p>
                        
                        <div className="bg-slate-800 p-4 rounded-xl mb-6">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">最大深度</div>
                            <div className="text-4xl font-mono text-cyan-400">{depth}m</div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={restart}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                            >
                                <Target size={18} /> 下潜
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

            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
                <GameWorld 
                    onProgress={setDepth} 
                    onGameOver={handleGameOver}
                    gameState={gameState}
                />
            </Canvas>
        </div>
    );
};
