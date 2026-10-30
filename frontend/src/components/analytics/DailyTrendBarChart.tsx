import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DailyTrendItem } from '../../types';

interface DailyTrendBarChartProps {
  data: DailyTrendItem[];
}

export const DailyTrendBarChart: React.FC<DailyTrendBarChartProps> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
          <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              borderRadius: '0.75rem',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-slate-400 capitalize">{value}</span>}
          />
          <Bar dataKey="happy" name="😊 Happy" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="neutral" name="😐 Neutral" fill="#64748B" stackId="a" />
          <Bar dataKey="surprised" name="😲 Surprised" fill="#F59E0B" stackId="a" />
          <Bar dataKey="sad" name="😢 Sad" fill="#0284C7" stackId="a" />
          <Bar dataKey="angry" name="😡 Angry" fill="#F43F5E" stackId="a" />
          <Bar dataKey="fearful" name="😱 Fearful" fill="#8B5CF6" stackId="a" />
          <Bar dataKey="disgusted" name="🤢 Disgusted" fill="#EA580C" stackId="a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

