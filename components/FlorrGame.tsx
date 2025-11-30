import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Home, Info, Flower, Shield, Zap, Skull, ShoppingCart, Eye, Sword } from 'lucide-react';
import { getGameInfo, GameInfoResult } from '../services/geminiService';
import '../types'; // Import types for R3F JSX elements

// --- Types & Constants ---

type Rarity = 'COMMON' | 'UNUSUAL' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

const RARITY_CONFIG: Record<Rarity, { color: string; damage: number; hp: number; size: number }> = {
    COMMON: { color: '#a3a3a3', damage: 10, hp: 30, size: 0.6 },
    UNUSUAL: { color: '#4ade80', damage: 25, hp: 60, size: 0.7 },
    RARE: { color: '#3b82f6', damage: 50, hp: 120, size: 0.8 },
    EPIC: { color: '#a855f7', damage: 100, hp: 250, size: 0.9 },
    LEGENDARY: { color: '#ef4444', damage: 250, hp: 600, size: 1.1 },
    MYTHIC: { color: '#eab308', damage: 600, hp: 1500, size: 1.3 },
};

const MOB_TYPES = [
    { name: 'LADYBUG', color: '#ef4444', hp: 30, damage: 10, speed: 2.5, radius: 0.8, xp: 10 },
    { name: 'BEETLE', color: '#16a34a', hp: 80, damage: 20, speed: 1.5, radius: 1.0, xp: 30 },
    { name: 'ROCK', color: '#57534e', hp: 200, damage: 40, speed: 0.8, radius: 1.2, xp: 80 },
    { name: 'HORNET', color: '#eab308', hp: 50, damage: 30, speed: 3.5, radius: 0.7, xp: 50 },
];

interface Entity {
    id: number;
    x: number;
    y: number;
    radius: number;
}

interface Petal extends Entity {
    rarity: Rarity;
    angle: number;
    currentHp: number;
    maxHp: number;
    cooldown: number;
}

interface Mob extends Entity {
    typeIndex: number;
    currentHp: number;
    maxHp: number;
}

interface Loot extends Entity {
    value: number;
    color: string;
    life: number;
}

interface ShopStats {
    damageMultiplier: number;
    visionMultiplier: number;
}

// --- Game Engine Component ---

