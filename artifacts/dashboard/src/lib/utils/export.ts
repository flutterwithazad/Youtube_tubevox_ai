import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

export const fetchAllCommentsForExport = async (jobId: string): Promise<any[]> => {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("job_id", jobId)
      .order("likes", { ascending: false })
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
};

export const recordExport = async (jobId: string, format: string, rowCount: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("exports").insert({
    job_id: jobId,
    user_id: user.id,
    format,
    status: "ready",
    row_count: rowCount,
  });
};

export const downloadCSV = (comments: any[], filename: string) => {
  const headers = ["Published", "Author", "Author Channel", "Comment", "Likes", "Reply Count", "Is Reply", "Parent ID"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = comments.map((c) => [
    c.published_at ? new Date(c.published_at).toISOString() : "",
    esc(c.author), esc(c.author_channel), esc(c.text),
    c.likes ?? 0, c.reply_count ?? 0,
    c.is_reply ? "true" : "false", c.parent_id ?? "",
  ].join(","));
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}_comments.csv`);
};

export const downloadJSON = (comments: any[], filename: string, videoTitle: string) => {
  const payload = {
    exported_at: new Date().toISOString(),
    video_title: videoTitle,
    total: comments.length,
    comments: comments.map((c) => ({
      id: c.comment_id, author: c.author, author_channel: c.author_channel,
      text: c.text, likes: c.likes, reply_count: c.reply_count,
      is_reply: c.is_reply, parent_id: c.parent_id ?? null,
      published_at: c.published_at,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, `${filename}_comments.json`);
};

export const downloadExcel = (comments: any[], filename: string) => {
  const rows = comments.map((c) => ({
    Published: c.published_at ? new Date(c.published_at).toLocaleDateString() : "",
    Author: c.author ?? "",
    "Author Channel": c.author_channel ?? "",
    Comment: c.text ?? "",
    Likes: c.likes ?? 0,
    "Reply Count": c.reply_count ?? 0,
    "Is Reply": c.is_reply ? "Yes" : "No",
    "Parent ID": c.parent_id ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 35 }, { wch: 80 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Comments");
  XLSX.writeFile(wb, `${filename}_comments.xlsx`);
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
