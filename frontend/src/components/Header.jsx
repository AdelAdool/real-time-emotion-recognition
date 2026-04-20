import styles from './Header.module.css'

export default function Header({ mode, setMode, status, fps }) {
  const isLive = status === 'active'
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>🧠</div>
        <div>
          <div className={styles.logoText}>EmotionAI</div>
          <div className={styles.logoSub}>Real-Time Analyzer v2.0</div>
        </div>
      </div>
      <div className={styles.controls}>
        <span className={`${styles.dot} ${isLive ? styles.live : ''}`} />
        {['normal', 'interview', 'classroom'].map(m => (
          <button
            key={m}
            className={`${styles.modeBtn} ${mode === m ? styles.active : ''}`}
            onClick={() => setMode(m)}
          >
            {m === 'normal' ? 'General' : m === 'interview' ? '🎤 Interview' : '🎓 Classroom'}
          </button>
        ))}
      </div>
    </header>
  )
}