const FlorrEngine: React.FC<{ 
    onGameOver: (score: number) => void;
    onUpdateStats: (hp: number, maxHp: number, level: number, xp: number) => void;
    shopStats: ShopStats;
}> = ({ onGameOver, onUpdateStats, shopStats }) => {
    const { viewport, pointer } = useThree();
    
    // Game State Refs (Mutable for performance in loop)
    const playerRef = useRef({ x: 0, y: 0, hp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 100 });
    const petalsRef = useRef<Petal[]>([]);
    const mobsRef = useRef<Mob[]>([]);
    const lootRef = useRef<Loot[]>([]);
    
    // Visual State (for React rendering)
    const [petalsRender, setPetalsRender] = useState<Petal[]>([]);
    const [mobsRender, setMobsRender] = useState<Mob[]>([]);
    const [lootRender, setLootRender] = useState<Loot[]>([]);
    
    const lastSpawnTime = useRef(0);
    const startTime = useRef(Date.now());

    // --- Initialization ---
    useEffect(() => {
        // Initial Loadout: 5 Common Petals
        const initialPetals: Petal[] = [];
        for(let i=0; i<5; i++) {
            const rarity = 'COMMON';
            initialPetals.push({
                id: Math.random(),
                x: 0, 
                y: 0,
                radius: RARITY_CONFIG[rarity].size,
                rarity,
                angle: (i / 5) * Math.PI * 2,
                currentHp: RARITY_CONFIG[rarity].hp,
                maxHp: RARITY_CONFIG[rarity].hp,
                cooldown: 0
            });
        }
        petalsRef.current = initialPetals;
    }, []);

    // --- Upgrade Logic ---
    const checkLevelUp = () => {
        const p = playerRef.current;
        if (p.xp >= p.xpToNext) {
            p.xp -= p.xpToNext;
            p.level++;
            p.maxHp += 20;
            p.hp = p.maxHp;
            p.xpToNext = Math.floor(p.xpToNext * 1.5);
            
            // Upgrade a random petal
            const upgradeIndex = Math.floor(Math.random() * petalsRef.current.length);
            const petal = petalsRef.current[upgradeIndex];
            
            const rarities: Rarity[] = ['COMMON', 'UNUSUAL', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
            const currentIdx = rarities.indexOf(petal.rarity);
            
            if (currentIdx < rarities.length - 1) {
                const nextRarity = rarities[currentIdx + 1];
                petal.rarity = nextRarity;
                petal.maxHp = RARITY_CONFIG[nextRarity].hp;
                petal.currentHp = petal.maxHp;
                petal.radius = RARITY_CONFIG[nextRarity].size;
            }
        }
    };

    // --- Game Loop ---
    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;
        const p = playerRef.current;
        
        // 1. Player Movement (Follow Mouse with Lerp)
        // Convert NDC pointer to world coordinates (adjusted for Zoom)
        // Note: shopStats.visionMultiplier is applied to camera zoom outside, 
        // so viewport automatically adjusts, but we need to ensure pointer logic holds.
        const targetX = (pointer.x * viewport.width) / 2;
        const targetY = (pointer.y * viewport.height) / 2;
        
        const speed = 5 * delta;
        p.x += (targetX - p.x) * speed;
        p.y += (targetY - p.y) * speed;

        // 2. Petal Orbit Logic
        const rotationSpeed = 2.5; // Rads per second
        const orbitRadius = 2.5;
        
        petalsRef.current.forEach((petal, i) => {
            // Update angle
            petal.angle += rotationSpeed * delta;
            
            // Calculate position
            petal.x = p.x + Math.cos(petal.angle) * orbitRadius;
            petal.y = p.y + Math.sin(petal.angle) * orbitRadius;
            
            // Regen health slowly
            if (petal.currentHp < petal.maxHp) petal.currentHp += delta * 5;
            // Cooldown recovery
            if (petal.cooldown > 0) petal.cooldown -= delta;
        });

        // 3. Mob Spawning
        if (time - lastSpawnTime.current > Math.max(0.5, 2 - p.level * 0.1)) {
            lastSpawnTime.current = time;
            
            // Pick random spawn point outside viewport
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = Math.max(viewport.width, viewport.height) / 2 + 2;
            const typeIdx = Math.floor(Math.random() * Math.min(MOB_TYPES.length, 1 + Math.floor(p.level/3)));
            const mobData = MOB_TYPES[typeIdx];

            mobsRef.current.push({
                id: Math.random(),
                x: p.x + Math.cos(angle) * spawnDist,
                y: p.y + Math.sin(angle) * spawnDist,
                typeIndex: typeIdx,
                radius: mobData.radius,
                currentHp: mobData.hp * (1 + p.level * 0.2), // Scaling difficulty
                maxHp: mobData.hp * (1 + p.level * 0.2)
            });
        }

        // 4. Mob Logic & Physics
        for (let i = mobsRef.current.length - 1; i >= 0; i--) {
            const mob = mobsRef.current[i];
            const mobData = MOB_TYPES[mob.typeIndex];
            
            // Move towards player
            const dx = p.x - mob.x;
            const dy = p.y - mob.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Normalize and move
            if (dist > 0) {
                mob.x += (dx / dist) * mobData.speed * delta;
                mob.y += (dy / dist) * mobData.speed * delta;
            }

            // --- Collision: Mob vs Player ---
            if (dist < 1.0 + mob.radius) { // Player radius approx 1.0
                p.hp -= mobData.damage * delta;
                // Knockback
                mob.x -= (dx / dist) * 5 * delta;
                mob.y -= (dy / dist) * 5 * delta;
            }

            // --- Collision: Mob vs Petals ---
            for (const petal of petalsRef.current) {
                if (petal.cooldown > 0) continue;

                const pdx = petal.x - mob.x;
                const pdy = petal.y - mob.y;
                const pDist = Math.sqrt(pdx*pdx + pdy*pdy);

                if (pDist < petal.radius + mob.radius) {
                    // Hit!
                    const config = RARITY_CONFIG[petal.rarity];
                    // APPLY SHOP DAMAGE MULTIPLIER
                    const damage = config.damage * shopStats.damageMultiplier;
                    
                    mob.currentHp -= damage;
                    petal.currentHp -= 10; // Petal takes durability damage
                    petal.cooldown = 0.2; // Invulnerability frames

                    // Knockback mob
                    const angle = Math.atan2(pdy, pdx);
                    mob.x -= Math.cos(angle) * 1.5; 
                    mob.y -= Math.sin(angle) * 1.5;

                    // Visual effect (could add particle system here)
                }
            }

            // Death Check
            if (mob.currentHp <= 0) {
                // Drop Loot
                lootRef.current.push({
                    id: Math.random(),
                    x: mob.x,
                    y: mob.y,
                    radius: 0.4,
                    value: mobData.xp,
                    color: '#eab308',
                    life: 10 // Seconds to disappear
                });
                mobsRef.current.splice(i, 1);
            }
        }

        // 5. Loot Logic
        for (let i = lootRef.current.length - 1; i >= 0; i--) {
            const loot = lootRef.current[i];
            loot.life -= delta;
            
            // Magnet effect
            const dx = p.x - loot.x;
            const dy = p.y - loot.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 4) {
                loot.x += (dx / dist) * 10 * delta;
                loot.y += (dy / dist) * 10 * delta;
            }

            if (dist < 1) {
                p.xp += loot.value;
                checkLevelUp();
                lootRef.current.splice(i, 1);
            } else if (loot.life <= 0) {
                lootRef.current.splice(i, 1);
            }
        }

        // Sync State to UI
        // We use Math.ceil/floor for clean numbers in UI
        onUpdateStats(Math.ceil(p.hp), Math.ceil(p.maxHp), p.level, Math.floor(p.xp));

        if (p.hp <= 0) {
            onGameOver(Math.floor((Date.now() - startTime.current) / 1000));
        }

        // Update Render State
        setPetalsRender([...petalsRef.current]);
        setMobsRender([...mobsRef.current]);
        setLootRender([...lootRef.current]);
    });

    // --- Rendering ---
    return (
        <>
            {/* Background Grid */}
            <gridHelper args={[100, 50, 0x334155, 0x1e293b]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -1]} />

            {/* Player Body */}
            <mesh position={[playerRef.current.x, playerRef.current.y, 0]}>
                <circleGeometry args={[1, 32]} />
                <meshBasicMaterial color="#fbbf24" /> {/* Yellow Core */}
            </mesh>
            <mesh position={[playerRef.current.x, playerRef.current.y, -0.1]}>
                <circleGeometry args={[1.1, 32]} />
                <meshBasicMaterial color="#000000" opacity={0.2} transparent />
            </mesh>

            {/* Petals */}
            {petalsRender.map(petal => {
                const config = RARITY_CONFIG[petal.rarity];
                return (
                    <group key={petal.id} position={[petal.x, petal.y, 1]}>
                        {/* Petal Shape */}
                        <mesh>
                            <circleGeometry args={[petal.radius, 24]} />
                            <meshBasicMaterial color={config.color} />
                        </mesh>
                        {/* Border */}
                        <mesh position={[0,0,-0.05]}>
                            <circleGeometry args={[petal.radius * 1.1, 24]} />
                            <meshBasicMaterial color="black" opacity={0.3} transparent />
                        </mesh>
                    </group>
                )
            })}

            {/* Mobs */}
            {mobsRender.map(mob => {
                const type = MOB_TYPES[mob.typeIndex];
                const hpPct = mob.currentHp / mob.maxHp;
                return (
                    <group key={mob.id} position={[mob.x, mob.y, 0.5]}>
                         <mesh>
                            <circleGeometry args={[mob.radius, 24]} />
                            <meshBasicMaterial color={type.color} />
                         </mesh>
                         {/* Eyes */}
                         <mesh position={[-mob.radius*0.3, mob.radius*0.3, 0.1]}>
                             <circleGeometry args={[mob.radius*0.2, 8]} />
                             <meshBasicMaterial color="white" />
                         </mesh>
                         <mesh position={[mob.radius*0.3, mob.radius*0.3, 0.1]}>
                             <circleGeometry args={[mob.radius*0.2, 8]} />
                             <meshBasicMaterial color="white" />
                         </mesh>
                         {/* HP Bar */}
                         <mesh position={[0, -mob.radius - 0.2, 0]}>
                             <planeGeometry args={[1.5 * hpPct, 0.15]} />
                             <meshBasicMaterial color={hpPct > 0.5 ? "#4ade80" : "#ef4444"} />
                         </mesh>
                    </group>
                )
            })}

            {/* Loot */}
            {lootRender.map(loot => (
                 <mesh key={loot.id} position={[loot.x, loot.y, 0.2]}>
                    <circleGeometry args={[0.3, 8]} />
                    <meshBasicMaterial color={loot.color} />
                 </mesh>
            ))}
        </>
    );
};

