export interface VideoPreview {
  title: string
  author: string
  thumbnail: string
  videoId: string
  type: 'video' | 'shorts' | 'live' | 'unknown'
}

export async function fetchVideoPreview(
  videoId: string,
  originalUrl?: string
): Promise<VideoPreview | null> {
  const type: VideoPreview['type'] = originalUrl?.includes('/shorts/')
    ? 'shorts'
    : originalUrl?.includes('/live/')
    ? 'live'
    : 'video'

  // Try both URL formats — some Shorts only resolve via /shorts/ path
  const candidates = [
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    `https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}&format=json`,
  ]

  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        videoId,
        type,
      }
    } catch {
      continue
    }
  }
  return null
}
