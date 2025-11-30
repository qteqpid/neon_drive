
import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Home, RefreshCw, Zap, PenTool, MousePointer2 } from 'lucide-react';
import '../types'; // Import types for R3F JSX elements

interface PhysicsObject {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    mass: number;
    color: string;
    bounciness: number;
    radius: number;
}

interface LineStroke {
    id: number;
    points: THREE.Vector3[];
}

interface PhysicsSceneProps {
    selectedColor: string | null;
    activeTool: 'SPAWNER' | 'BRUSH';
}

const PhysicsScene: React.FC<PhysicsSceneProps> = ({ selectedColor, activeTool }) => {
    const [objects, setObjects] = useState<PhysicsObject[]>([]);
    const [lines, setLines] = useState<LineStroke[]>([]);
    const [currentLine, setCurrentLine] = useState<LineStroke | null>(null);
    
    const linesRef = useRef<LineStroke[]>([]);
    const currentLineRef = useRef<LineStroke | null>(null);

    // Sync refs for useFrame loop
    useEffect(() => { linesRef.current = lines; }, [lines]);
    useEffect(() => { currentLineRef.current = currentLine; }, [currentLine]);

    const spawnObject = (position: THREE.Vector3) => {
        let color = selectedColor;
        const radius = 0.25; // Constant size ~25px
        let mass = 1;
        let bounciness = 0.6;
        const zPos = 0; // Strictly 2D

        if (color === '#3b82f6') { // Blue - Heavy Steel
            mass = 5;
            bounciness = 0.2;
        } else if (color === '#ef4444') { // Red - Bouncy Rubber
            mass = 1;
            bounciness = 0.8;
        } else if (color === '#eab308') { // Yellow - Superball / Plastic
            mass = 0.3;
            bounciness = 0.95;
        } else {
            // Random
            color = `hsl(${Math.random() * 360}, 70%, 50%)`;
            mass = 1 + Math.random(); 
            bounciness = 0.3 + Math.random() * 0.6;
        }

        const newObj: PhysicsObject = {
            id: Date.now() + Math.random(),
            position: new THREE.Vector3(position.x, position.y, zPos),
            velocity: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, 0), // No Z velocity
            mass,
            color: color!,
            bounciness,
            radius,
        };
        setObjects(prev => [...prev, newObj]);
    };

    // Interaction Handlers
    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const point = e.point.clone();
        point.z = 0; 

        if (activeTool === 'SPAWNER') {
            spawnObject(point);
        } else if (activeTool === 'BRUSH') {
            const newLine = { id: Date.now(), points: [point] };
            setCurrentLine(newLine);
            // @ts-ignore
            e.target.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (activeTool === 'BRUSH' && currentLine) {
            e.stopPropagation();
            const point = e.point.clone();
            point.z = 0;
            
            const lastPoint = currentLine.points[currentLine.points.length - 1];
            if (point.distanceTo(lastPoint) > 0.1) {
                setCurrentLine(prev => prev ? ({ ...prev, points: [...prev.points, point] }) : null);
            }
        }
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (activeTool === 'BRUSH' && currentLine) {
            e.stopPropagation();
            if (currentLine.points.length > 1) {
                setLines(prev => [...prev, currentLine]);
            }
            setCurrentLine(null);
            // @ts-ignore
            e.target.releasePointerCapture(e.pointerId);
        }
    };

    useFrame((state, delta) => {
        const activeLines = [...linesRef.current];
        if (currentLineRef.current) activeLines.push(currentLineRef.current);
        
        // Physics Sub-stepping Configuration
        const SUBSTEPS = 12; // Increased from 8 for better stability
        const MAX_DELTA = 0.1; 
        const dt = Math.min(delta, MAX_DELTA) / SUBSTEPS;
        
        // Max speed to prevent tunneling (radius / dt is theoretical max, we go safer)
        const MAX_SPEED = 25; 

        setObjects(prevObjs => {
            // Clone objects for simulation
            const nextObjs = prevObjs.map(o => ({
                ...o,
                position: o.position.clone(),
                velocity: o.velocity.clone()
            }));

            // Physics Loop
            for (let step = 0; step < SUBSTEPS; step++) {
                
                // 1. Integration & Wall Collision
                for (let i = 0; i < nextObjs.length; i++) {
                    const obj = nextObjs[i];
                    
                    // Apply Gravity
                    obj.velocity.y += -9.81 * dt;
                    
                    // Clamp Velocity
                    if (obj.velocity.length() > MAX_SPEED) {
                        obj.velocity.setLength(MAX_SPEED);
                    }

                    // Proposed Position
                    const prevPos = obj.position.clone();
                    const nextPos = obj.position.clone().add(obj.velocity.clone().multiplyScalar(dt));
                    
                    // Check Walls (Lines)
                    let collidedWithWall = false;
                    
                    for (const line of activeLines) {
                        if (collidedWithWall) break; 
                        
                        for (let k = 0; k < line.points.length - 1; k++) {
                            const p1 = line.points[k];
                            const p2 = line.points[k+1];
                            
                            const p1_2 = new THREE.Vector2(p1.x, p1.y);
                            const p2_2 = new THREE.Vector2(p2.x, p2.y);
                            const pos_2 = new THREE.Vector2(nextPos.x, nextPos.y);
                            const prev_2 = new THREE.Vector2(prevPos.x, prevPos.y);
                            
                            const segVec = p2_2.clone().sub(p1_2);
                            const segLenSq = segVec.lengthSq();
                            
                            if (segLenSq === 0) continue;

                            // --- CHECK 1: Proximity (Standard Discrete Collision) ---
                            const pointVec = pos_2.clone().sub(p1_2);
                            const t = Math.max(0, Math.min(1, pointVec.dot(segVec) / segLenSq));
                            const closestPoint = p1_2.clone().add(segVec.clone().multiplyScalar(t));
                            
                            const distVec = pos_2.clone().sub(closestPoint);
                            const dist = distVec.length();
                            
                            const lineThickness = 0.15;
                            const minDist = obj.radius + lineThickness;

                            if (dist < minDist) {
                                let normal = distVec.clone().normalize();
                                if (dist < 0.0001) normal = new THREE.Vector2(-segVec.y, segVec.x).normalize();
                                const normal3 = new THREE.Vector3(normal.x, normal.y, 0);

                                // Position Correction (ALWAYS push out, regardless of velocity)
                                const overlap = minDist - dist;
                                nextPos.add(normal3.clone().multiplyScalar(overlap));
                                
                                // Velocity Response (Only if moving towards wall)
                                const vDotN = obj.velocity.dot(normal3);
                                if (vDotN < 0) {
                                    const restitution = obj.bounciness;
                                    obj.velocity.sub(normal3.multiplyScalar((1 + restitution) * vDotN));
                                }
                                
                                collidedWithWall = true;
                                break; 
                            }

                            // --- CHECK 2: Tunneling (Continuous Collision Detection) ---
                            if (!collidedWithWall) {
                                const wallDir = segVec.clone().normalize();
                                const wallNormal = new THREE.Vector2(-wallDir.y, wallDir.x);
                                
                                const distPrev = prev_2.clone().sub(p1_2).dot(wallNormal);
                                const distNext = pos_2.clone().sub(p1_2).dot(wallNormal);

                                // If signs differ, we crossed the infinite line
                                if ((distPrev > 0 && distNext < 0) || (distPrev < 0 && distNext > 0)) {
                                    const time = distPrev / (distPrev - distNext);
                                    const intersection = prev_2.clone().lerp(pos_2, time);

                                    // Project intersection onto wall vector to check bounds
                                    const toIntersection = intersection.clone().sub(p1_2);
                                    const projection = toIntersection.dot(wallDir);
                                    const wallLen = Math.sqrt(segLenSq);

                                    // If intersection is within segment
                                    if (projection >= 0 && projection <= wallLen) {
                                        const hitNormal = wallNormal.clone().multiplyScalar(Math.sign(distPrev));
                                        const hitNormal3 = new THREE.Vector3(hitNormal.x, hitNormal.y, 0);
                                        
                                        // Velocity Response
                                        const vDotN = obj.velocity.dot(hitNormal3);
                                        const restitution = obj.bounciness;
                                        obj.velocity.sub(hitNormal3.multiplyScalar((1 + restitution) * vDotN));
                                        
                                        // Snap to surface
                                        const resolutionPos = intersection.clone().add(hitNormal.multiplyScalar(minDist));
                                        
                                        nextPos.set(resolutionPos.x, resolutionPos.y, 0);
                                        collidedWithWall = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (collidedWithWall) break;
                    }
                    obj.position.copy(nextPos);
                }

                // 2. Ball-Ball Collisions
                for (let i = 0; i < nextObjs.length; i++) {
                    const objA = nextObjs[i];
                    for (let j = i + 1; j < nextObjs.length; j++) {
                        const objB = nextObjs[j];
                        
                        const distVec = objB.position.clone().sub(objA.position);
                        distVec.z = 0; // Enforce 2D
                        const distSq = distVec.lengthSq();
                        const minDist = objA.radius + objB.radius;

                        if (distSq < minDist * minDist && distSq > 0.0001) {
                            const dist = Math.sqrt(distSq);
                            const normal = distVec.clone().multiplyScalar(1 / dist);

                            const overlap = minDist - dist;
                            const totalMass = objA.mass + objB.mass;
                            const moveA = overlap * (objB.mass / totalMass);
                            const moveB = overlap * (objA.mass / totalMass);
                            
                            objA.position.sub(normal.clone().multiplyScalar(moveA));
                            objB.position.add(normal.clone().multiplyScalar(moveB));

                            const relVel = objB.velocity.clone().sub(objA.velocity);
                            const velAlongNormal = relVel.dot(normal);

                            if (velAlongNormal < 0) {
                                const restitution = Math.min(objA.bounciness, objB.bounciness);
                                let jVal = -(1 + restitution) * velAlongNormal;
                                jVal /= (1 / objA.mass + 1 / objB.mass);
                                
                                const impulse = normal.clone().multiplyScalar(jVal);
                                objA.velocity.sub(impulse.clone().multiplyScalar(1 / objA.mass));
                                objB.velocity.add(impulse.clone().multiplyScalar(1 / objB.mass));
                            }
                        }
                    }
                }
            }

            return nextObjs.filter(o => o.position.y > -50); 
        });
    });

    return (
        <>
            <mesh 
                position={[0, 0, 0]} 
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            {objects.map(obj => (
                <mesh key={obj.id} position={obj.position}>
                    <sphereGeometry args={[obj.radius, 32, 32]} />
                    <meshBasicMaterial color={obj.color} />
                </mesh>
            ))}

            {lines.map(line => (
                <Line 
                    key={line.id} 
                    points={line.points} 
                    color="white" 
                    lineWidth={5} 
                    vertexColors={false}
                />
            ))}
            {currentLine && (
                <Line 
                    points={currentLine.points} 
                    color="#22d3ee" 
                    lineWidth={5} 
                    vertexColors={false}
                    dashed
                    dashScale={2}
                />
            )}
            
            <group position={[0, 2, -5]}>
                <Text fontSize={0.5} color="white" anchorX="center" fillOpacity={0.5}>
                    {activeTool === 'SPAWNER' ? '点击以生成物体' : '拖动以绘制障碍'}
                </Text>
            </group>
        </>
    );
};

interface PhysicsDemoProps {
    onExit: () => void;
}

export const PhysicsDemo: React.FC<PhysicsDemoProps> = ({ onExit }) => {
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'SPAWNER' | 'BRUSH'>('SPAWNER');

    const colors = [
        { name: 'Blue', value: '#3b82f6', label: '重型钢球', desc: '低弹性' },
        { name: 'Red', value: '#ef4444', label: '弹力橡胶', desc: '高弹性' },
        { name: 'Yellow', value: '#eab308', label: '超级弹球', desc: '极高弹性' },
    ];

    return (
        <div className="w-full h-full relative bg-slate-900">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={50} />
                <PhysicsScene selectedColor={selectedColor} activeTool={activeTool} />
            </Canvas>
            
            <div className="absolute top-6 left-28 pointer-events-none z-0">
                <h1 className="text-3xl font-bold text-white mb-1 font-display">牛顿沙盒</h1>
                <p className="text-slate-400 text-sm">重力物理模拟实验</p>
            </div>

            <div className="absolute left-6 top-6 bottom-6 w-20 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 flex flex-col items-center py-8 gap-6 z-10 shadow-2xl shadow-black/50">
                <div className="text-cyan-400 mb-2">
                    <Zap size={24} />
                </div>
                
                <div className="flex flex-col gap-4 w-full px-2">
                    <button
                        onClick={() => setActiveTool('SPAWNER')}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
                            activeTool === 'SPAWNER' 
                            ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="生成工具"
                    >
                        <MousePointer2 size={20} />
                    </button>
                    <button
                        onClick={() => setActiveTool('BRUSH')}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
                            activeTool === 'BRUSH' 
                            ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="画笔工具"
                    >
                        <PenTool size={20} />
                    </button>
                </div>

                <div className="w-8 h-px bg-slate-700"></div>

                <div className="flex-1 flex flex-col gap-4 justify-start w-full items-center overflow-y-auto scrollbar-hide">
                    {colors.map((c) => (
                        <div key={c.name} className="relative group flex flex-col items-center">
                            <button 
                                onClick={() => {
                                    setSelectedColor(c.value);
                                    setActiveTool('SPAWNER'); 
                                }}
                                className={`relative w-10 h-10 rounded-full transition-all duration-300 ${
                                    selectedColor === c.value && activeTool === 'SPAWNER'
                                    ? 'scale-110 ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ 
                                    backgroundColor: c.value,
                                    boxShadow: selectedColor === c.value ? `0 0 10px ${c.value}` : 'none'
                                }}
                            >
                                {selectedColor === c.value && activeTool === 'SPAWNER' && (
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: c.value }}></div>
                                )}
                            </button>
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                <div className="font-bold">{c.label}</div>
                                <div className="text-slate-400 text-[10px]">{c.desc}</div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                         onClick={() => {
                             setSelectedColor(null);
                             setActiveTool('SPAWNER');
                         }}
                         className={`w-10 h-10 rounded-full flex items-center justify-center border border-slate-600 bg-slate-800 text-slate-400 transition-all hover:text-white hover:border-white ${selectedColor === null && activeTool === 'SPAWNER' ? 'border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : ''}`}
                         title="随机"
                    >
                        <RefreshCw size={16} className={selectedColor === null && activeTool === 'SPAWNER' ? "animate-spin-slow" : ""} />
                    </button>
                </div>
            </div>

            <button 
                onClick={onExit}
                className="absolute top-6 right-6 bg-slate-800 hover:bg-red-500/80 text-white px-4 py-2 rounded border border-slate-600 hover:border-red-400 transition-colors flex items-center gap-2 z-10"
            >
                <Home size={16} /> 退出
            </button>
        </div>
    );
};
