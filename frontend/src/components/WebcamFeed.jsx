import styles from './WebcamFeed.module.css'

const MODE_LABELS = { normal: 'GENERAL', interview: 'INTERVIEW', classroom: 'CLASSROOM' }

export default function WebcamFeed({ detector, mode }) {
  const {
    videoRef, canvasRef, status, loadingMsg, faceDetected,
    fps, startCamera, stopCamera, captureScreenshot,
  } = detector

  return (
    <div className={styles.container}>
      {status === 'idle' && (
        <div className={styles.placeholder}>
          <div className={styles.camIcon}>📷</div>
          <h3>Webcam Feed</h3>
          <p>Click Start to enable your camera and begin real-time emotion analysis</p>
          <button className={styles.startBtn} onClick={startCamera}>
            ▶ Start Analysis
          </button>
        </div>
      )}

      {(status === 'loading') && (
        <div className={styles.placeholder}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>{loadingMsg}</p>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.placeholder}>
          <div className={styles.camIcon} style={{ opacity: 0.5 }}>⚠️</div>
          <p style={{ color: 'var(--amber)' }}>Camera unavailable</p>
          <p className={styles.hint}>{loadingMsg}</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay muted playsInline
        className={styles.video}
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        className={styles.overlay}
        style={{ display: status === 'active' ? 'block' : 'none' }}
      />

      {status === 'active' && (
        <>
          <div className={styles.topInfo}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} /> LIVE
            </span>
            <span className={styles.fpsBadge}>{fps} fps</span>
            <span className={styles.modeBadge}>{MODE_LABELS[mode]}</span>
          </div>

          {!faceDetected && (
            <div className={styles.noFaceBadge}>No face detected</div>
          )}

          <div className={styles.bottomControls}>
            <button className={styles.captureBtn} onClick={captureScreenshot}>📸 Capture</button>
            <button className={styles.stopBtn} onClick={stopCamera}>⏹ Stop</button>
          </div>
        </>
      )}
    </div>
  )
}
