import { GoogleGenAI } from "@google/genai";
import { RaceStats, ThemeType } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface MapSearchResult {
  description: string;
  locationName?: string;
  mapLink?: string;
  theme?: ThemeType;
}

export interface GameInfoResult {
  description: string;
  tips: string[];
  sources?: { title: string; uri: string }[];
}

// Helper for local fallback when API is down/quota exceeded
const getLocalFallbackLocation = (query: string): MapSearchResult => {
    const q = query.toLowerCase();
    let theme: ThemeType = 'NEON';
    
    if (q.includes('desert') || q.includes('sand') || q.includes('dune') || q.includes('sahara')) theme = 'DESERT';
    else if (q.includes('snow') || q.includes('ice') || q.includes('arctic') || q.includes('tundra')) theme = 'SNOW';
    else if (q.includes('forest') || q.includes('wood') || q.includes('jungle') || q.includes('tree')) theme = 'FOREST';
    else if (q.includes('circuit') || q.includes('track') || q.includes('monza') || q.includes('speedway')) theme = 'CIRCUIT';

    return {
        description: "离线模式：卫星连接失败。已加载该区域的模拟数据。",
        locationName: query.charAt(0).toUpperCase() + query.slice(1) + " (模拟)",
        theme,
        mapLink: "https://www.google.com/maps"
    };
};

export const getGameInfo = async (gameName: string): Promise<GameInfoResult> => {
  if (!process.env.API_KEY) {
      return { 
          description: `${gameName} 是一款考验技巧和反应的游戏。（离线模式）`, 
          tips: ["躲避敌人。", "收集战利品。", "保持存活。"] 
      };
  }

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Search for the game "${gameName}". 
      1. Provide a short, exciting 2-sentence description of the game in Chinese (Simplified).
      2. Provide 3 specific pro-tips for beginners in a bulleted list in Chinese (Simplified).
      Format the output as plain text.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    const description = lines.find(l => !l.startsWith('-') && !l.startsWith('*') && l.length > 30) || `${gameName} 是一款多人竞技游戏。`;
    const tips = lines.filter(l => l.startsWith('-') || l.startsWith('*')).map(l => l.replace(/^[-*]\s*/, ''));

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
      .filter((s: any) => s);

    return { description, tips: tips.slice(0, 4), sources };
  } catch (error) {
    console.warn("Gemini API Error (GameInfo):", error);
    // Fallback for game info
    return { 
        description: "战术数据库离线。请小心行事。", 
        tips: ["保持移动。", "注意生命值。", "尽可能升级。"] 
    };
  }
};

export const findRaceLocation = async (query: string): Promise<MapSearchResult> => {
  // Immediate local check for preset values to save API calls
  if (query.includes("Neon City")) return { description: "默认的赛博模拟区域。", locationName: "霓虹城核心区", theme: 'NEON' };
  
  if (!process.env.API_KEY) {
    return getLocalFallbackLocation(query);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Find a real world location for a race based on: "${query}". 
        Give a short 1 sentence description in Chinese (Simplified).
        At the very end, classify the visual vibe into exactly one of these words: NEON, DESERT, SNOW, FOREST, CIRCUIT.
        Format: "Description here. THEME: [THEME_WORD]"
      `,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mapChunk = chunks.find((c: any) => c.maps?.uri);
    
    const fullText = response.text || "";
    
    let theme: ThemeType = 'NEON';
    const themeMatch = fullText.match(/(?:THEME|VIBE):\s*(NEON|DESERT|SNOW|FOREST|CIRCUIT)/i);
    
    if (themeMatch && themeMatch[1]) {
        const found = themeMatch[1].toUpperCase();
        if (['NEON', 'DESERT', 'SNOW', 'FOREST', 'CIRCUIT'].includes(found)) {
            theme = found as ThemeType;
        }
    } else {
        // Fallback theme extraction if AI format failed but call succeeded
        const q = query.toLowerCase();
        if (q.includes('desert')) theme = 'DESERT';
        if (q.includes('snow')) theme = 'SNOW';
        if (q.includes('forest')) theme = 'FOREST';
        if (q.includes('circuit')) theme = 'CIRCUIT';
    }

    const description = fullText.replace(/(?:THEME|VIBE):.*/i, "").trim() || "已找到位置数据。";

    return {
      description,
      locationName: mapChunk?.maps?.title,
      mapLink: mapChunk?.maps?.uri,
      theme
    };
  } catch (error) {
    console.warn("Gemini API Error (MapSearch): Using local fallback.", error);
    return getLocalFallbackLocation(query);
  }
};

export const getRaceCommentary = async (stats: RaceStats): Promise<string> => {
  if (!process.env.API_KEY) {
    const praises = ["车技惊人！", "绝对的速度恶魔！", "精准的工程杰作！"];
    const roasts = ["你是不是忘松手刹了？", "我奶奶开得都比你快。", "这碰撞次数...是在玩碰碰车吗？"];
    if (stats.collisions > 5 || stats.maxSpeed < 30) return roasts[Math.floor(Math.random() * roasts.length)];
    return praises[Math.floor(Math.random() * praises.length)];
  }

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      你是一个充满活力的赛博朋克风格赛车解说员。请用中文（简体）回答。
      一位赛车手刚刚完成了比赛，数据如下：
      - 时间: ${stats.time.toFixed(2)} 秒
      - 最高速度: ${Math.floor(stats.maxSpeed)} km/h
      - 碰撞次数: ${stats.collisions}
      - 距离: ${Math.floor(stats.distance)}m
      
      请给出 1-2 句犀利、幽默或赞赏的评论。
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "信号中断...";
  } catch (error) {
    console.warn("Gemini API Error (Commentary):", error);
    return "连接不稳定。比赛数据已本地记录。";
  }
};

export const getTrackDescription = async (): Promise<string> => {
    if (!process.env.API_KEY) return "第7G区 (离线)";
    
    try {
        const model = "gemini-2.5-flash";
        const prompt = "Generate a short, 10-word cool name for a neon cyberpunk race track sector in Chinese (Simplified). Just the name.";
        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });
        return response.text.trim();
    } catch (e) {
        return "第7G区";
    }
}