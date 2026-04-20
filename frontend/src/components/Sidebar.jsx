import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import styles from './Sidebar.module.css'

const EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']
const EMOJI = { happy: '😄', sad: '😢', angry: '😠', neutral: '😐', surprised: '😲', fearful: '😨', disgusted: '🤢' }
const COLORS = {
  happy: '#10b981', sad: '#6366f1', angry: '#ef4444',
  neutral: '#6b7280', surprised: '#f59e0b', fearful: '#a855f7', disgusted: '#06b6d4',
}

function Gauge({ value }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = 220, h = 120
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h - 10, r = 85
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI)
    ctx.strokeStyle = '#1a1d26'
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.stroke()
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy)
    grad.addColorStop(0, '#ef4444')
    grad.addColorStop(0.5, '#f59e0b')
    grad.addColorStop(1, '#10b981')
    const fillEnd = Math.PI + value * Math.PI
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, fillEnd)
    ctx.strokeStyle = grad
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.stroke()
    const angle = Math.PI + value * Math.PI
    ctx.beginPath()
    ctx.arc(cx + Math.cos(angle) * (r - 2), cy + Math.sin(angle) * (r - 2), 7, 0, 2 * Math.PI)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.fillStyle = '#e8eaf0'
    ctx.font = '500 22px Syne, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(Math.round(value * 100) + '%', cx, cy - 22)
    ctx.fillStyle = '#6b7280'
    ctx.font = '400 10px monospace'
    ctx.fillText('0%', cx - r + 8, cy + 16)
    ctx.fillText('100%', cx + r - 14, cy + 16)
  }, [value])
  return <canvas ref={canvasRef} width={220} height={120} style={{ width: '100%', maxWidth: 220 }} />
}

