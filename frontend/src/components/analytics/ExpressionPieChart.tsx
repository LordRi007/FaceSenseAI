import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ExpressionDistributionItem, EmotionLabel, EMOTION_EMOJIS } from '../../types';

interface ExpressionPieChartProps {
  data: ExpressionDistributionItem[];
}

const COLORS: Record<EmotionLabel | string, string> = {
  Happy: '#10B981',
  Surprised: '#F59E0B',
  Sad: '#0284C7',
  Angry: '#F43F5E',
  Fearful: '#8B5CF6',
  Disgusted: '#EA580C',
  Neutral: '#64748B',
  Uncertain: '#EAB308',
};

export const ExpressionPieChart: React.FC<ExpressionPieChartProps> = ({ data }) => {
  const chartData = data.filter((d) => d.count > 0);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={4}
            dataKey="count"
            nameKey="label"
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.label}`}
                fill={COLORS[entry.label] || '#94A3B8'}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              borderRadius: '0.75rem',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
            formatter={(value: any, name: any) => [`${value} detections`, `${EMOTION_EMOJIS[name] || ''} ${name}`]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-slate-400">{EMOTION_EMOJIS[value] || ''} {value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

