
import React, { useState } from 'react';
import { NeonDriftGame } from './components/NeonDriftGame';
import { PhysicsDemo } from './components/PhysicsDemo';
import { FlorrGame } from './components/FlorrGame';
import { SpaceBattleGame } from './components/SpaceBattleGame';
import { AirplaneGame } from './components/AirplaneGame';
import { Car, Box, Activity, Flower, Rocket, Crosshair, Anchor, Cloud, Waves } from 'lucide-react';

type AppMode = 'LAUNCHER' | 'CAR_GAME' | 'PHYSICS_ENGINE' | 'FLORR_GAME' | 'SPACE_BATTLE' | 'AIRPLANE_GAME';

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('LAUNCHER');

  if (appMode === 'CAR_GAME') {
      return <NeonDriftGame onExit={() => setAppMode('LAUNCHER')} />;
  }

  if (appMode === 'PHYSICS_ENGINE') {
      return <PhysicsDemo onExit={() => setAppMode('LAUNCHER')} />;
  }

  if (appMode === 'FLORR_GAME') {
      return <FlorrGame onExit={() => setAppMode('LAUNCHER')} />;
  }

  if (appMode === 'SPACE_BATTLE') {
      return <SpaceBattleGame onExit={() => setAppMode('LAUNCHER')} />;
  }

  if (appMode === 'AIRPLANE_GAME') {
      return <AirplaneGame onExit={() => setAppMode('LAUNCHER')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans text-white bg-[url('https://picsum.photos/id/1050/1920/1080?blur=8')] bg-cover bg-blend-multiply">
      <div className="max-w-7xl w-full">
        
        <header className="mb-12 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 italic tracking-tighter mb-4 font-display">
            量子中心
          </h1>
          <p className="text-slate-400 text-lg font-mono uppercase tracking-[0.3em]">
            选择模拟模块
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Car Game */}
            <button 
                onClick={() => setAppMode('CAR_GAME')}
                className="group relative h-80 rounded-3xl overflow-hidden border border-slate-700 hover:border-cyan-500 transition-all duration-500 bg-slate-900/80 backdrop-blur-md flex flex-col text-left"
            >
                <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1056/800/600')] bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="relative z-10 p-6 flex flex-col h-full justify-end">
                    <Car className="w-10 h-10 text-cyan-400 mb-4 transform group-hover:translate-x-2 transition-transform" />
                    <h2 className="text-3xl font-bold text-white mb-2 font-display">霓虹漂移</h2>
                    <p className="text-slate-300 mb-4 text-xs leading-relaxed">
                        包含AI解说和程序生成赛道的高速街机赛车。
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-widest group-hover:text-cyan-300">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                        状态: 在线
                    </div>
                </div>
            </button>

            {/* Card 2: Physics Engine */}
            <button 
                onClick={() => setAppMode('PHYSICS_ENGINE')}
                className="group relative h-80 rounded-3xl overflow-hidden border border-slate-700 hover:border-purple-500 transition-all duration-500 bg-slate-900/80 backdrop-blur-md flex flex-col text-left"
            >
                <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1059/800/600')] bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="relative z-10 p-6 flex flex-col h-full justify-end">
                    <Box className="w-10 h-10 text-purple-400 mb-4 transform group-hover:translate-y-[-5px] transition-transform" />
                    <h2 className="text-3xl font-bold text-white mb-2 font-display">牛顿沙盒</h2>
                    <p className="text-slate-300 mb-4 text-xs leading-relaxed">
                        实验性沙盒环境。重力模拟与碰撞测试。
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 uppercase tracking-widest group-hover:text-purple-300">
                        <Activity size={12} />
                        状态: 实验性
                    </div>
                </div>
            </button>

            {/* Card 3: Florr.io */}
            <button 
                onClick={() => setAppMode('FLORR_GAME')}
                className="group relative h-80 rounded-3xl overflow-hidden border border-slate-700 hover:border-green-500 transition-all duration-500 bg-slate-900/80 backdrop-blur-md flex flex-col text-left"
            >
                <div className="absolute inset-0 bg-[url('https://picsum.photos/id/106/800/600')] bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="relative z-10 p-6 flex flex-col h-full justify-end">
                    <Flower className="w-10 h-10 text-green-400 mb-4 transform group-hover:rotate-45 transition-transform duration-500" />
                    <h2 className="text-3xl font-bold text-white mb-2 font-display">花朵大乱斗</h2>
                    <p className="text-slate-300 mb-4 text-xs leading-relaxed">
                        进入花朵竞技场。包含AI辅助的游戏玩法提示和分析。
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-green-400 uppercase tracking-widest group-hover:text-green-300">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        状态: 已连接
                    </div>
                </div>
            </button>

            {/* Card 4: Space Battle */}
            <button 
                onClick={() => setAppMode('SPACE_BATTLE')}
                className="group relative h-80 rounded-3xl overflow-hidden border border-slate-700 hover:border-red-500 transition-all duration-500 bg-slate-900/80 backdrop-blur-md flex flex-col text-left"
            >
                <div className="absolute inset-0 bg-[url('https://picsum.photos/id/537/800/600')] bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="relative z-10 p-6 flex flex-col h-full justify-end">
                    <Rocket className="w-10 h-10 text-red-400 mb-4 transform group-hover:-translate-y-2 transition-transform duration-500" />
                    <h2 className="text-3xl font-bold text-white mb-2 font-display">太空激战</h2>
                    <p className="text-slate-300 mb-4 text-xs leading-relaxed">
                        简单的反应测试。点击目标方块获取积分。
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-red-400 uppercase tracking-widest group-hover:text-red-300">
                        <Crosshair size={12} />
                        状态: 激活
                    </div>
                </div>
            </button>

             {/* Card 5: Submarine Game (Formerly Airplane) */}
             <button 
                onClick={() => setAppMode('AIRPLANE_GAME')}
                className="group relative h-80 rounded-3xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all duration-500 bg-slate-900/80 backdrop-blur-md flex flex-col text-left"
            >
                <div className="absolute inset-0 bg-[url('https://picsum.photos/id/324/800/600')] bg-cover bg-center opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="relative z-10 p-6 flex flex-col h-full justify-end">
                    <Anchor className="w-10 h-10 text-blue-400 mb-4 transform group-hover:-rotate-12 transition-transform duration-500" />
                    <h2 className="text-3xl font-bold text-white mb-2 font-display">深海潜航</h2>
                    <p className="text-slate-300 mb-4 text-xs leading-relaxed">
                        3D潜水艇模拟。探索深海，收集数据，躲避鱼雷。
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-blue-400 uppercase tracking-widest group-hover:text-blue-300">
                        <Waves size={12} />
                        状态: 压力正常
                    </div>
                </div>
            </button>

        </div>

        <footer className="mt-12 text-center text-slate-600 text-sm font-mono">
            系统版本 V2.8.0 // 就绪
        </footer>
      </div>
    </div>
  );
};

export default App;