function ModeInsights({ mode, emotions }) {
  const h = emotions.happy || 0, s = emotions.sad || 0
  const a = emotions.angry || 0, n = emotions.neutral || 0
  const sp = emotions.surprised || 0, f = emotions.fearful || 0

  let items = []
  if (mode === 'interview') {
    const conf = Math.max(0, Math.min(100, Math.round((h * 0.8 + n * 0.5 - f * 0.6 - a * 0.4) * 100 + 50)))
    const stress = Math.max(0, Math.min(100, Math.round((f * 0.7 + a * 0.5 + s * 0.3) * 100)))
    items = [
      { icon: '💪', label: 'Confidence', value: conf + '%', pct: conf, color: conf > 60 ? '#10b981' : conf > 30 ? '#f59e0b' : '#ef4444' },
      { icon: '🌡️', label: 'Stress Level', value: stress + '%', pct: stress, color: stress > 60 ? '#ef4444' : stress > 30 ? '#f59e0b' : '#10b981' },
      { icon: '🗣️', label: 'Composure', value: Math.round(n * 100) + '% neutral', pct: Math.round(n * 100), color: '#818cf8' },
    ]
  } else if (mode === 'classroom') {
    const att = Math.max(0, Math.min(100, Math.round((n * 0.6 + sp * 0.8 + h * 0.5 - s * 0.4 - a * 0.5) * 100 + 50)))
    const bor = Math.max(0, Math.min(100, Math.round((s * 0.6 + n * 0.3) * 100)))
    items = [
      { icon: '👁️', label: 'Attention', value: att + '%', pct: att, color: att > 60 ? '#10b981' : att > 30 ? '#f59e0b' : '#ef4444' },
      { icon: '😴', label: 'Boredom', value: bor + '%', pct: bor, color: bor > 60 ? '#ef4444' : bor > 30 ? '#f59e0b' : '#10b981' },
      { icon: '😊', label: 'Positivity', value: Math.round(h * 100) + '%', pct: Math.round(h * 100), color: '#10b981' },
    ]
  } else {
    const pos = Math.round((h + sp * 0.5) * 100)
    const aro = Math.min(100, Math.round((h + a + sp + f) * 100 * 0.5))
    items = [
      { icon: '🧘', label: 'Positive Valence', value: pos + '%', pct: pos, color: '#10b981' },
      { icon: '⚡', label: 'Arousal Level', value: aro + '%', pct: aro, color: '#f59e0b' },
      { icon: '😶', label: 'Neutrality', value: Math.round(n * 100) + '%', pct: Math.round(n * 100), color: '#6b7280' },
    ]
  }

  const modeLabels = { normal: 'General Mode', interview: '🎤 Interview Mode', classroom: '🎓 Classroom Mode' }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{modeLabels[mode]}</div>
      <div className={styles.insightsList}>
        {items.map((item, i) => (
          <div key={i} className={styles.insightRow}>
            <span className={styles.insightIcon}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div className={styles.insightLabel}>{item.label}</div>
              <div className={styles.insightVal} style={{ color: item.color }}>{item.value}</div>
              <div className={styles.insightBar}>
                <div className={styles.insightFill} style={{ width: item.pct + '%', background: item.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Sidebar({ detector, mode }) {
  const [tab, setTab] = useState('timeline')
  const {
    dominantEmotion, confidence, currentEmotions,
    timelineData, sessionCounts, frameCount,
    dominantOverall, stabilityScore, engagementScore,
    exportCSV,
  } = detector

  // Format timeline for recharts
  const chartData = timelineData.slice(-120).map((d, i) => ({
    i, ...Object.fromEntries(EMOTIONS.map(e => [e, Math.round((d.emotions[e] || 0) * 100)]))
  }))

  // Pie data from session counts
  const total = Object.values(sessionCounts).reduce((a, b) => a + b, 0) || 1
  const pieData = EMOTIONS.map(e => ({
    name: e,
    value: Math.round((sessionCounts[e] / total) * 100),
  })).filter(d => d.value > 0)

  return (
    <div className={styles.sidebar}>
      {/* Current emotion */}
      <div className={styles.section}>
        <div className={styles.bigEmotion}>
          <span className={styles.bigIcon}>{EMOJI[dominantEmotion] || '😐'}</span>
          <div className={styles.bigName} style={{ color: COLORS[dominantEmotion] || 'var(--muted)' }}>
            {dominantEmotion ? dominantEmotion.toUpperCase() : '—'}
          </div>
          <div className={styles.bigConf}>confidence: {confidence ? Math.round(confidence * 100) + '%' : '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div className={styles.sectionTitle} style={{ textAlign: 'center' }}>Confidence Meter</div>
          <Gauge value={confidence || 0} />
        </div>
      </div>

      {/* Analytics */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Session Analytics</div>
        <div className={styles.metricGrid}>
          {[
            { name: 'Dominant', value: dominantOverall || '—', color: 'var(--accent2)', sub: 'most seen' },
            { name: 'Frames', value: frameCount, color: 'var(--cyan)', sub: 'analyzed' },
            { name: 'Stability', value: frameCount > 0 ? stabilityScore + '%' : '—', color: 'var(--green)', sub: 'emotion shift' },
            { name: 'Engagement', value: frameCount > 0 ? engagementScore + '%' : '—', color: 'var(--amber)', sub: 'score' },
          ].map(m => (
            <div key={m.name} className={styles.metricCard}>
              <div className={styles.metricName}>{m.name}</div>
              <div className={styles.metricValue} style={{ color: m.color, fontSize: m.name === 'Dominant' ? 14 : 20 }}>{m.value}</div>
              <div className={styles.metricSub}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className={styles.section}>
        <div className={styles.tabRow}>
          <button className={`${styles.tabBtn} ${tab === 'timeline' ? styles.tabActive : ''}`} onClick={() => setTab('timeline')}>Timeline</button>
          <button className={`${styles.tabBtn} ${tab === 'dist' ? styles.tabActive : ''}`} onClick={() => setTab('dist')}>Distribution</button>
        </div>

        {tab === 'timeline' && (
          <>
            <div className={styles.sectionTitle}>Emotion Over Time (60s)</div>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={chartData}>
                <YAxis domain={[0, 100]} hide />
                <XAxis dataKey="i" hide />
                <Tooltip
                  contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontFamily: 'monospace' }}
                  labelStyle={{ display: 'none' }}
                />
                {EMOTIONS.map(e => (
                  <Line key={e} type="monotone" dataKey={e} stroke={COLORS[e]} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {tab === 'dist' && (
          <>
            <div className={styles.sectionTitle}>Distribution</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [v + '%', name]}
                  contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {EMOTIONS.map(e => (
                <span key={e} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[e], display: 'inline-block' }} />
                  {e}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <ModeInsights mode={mode} emotions={currentEmotions} />

      <div className={styles.section}>
        <button className={styles.exportBtn} onClick={exportCSV}>↓ Export Session CSV</button>
      </div>

      <div className={styles.privacyNote}>
        🔒 No data is stored or transmitted.<br />
        All processing happens locally in your browser.
      </div>
    </div>
  )
}
