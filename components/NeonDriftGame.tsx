
import React, { useState, useEffect, useCallback } from 'react';
import { Game3D } from './Game3D';
import { Speedometer } from './Speedometer';
import { TelemetryChart } from './TelemetryChart';
import { GameState, RaceStats, ThemeType } from '../types';
import { getRaceCommentary, getTrackDescription, findRaceLocation, MapSearchResult } from '../services/geminiService';
import { Activity, Trophy, Globe, MapPin, Home, Infinity as InfinityIcon, Timer, AlertTriangle, RefreshCw, Route, Swords, Flag, Sun, Moon, Compass } from 'lucide-react';

const PRESET_LOCATIONS: { name: string; value: string; theme: ThemeType }[] = [
  { name: "霓虹城核心区", value: "Neon City Cyberpunk", theme: 'NEON' },
  { name: "蒙扎赛道 (竞速)", value: "Monza Circuit", theme: 'CIRCUIT' },
  { name: "撒哈拉沙漠 (沙地)", value: "Sahara Desert", theme: 'DESERT' },
  { name: "北极冰原 (雪地)", value: "Arctic Circle", theme: 'SNOW' },
  { name: "黑森林 (林地)", value: "Black Forest Germany", theme: 'FOREST' },
];

interface NeonDriftGameProps {
    onExit: () => void;
}

type GameMode = 'TIME_TRIAL' | 'ENDURANCE' | 'RACE' | 'SANDBOX';

