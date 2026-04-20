import { useState } from 'react'
import { useEmotionDetection } from './hooks/useEmotionDetection'
import WebcamFeed from './components/WebcamFeed'
import EmotionPanel from './components/EmotionPanel'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import styles from './App.module.css'

export default function App() {
  const [mode, setMode] = useState('normal')
  const detector = useEmotionDetection()

  return (
    <div className={styles.app}>
      <Header
        mode={mode}
        setMode={setMode}
        status={detector.status}
        fps={detector.fps}
      />
      <div className={styles.main}>
        <div className={styles.feedPanel}>
          <WebcamFeed detector={detector} mode={mode} />
          <EmotionPanel
            emotions={detector.currentEmotions}
            dominantEmotion={detector.dominantEmotion}
          />
        </div>
        <Sidebar detector={detector} mode={mode} />
      </div>
    </div>
  )
}
