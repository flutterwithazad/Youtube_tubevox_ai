export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match && match[1]) return match[1]
  }
  return null
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null
}

export function getVideoType(url: string): 'video' | 'shorts' | 'live' | 'unknown' {
  if (!url) return 'unknown'
  if (url.includes('/shorts/')) return 'shorts'
  if (url.includes('/live/')) return 'live'
  if (url.includes('watch?v=') || url.includes('youtu.be/')) return 'video'
  return 'unknown'
}

export const getAvatarColor = (name: string) => {
  if (!name) return '#E63946';
  const colors = ['#E63946', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'];
  return colors[name.charCodeAt(0) % colors.length];
};