export const NeonDriftGame: React.FC<NeonDriftGameProps> = ({ onExit }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [maxSessionDistance, setMaxSessionDistance] = useState(0);
  const [currentRank, setCurrentRank] = useState<number>(0);
  
  const [raceStats, setRaceStats] = useState<RaceStats>({
    time: 0,
    maxSpeed: 0,
    collisions: 0,
    distance: 0,
    speedHistory: []
  });
  const [commentary, setCommentary] = useState<string>("");
  const [trackName, setTrackName] = useState<string>("加载区域中...");
  const [isGeneratingCommentary, setIsGeneratingCommentary] = useState(false);

  // Map Search State
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResult, setLocationResult] = useState<MapSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('NEON');
  
  // Game Mode State
  const [gameMode, setGameMode] = useState<GameMode>('TIME_TRIAL');
  const [isFinishing, setIsFinishing] = useState(false);

  // Environment State
  const [timeOfDay, setTimeOfDay] = useState<'DAY' | 'NIGHT'>('NIGHT');

  // Initialize Track Name
  useEffect(() => {
    getTrackDescription().then(setTrackName);
  }, []);

  const startGame = () => {
    setRaceStats({ time: 0, maxSpeed: 0, collisions: 0, distance: 0, speedHistory: [] });
    setCommentary("");
    setCurrentSpeed(0);
    setCurrentDistance(0);
    setCurrentRank(0);
    setGameState(GameState.RACING);
    setIsFinishing(false);
  };

  const handleFinish = async (results: Omit<RaceStats, 'speedHistory'>) => {
    setIsFinishing(false);
    setGameState(GameState.FINISHED);
    const finalStats = { ...raceStats, ...results };
    setRaceStats(finalStats);
    
    // Only generate commentary for competitive modes
    if (gameMode !== 'SANDBOX') {
        setIsGeneratingCommentary(true);
        const comment = await getRaceCommentary(finalStats);
        setCommentary(comment);
        setIsGeneratingCommentary(false);
    }
  };

  const handleTelemetry = useCallback((speed: number, time: number) => {
    setRaceStats(prev => ({
      ...prev,
      speedHistory: [...prev.speedHistory, { speed, time }]
    }));
  }, []);

  const handleDistanceUpdate = (dist: number) => {
      setCurrentDistance(dist);
      if (dist > maxSessionDistance) setMaxSessionDistance(dist);
  }

  // Updated Logic: Handle selection change with instant theme update
  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setLocationSearch(newValue);
    
    const preset = PRESET_LOCATIONS.find(p => p.value === newValue);
    if (preset) {
        setCurrentTheme(preset.theme);
        handleSearchLocation(newValue, preset.theme);
    }
  };

  const handleSearchLocation = async (query: string, forcedTheme?: ThemeType) => {
    if(!query) return;
    setIsSearching(true);
    const result = await findRaceLocation(query);
    
    setLocationResult(result);
    if (result.locationName) setTrackName(result.locationName);
    
    if (!forcedTheme && result.theme) {
        setCurrentTheme(result.theme);
    }
    setIsSearching(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 text-white overflow-hidden">
      
      {/* --- 3D Layer --- */}
      <div className="absolute inset-0 z-0">
        {gameState !== GameState.MENU && (
          <Game3D 
            gameState={gameState}
            theme={currentTheme}
            gameMode={gameMode}
            timeOfDay={timeOfDay}
            forceFinish={isFinishing}
            onSpeedUpdate={setCurrentSpeed}
            onDistanceUpdate={handleDistanceUpdate}
            onFinish={handleFinish}
            onRecordTelemetry={handleTelemetry}
            onRaceUpdate={setCurrentRank}
          />
        )}
        {gameState === GameState.MENU && (
             <div className={`w-full h-full bg-cover bg-center transition-all duration-1000 ${
                 timeOfDay === 'DAY' ? 'opacity-100 brightness-110' : 'opacity-50 brightness-75'
             } ${
                 currentTheme === 'DESERT' ? "bg-[url('https://picsum.photos/id/1044/1920/1080?blur=4')]" :
                 currentTheme === 'SNOW' ? "bg-[url('https://picsum.photos/id/1036/1920/1080?blur=4')]" :
                 currentTheme === 'FOREST' ? "bg-[url('https://picsum.photos/id/1039/1920/1080?blur=4')]" :
                 currentTheme === 'CIRCUIT' ? "bg-[url('https://picsum.photos/id/835/1920/1080?blur=4')]" :
                 "bg-[url('https://picsum.photos/1920/1080?blur=4')]" // Default Neon
             }`}></div>
        )}
      </div>

      {/* --- UI Layer --- */}
      
      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 italic tracking-tighter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            霓虹漂移
          </h1>
          <p className="text-slate-400 font-mono text-xs mt-1 tracking-widest flex gap-2">
            {trackName.toUpperCase()} 
            <span className={`px-1 rounded text-[10px] border ${
                currentTheme === 'DESERT' ? 'border-orange-500 text-orange-500' :
                currentTheme === 'SNOW' ? 'border-white text-white' :
                currentTheme === 'CIRCUIT' ? 'border-green-500 text-green-500' :
                currentTheme === 'FOREST' ? 'border-green-400 text-green-400' :
                'border-cyan-500 text-cyan-500'
            }`}>
                {currentTheme} 等级
            </span>
            {gameMode === 'ENDURANCE' && <span className="px-1 rounded text-[10px] border border-purple-500 text-purple-500">耐力赛</span>}
            {gameMode === 'RACE' && <span className="px-1 rounded text-[10px] border border-red-500 text-red-500">对抗赛</span>}
            {gameMode === 'SANDBOX' && <span className="px-1 rounded text-[10px] border border-green-500 text-green-500">自由沙盒</span>}
            <span className="px-1 rounded text-[10px] border border-slate-500 text-slate-400">{timeOfDay === 'DAY' ? '白昼' : '夜晚'}</span>
          </p>
        </div>
        {gameState === GameState.RACING && (
           <div className="flex flex-col items-end gap-2">
              {gameMode === 'RACE' && (
                  <div className={`bg-slate-900/80 backdrop-blur px-4 py-2 rounded border font-mono flex items-center gap-2 ${currentRank === 1 ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}>
                      <Swords size={14} />
                      <span className="text-white font-bold">{currentRank === 1 ? '第1名' : '第2名'} / 2</span>
                  </div>
              )}
              {gameMode !== 'SANDBOX' && (
                  <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded border border-cyan-500/30 text-cyan-400 font-mono flex items-center gap-2">
                     <Timer size={14} />
                     <span className="text-white">{raceStats.speedHistory.length > 0 ? raceStats.speedHistory[raceStats.speedHistory.length - 1].time.toFixed(1) : "0.0"}s</span>
                  </div>
              )}
              <div className="flex gap-2">
                  {/* In Sandbox, we still show distance but remove the target/finish context implicitly */}
                  <div className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded border border-purple-500/30 text-purple-400 font-mono flex items-center gap-2">
                     <Route size={14} />
                     <span className="text-white">{Math.floor(currentDistance)} m</span>
                  </div>
              </div>
           </div>
        )}
        
        {/* Manual Exit Buttons based on mode */}
        {(gameMode === 'ENDURANCE' || gameMode === 'SANDBOX') && gameState === GameState.RACING && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
                 <button 
                    onClick={() => setIsFinishing(true)} 
                    className="pointer-events-auto bg-red-500/80 hover:bg-red-500 text-white text-xs px-3 py-1 rounded uppercase tracking-wider font-bold"
                 >
                    {gameMode === 'SANDBOX' ? '退出沙盒' : '结束比赛'}
                 </button>
            </div>
        )}
        
        {/* EXIT BUTTON */}
        <button 
            onClick={onExit}
            className="pointer-events-auto bg-slate-800/80 hover:bg-red-500/80 text-white px-3 py-2 rounded border border-slate-600 hover:border-red-400 transition-colors"
        >
            返回主页
        </button>
      </div>

      {/* MENU SCREEN */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900/90 p-8 rounded-2xl border border-slate-700 shadow-2xl shadow-cyan-500/20 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-2">准备好比赛了吗？</h2>
            <p className="text-slate-400 mb-6">
              穿越障碍，冲向终点，接受AI的犀利点评。
            </p>
            
            {/* Day/Night Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
                 <button 
                     onClick={() => setTimeOfDay('DAY')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${timeOfDay === 'DAY' ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                 >
                     <Sun size={16} /> 白天
                 </button>
                 <button 
                     onClick={() => setTimeOfDay('NIGHT')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${timeOfDay === 'NIGHT' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                 >
                     <Moon size={16} /> 夜晚
                 </button>
            </div>

            {/* Mode Selection */}
            <div className="flex items-center justify-center gap-2 mb-6 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700 mx-auto w-full">
                <button
                    onClick={() => setGameMode('TIME_TRIAL')}
                    className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-bold transition-all ${
                        gameMode === 'TIME_TRIAL'
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Timer size={14} className="mb-1" />
                    竞速
                </button>
                <button
                    onClick={() => setGameMode('RACE')}
                    className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-bold transition-all ${
                        gameMode === 'RACE'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Swords size={14} className="mb-1" />
                    对抗
                </button>
                <button
                    onClick={() => setGameMode('ENDURANCE')}
                    className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-bold transition-all ${
                        gameMode === 'ENDURANCE' 
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <InfinityIcon size={14} className="mb-1" />
                    耐力
                </button>
                <button
                    onClick={() => setGameMode('SANDBOX')}
                    className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-bold transition-all ${
                        gameMode === 'SANDBOX' 
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Compass size={14} className="mb-1" />
                    沙盒
                </button>
            </div>

            {/* Wireless Map Feature */}
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 w-full">
                <h3 className="text-cyan-400 font-display text-sm mb-3 flex items-center justify-center gap-2">
                    <Globe size={16} /> 全球赛道搜索
                </h3>
                <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                        <select 
                            value={locationSearch}
                            onChange={handleLocationChange}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none text-white appearance-none cursor-pointer"
                        >
                            <option value="" disabled>选择赛道位置...</option>
                            {PRESET_LOCATIONS.map((loc) => (
                                <option key={loc.value} value={loc.value}>{loc.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>
                </div>
                
                {/* Status Area */}
                <div className="min-h-[60px] flex items-center justify-center">
                    {isSearching ? (
                         <div className="flex items-center gap-2 text-xs text-cyan-500 animate-pulse">
                             <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                             正在获取卫星数据...
                         </div>
                    ) : locationResult ? (
                        <div className="text-left bg-black/40 p-3 rounded border border-slate-700/50 w-full animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-300 text-xs italic mb-2 flex-1">"{locationResult.description}"</p>
                            </div>
                            {locationResult.mapLink && (
                                <a 
                                    href={locationResult.mapLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                                >
                                    <MapPin size={12} />
                                    查看无线地图数据
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-600 italic">
                            在上方选择一个位置以初始化环境。
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex justify-center gap-4 mb-8 text-sm text-slate-500 font-mono">
               <span className="bg-slate-800 px-3 py-1 rounded">WASD 驾驶</span>
               <span className="bg-slate-800 px-3 py-1 rounded">空格 刹车</span>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/50"
            >
              启动引擎
            </button>
            
            {!process.env.API_KEY && (
                <div className="mt-4 flex items-center justify-center gap-2 text-amber-500 text-xs">
                    <AlertTriangle size={14} />
                    <span>Gemini API Key 缺失 - AI功能已禁用</span>
                </div>
            )}
          </div>
        </div>
      )}

      {/* HUD (Racing) */}
      {gameState === GameState.RACING && (
        <Speedometer speed={currentSpeed} maxSpeed={60} />
      )}

      {/* FINISHED SCREEN */}
      {gameState === GameState.FINISHED && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Stats */}
            <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                    {gameMode === 'RACE' ? (
                        raceStats.rank === 1 
                        ? <span className="text-green-400">比赛胜利</span> 
                        : <span className="text-red-500">遗憾落败</span>
                    ) : gameMode === 'SANDBOX' ? '沙盒探索结束' : '赛段结束'}
                </h2>
                <p className="text-slate-400 text-sm mb-6">遥测分析中...</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   {gameMode !== 'SANDBOX' && (
                       <div className="bg-slate-800/50 p-4 rounded-lg">
                          <div className="text-slate-500 text-xs uppercase mb-1">总用时</div>
                          <div className="text-2xl font-mono text-white">{raceStats.time.toFixed(2)}s</div>
                       </div>
                   )}
                   <div className="bg-slate-800/50 p-4 rounded-lg">
                      <div className="text-slate-500 text-xs uppercase mb-1">距离</div>
                      <div className="text-2xl font-mono text-purple-400">{Math.floor(raceStats.distance)}m</div>
                   </div>
                   <div className="bg-slate-800/50 p-4 rounded-lg">
                      <div className="text-slate-500 text-xs uppercase mb-1">最高时速</div>
                      <div className="text-2xl font-mono text-cyan-400">{Math.floor(raceStats.maxSpeed)} km/h</div>
                   </div>
                   <div className="bg-slate-800/50 p-4 rounded-lg">
                      <div className="text-slate-500 text-xs uppercase mb-1">碰撞次数</div>
                      <div className="text-2xl font-mono text-red-400">{raceStats.collisions}</div>
                   </div>
                </div>
              </div>

              {/* AI Commentary (Skipped for Sandbox) */}
              {gameMode !== 'SANDBOX' && (
                  <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-4 rounded-lg border border-indigo-500/30">
                      <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                          <Activity size={14} />
                          AI 赛车工程师
                      </div>
                      <div className="text-indigo-100 italic min-h-[3rem]">
                          {isGeneratingCommentary ? (
                              <span className="animate-pulse">正在分析驾驶模式...</span>
                          ) : (
                              `"${commentary}"`
                          )}
                      </div>
                  </div>
              )}
            </div>

            {/* Right: Charts & Actions */}
            <div className="flex flex-col gap-6">
                <TelemetryChart data={raceStats.speedHistory} />
                
                <div className="flex-1 bg-slate-900/90 p-6 rounded-2xl border border-slate-700 flex items-center justify-center gap-4">
                    <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="flex items-center gap-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-white font-bold py-3 px-6 rounded-lg transition-all border border-cyan-500/50"
                    >
                        <RefreshCw size={18} />
                        重试
                    </button>
                    <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="flex items-center gap-3 bg-white text-slate-900 hover:bg-cyan-50 font-bold py-4 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
                    >
                        <Home size={20} />
                        主菜单
                    </button>
                </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
