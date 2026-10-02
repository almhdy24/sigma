import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';


export default function ScatterPlotChart({ points, xName, yName }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name={xName}
          label={{ value: xName, position: 'insideBottom', offset: -30, fontSize: 13 }}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yName}
          label={{ value: yName, angle: -90, position: 'insideLeft', fontSize: 13 }}
          tick={{ fontSize: 11 }}
        />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={points} fill="#1f5fa6" opacity={0.7} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
