import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const downloadCSV = (comments: any[], filename: string) => {
  const headers = ['Published', 'Author', 'Author Channel', 'Comment', 'Likes', 'Reply Count', 'Is Reply', 'Parent ID', 'Language'];
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  
  const rows = comments.map(c => [
    c.published_at ? new Date(c.published_at).toISOString() : '',
    escape(c.author ?? ''), escape(c.author_channel ?? ''), escape(c.text ?? ''),
    c.likes ?? 0, c.reply_count ?? 0, c.is_reply ? 'true' : 'false',
    c.parent_id ?? '', c.language ?? '',
  ].join(','));
  
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_comments.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success(`✓ Downloaded ${comments.length.toLocaleString()} comments as CSV`);
};

export const downloadExcel = (comments: any[], filename: string) => {
  const rows = comments.map(c => ({
    'Published': c.published_at ? new Date(c.published_at).toLocaleDateString() : '',
    'Author': c.author ?? '',
    'Author Channel': c.author_channel ?? '',
    'Comment': c.text ?? '',
    'Likes': c.likes ?? 0,
    'Reply Count': c.reply_count ?? 0,
    'Is Reply': c.is_reply ? 'Yes' : 'No',
    'Parent ID': c.parent_id ?? '',
    'Language': c.language ?? '',
  }));
  
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 25 }, { wch: 35 }, { wch: 80 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 10 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comments');
  XLSX.writeFile(wb, `${filename}_comments.xlsx`);
  
  toast.success(`✓ Downloaded ${comments.length.toLocaleString()} comments as Excel`);
};

export const downloadJSON = (comments: any[], filename: string, videoTitle: string) => {
  const payload = {
    exported_at: new Date().toISOString(),
    video_title: videoTitle,
    total_comments: comments.length,
    comments: comments.map(c => ({
      id: c.comment_id,
      author: c.author,
      author_channel: c.author_channel,
      text: c.text,
      likes: c.likes,
      reply_count: c.reply_count,
      is_reply: c.is_reply,
      parent_id: c.parent_id ?? null,
      language: c.language ?? null,
      published_at: c.published_at,
    }))
  };
  
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_comments.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success(`✓ Downloaded ${comments.length.toLocaleString()} comments as JSON`);
};
