import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format'
import styles from './SpendingDonut.module.css'

const COLORS = ['#C9A227', '#8A701F', '#4ADE80', '#60A5FA', '#F87171', '#A78BFA', '#34D399']

export default function SpendingDonut({ data }) {
  if (!data.length) {
    return <p className={styles.empty}>No expenses yet this month.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(value)}
          contentStyle={{ background: '#1c2230', border: '1px solid #262c36', borderRadius: 6 }}
          itemStyle={{ color: '#e8eaed' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export { COLORS }
