export const extractVideoId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    return null;
  } catch {
    return null;
  }
};

export const getAvatarColor = (name: string) => {
  if (!name) return '#E63946';
  const colors = ['#E63946', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722'];
  return colors[name.charCodeAt(0) % colors.length];
};
