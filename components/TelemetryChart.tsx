import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TelemetryChartProps {
  data: { time: number; speed: number }[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ data }) => {
  // Downsample if too much data
  const chartData = data.filter((_, i) => i % 5 === 0).map(d => ({
    ...d,
    time: parseFloat(d.time.toFixed(1)),
    speed: Math.floor(d.speed)
  }));

  return (
    <div className="w-full h-64 bg-slate-900/50 rounded-lg p-4 border border-slate-700 backdrop-blur-sm">
      <h3 className="text-cyan-400 font-display mb-2 text-sm uppercase tracking-wider">速度遥测数据</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            label={{ value: '时间 (秒)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} 
          />
          <YAxis 
            stroke="#94a3b8" 
            label={{ value: '速度', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#22d3ee' }}
            formatter={(value: number) => [`${value} km/h`, '速度']}
            labelFormatter={(label: number) => `${label} 秒`}
          />
          <Line 
            type="monotone" 
            dataKey="speed" 
            stroke="#22d3ee" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 6, fill: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};