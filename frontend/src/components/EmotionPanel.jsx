import styles from './EmotionPanel.module.css'

const EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']
const COLORS = {
  happy: '#10b981', sad: '#6366f1', angry: '#ef4444',
  neutral: '#6b7280', surprised: '#f59e0b', fearful: '#a855f7', disgusted: '#06b6d4',
}

export default function EmotionPanel({ emotions, dominantEmotion }) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>Emotion Breakdown</div>
      {EMOTIONS.map(e => {
        const pct = Math.round((emotions[e] || 0) * 100)
        const isTop = e === dominantEmotion
        return (
          <div className={styles.row} key={e}>
            <span className={`${styles.label} ${isTop ? styles.active : ''}`}>{e}</span>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: pct + '%', background: COLORS[e] }}
              />
            </div>
            <span className={`${styles.pct} ${isTop ? styles.active : ''}`}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