// --- Shop Component ---

interface ShopProps {
    score: number;
    onPurchase: (cost: number, type: 'DAMAGE' | 'VISION') => void;
    stats: ShopStats;
    onClose: () => void;
}

const ShopModal: React.FC<ShopProps> = ({ score, onPurchase, stats, onClose }) => {
    const damageCost = Math.floor(100 * Math.pow(1.5, (stats.damageMultiplier - 1) * 2));
    const visionCost = Math.floor(100 * Math.pow(1.5, (stats.visionMultiplier - 1) * 2));

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ShoppingCart className="text-yellow-400" /> 商店
                    </h2>
                    <div className="text-yellow-400 font-mono">当前积分: {score}</div>
                </div>
                
                <div className="space-y-4">
                    {/* Damage Upgrade */}
                    <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                <Sword size={16} className="text-red-400" /> 攻击力提升
                            </div>
                            <div className="text-slate-400 text-xs">当前倍率: x{stats.damageMultiplier.toFixed(1)}</div>
                        </div>
                        <button 
                            disabled={score < damageCost}
                            onClick={() => onPurchase(damageCost, 'DAMAGE')}
                            className={`px-4 py-2 rounded font-bold text-sm ${score >= damageCost ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            购买 ({damageCost})
                        </button>
                    </div>

                    {/* Vision Upgrade */}
                    <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                <Eye size={16} className="text-blue-400" /> 视野范围提升
                            </div>
                            <div className="text-slate-400 text-xs">当前倍率: x{stats.visionMultiplier.toFixed(1)}</div>
                        </div>
                        <button 
                            disabled={score < visionCost}
                            onClick={() => onPurchase(visionCost, 'VISION')}
                            className={`px-4 py-2 rounded font-bold text-sm ${score >= visionCost ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            购买 ({visionCost})
                        </button>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="mt-8 w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold"
                >
                    关闭商店
                </button>
            </div>
        </div>
    );
}

// --- Main Component ---

interface FlorrGameProps {
    onExit: () => void;
}

export const FlorrGame: React.FC<FlorrGameProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState<'PLAYING' | 'GAMEOVER'>('PLAYING');
  const [info, setInfo] = useState<GameInfoResult | null>(null);
  const [playerStats, setPlayerStats] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0 });
  const [finalScore, setFinalScore] = useState(0);
  
  // Shop State
  const [shopOpen, setShopOpen] = useState(false);
  const [shopStats, setShopStats] = useState<ShopStats>({ damageMultiplier: 1, visionMultiplier: 1 });

  useEffect(() => {
    getGameInfo("florr.io").then(setInfo);
  }, []);

  const handleUpdateStats = (hp: number, maxHp: number, level: number, xp: number) => {
      setPlayerStats({ hp, maxHp, level, xp });
  };

  const handleGameOver = (score: number) => {
      setFinalScore(score);
      setGameState('GAMEOVER');
  };

  const restart = () => {
      setGameState('PLAYING');
      setPlayerStats({ hp: 100, maxHp: 100, level: 1, xp: 0 });
      setShopStats({ damageMultiplier: 1, visionMultiplier: 1 });
  };

  const handlePurchase = (cost: number, type: 'DAMAGE' | 'VISION') => {
      if (type === 'DAMAGE') {
          setShopStats(prev => ({ ...prev, damageMultiplier: prev.damageMultiplier + 0.5 }));
      } else {
          setShopStats(prev => ({ ...prev, visionMultiplier: prev.visionMultiplier + 0.2 }));
      }
      setShopOpen(false);
  };

  const currentZoom = 40 / shopStats.visionMultiplier;

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden font-sans select-none">
      {/* Header */}
      <div className="bg-slate-900/90 p-4 flex justify-between items-center border-b border-slate-800 shadow-lg z-10 backdrop-blur-sm">
         <div className="flex items-center gap-4">
            <div className="bg-green-500/20 p-2 rounded-full">
                <Flower className="text-green-400" size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-white font-display tracking-wide">花朵大乱斗</h1>
                <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1 text-green-400">
                        <Zap size={12} /> 等级 {playerStats.level}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                        <Shield size={12} /> 生命 {playerStats.hp}/{playerStats.maxHp}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                        <ShoppingCart size={12} /> 积分 {playerStats.xp}
                    </span>
                </div>
            </div>
         </div>
         <div className="flex gap-2">
            <button 
                onClick={() => setShopOpen(true)}
                className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-4 py-2 rounded border border-yellow-600/50 transition-all"
            >
                <ShoppingCart size={18} /> 商店
            </button>
            <button 
                onClick={onExit} 
                className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 px-4 py-2 rounded border border-slate-700 hover:border-red-500/50 transition-all"
            >
                <Home size={18} /> 
                <span className="hidden sm:inline">返回大厅</span>
            </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
         
         {/* Shop Overlay */}
         {shopOpen && (
             <ShopModal 
                score={playerStats.xp} 
                onPurchase={handlePurchase} 
                stats={shopStats}
                onClose={() => setShopOpen(false)}
             />
         )}

         {/* Game Canvas */}
         <div className="flex-1 relative bg-[#222] cursor-crosshair">
            {gameState === 'PLAYING' && (
                <Canvas>
                    <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={currentZoom} />
                    <FlorrEngine 
                        onGameOver={handleGameOver} 
                        onUpdateStats={handleUpdateStats} 
                        shopStats={shopStats}
                    />
                </Canvas>
            )}

            {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 text-center max-w-md w-full shadow-2xl shadow-red-900/20">
                        <Skull className="w-20 h-20 text-red-500 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-4xl font-bold text-white mb-2 font-display">枯萎了</h2>
                        <p className="text-slate-400 mb-6">你的花朵回归了尘土。</p>
                        
                        <div className="bg-slate-800 p-4 rounded-xl mb-8">
                            <div className="text-sm text-slate-500 uppercase tracking-widest mb-1">生存时间</div>
                            <div className="text-3xl font-mono text-yellow-400">{finalScore}秒</div>
                        </div>

                        <button 
                            onClick={restart}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            再次绽放
                        </button>
                    </div>
                </div>
            )}
         </div>

         {/* Sidebar Info (Gemini) */}
         <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto hidden lg:block z-20 shadow-xl">
            <div className="mb-8">
                <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2 font-display uppercase tracking-wider border-b border-slate-800 pb-2">
                    <Info size={18} /> AI 战略指南
                </h3>
                
                {info ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-700">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {info.description}
                            </p>
                        </div>
                        
                        {info.sources && info.sources.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-cyan-400 font-bold mb-2 text-xs uppercase">来源</h4>
                                <ul className="space-y-1">
                                    {info.sources.map((s, i) => (
                                        <li key={i}>
                                            <a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-white underline truncate block">
                                                {s.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {info.tips.length > 0 && (
                            <div>
                                <h4 className="text-yellow-400 font-bold mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-4 bg-yellow-400 rounded-full"></span>
                                    专家技巧
                                </h4>
                                <ul className="space-y-3">
                                    {info.tips.map((tip, i) => (
                                        <li key={i} className="text-slate-400 text-sm pl-3 border-l-2 border-slate-700 hover:border-yellow-500/50 transition-colors">
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 opacity-50">
                         <div className="flex flex-col gap-2">
                            <div className="h-2 bg-slate-800 rounded animate-pulse w-3/4"></div>
                            <div className="h-2 bg-slate-800 rounded animate-pulse w-full"></div>
                            <div className="h-2 bg-slate-800 rounded animate-pulse w-5/6"></div>
                         </div>
                        <p className="text-xs text-cyan-500/50 text-center animate-pulse pt-4">
                            正在分析游戏模式...
                        </p>
                    </div>
                )}
            </div>

            {/* Controls Help */}
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                <h4 className="text-slate-300 font-bold text-xs uppercase mb-3">控制</h4>
                <div className="space-y-2 text-xs text-slate-400 font-mono">
                    <div className="flex justify-between">
                        <span>移动</span>
                        <span className="text-white">跟随鼠标</span>
                    </div>
                    <div className="flex justify-between">
                        <span>攻击</span>
                        <span className="text-white">自动环绕</span>
                    </div>
                    <div className="flex justify-between">
                        <span>策略</span>
                        <span className="text-white">风筝战术</span>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};