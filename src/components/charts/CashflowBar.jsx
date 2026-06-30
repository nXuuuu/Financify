import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/format'

export default function CashflowBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid stroke="#262c36" vertical={false} />
        <XAxis dataKey="month" stroke="#8b93a1" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis stroke="#8b93a1" tickLine={false} axisLine={false} fontSize={12} width={48} />
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{ background: '#1c2230', border: '1px solid #262c36', borderRadius: 6 }}
          itemStyle={{ color: '#e8eaed' }}
          cursor={{ fill: '#1c2230' }}
        />
        <Bar dataKey="income" fill="#4ADE80" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expense" fill="#F87171" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
