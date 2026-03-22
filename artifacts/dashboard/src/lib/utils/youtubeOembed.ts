export interface VideoPreview {
  title: string
  author: string
  thumbnail: string
  videoId: string
  type: 'video' | 'shorts' | 'live' | 'unknown'
}

export async function fetchVideoPreview(videoId: string): Promise<VideoPreview | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return {
      title: data.title,
      author: data.author_name,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
      type: 'video',
    }
  } catch {
    return null
  }
}
