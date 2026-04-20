/**
 * Shared emotion constants, colors, and utility functions
 */

export const EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']

export const EMOTION_EMOJI = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😲',
  fearful: '😨',
  disgusted: '🤢',
}

export const EMOTION_COLORS = {
  happy: '#10b981',
  sad: '#6366f1',
  angry: '#ef4444',
  neutral: '#6b7280',
  surprised: '#f59e0b',
  fearful: '#a855f7',
  disgusted: '#06b6d4',
}

export const EMOTION_LABELS = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  neutral: 'Neutral',
  surprised: 'Surprised',
  fearful: 'Fearful',
  disgusted: 'Disgusted',
}

/**
 * Returns the emotion with the highest score from an emotions map.
 */
export function dominantEmotion(emotions) {
  return Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral'
}

/**
 * Normalizes an emotions object so all values sum to 1.
 */
export function normalizeEmotions(emotions) {
  const total = Object.values(emotions).reduce((a, b) => a + b, 0)
  if (total === 0) return { ...emotions }
  return Object.fromEntries(Object.entries(emotions).map(([k, v]) => [k, v / total]))
}

/**
 * Computes Interview Mode insights from current emotion values.
 */
export function getInterviewInsights(emotions) {
  const { happy = 0, neutral = 0, fearful = 0, angry = 0, sad = 0 } = emotions
  return {
    confidence: Math.max(0, Math.min(100, Math.round((happy * 0.8 + neutral * 0.5 - fearful * 0.6 - angry * 0.4) * 100 + 50))),
    stress: Math.max(0, Math.min(100, Math.round((fearful * 0.7 + angry * 0.5 + sad * 0.3) * 100))),
    composure: Math.round(neutral * 100),
  }
}

/**
 * Computes Classroom Mode insights from current emotion values.
 */
export function getClassroomInsights(emotions) {
  const { happy = 0, neutral = 0, surprised = 0, sad = 0, angry = 0 } = emotions
  return {
    attention: Math.max(0, Math.min(100, Math.round((neutral * 0.6 + surprised * 0.8 + happy * 0.5 - sad * 0.4 - angry * 0.5) * 100 + 50))),
    boredom: Math.max(0, Math.min(100, Math.round((sad * 0.6 + neutral * 0.3) * 100))),
    positivity: Math.round(happy * 100),
  }
}

/**
 * Computes General Mode insights.
 */
export function getGeneralInsights(emotions) {
  const { happy = 0, neutral = 0, angry = 0, surprised = 0, fearful = 0 } = emotions
  return {
    positiveValence: Math.round((happy + surprised * 0.5) * 100),
    arousal: Math.min(100, Math.round((happy + angry + surprised + fearful) * 100 * 0.5)),
    neutrality: Math.round(neutral * 100),
  }
}

/**
 * Format session log as CSV string.
 */
export function sessionToCSV(sessionLog) {
  const header = 'timestamp,dominant,confidence,happy,sad,angry,neutral,surprised,fearful,disgusted'
  const rows = sessionLog.map(entry => {
    const { timestamp, dominant, confidence, emotions } = entry
    return [
      timestamp,
      dominant,
      Math.round(confidence * 100),
      ...EMOTIONS.map(e => Math.round((emotions[e] || 0) * 100)),
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

/**
 * Download a string as a file.
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
