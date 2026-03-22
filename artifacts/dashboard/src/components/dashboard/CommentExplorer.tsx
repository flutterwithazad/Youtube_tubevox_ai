import { useState, useEffect, useCallback } from "react";
import { Search, ArrowUpDown, SlidersHorizontal, Download, Maximize2, Minimize2, CornerDownRight, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAvatarColor } from "@/lib/utils/youtube";
import { downloadCSV, downloadExcel, downloadJSON, fetchAllCommentsForExport, recordExport } from "@/lib/utils/export";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentExplorerProps {
  jobId: string;
  videoTitle: string;
  totalCount: number;
  isPartial?: boolean;
  jobStatus?: string;
}

const PAGE_SIZE = 50;

type SortOrder = "likes" | "newest" | "oldest";

export function CommentExplorer({ jobId, videoTitle, totalCount, isPartial, jobStatus }: CommentExplorerProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>("likes");

  useEffect(() => {
    if (jobId) loadInitial();
  }, [jobId, sortOrder]);

  const buildQuery = (from: number, to: number) => {
    const q = supabase.from("comments").select("*").eq("job_id", jobId);
    if (sortOrder === "likes") return q.order("likes", { ascending: false }).range(from, to);
    if (sortOrder === "newest") return q.order("published_at", { ascending: false }).range(from, to);
    return q.order("published_at", { ascending: true }).range(from, to);
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      setComments([]);
      setOffset(0);
      setHasMore(true);
      const { data, error } = await buildQuery(0, PAGE_SIZE - 1);
      if (error) throw error;
      setComments(data ?? []);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
      setOffset(PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data } = await buildQuery(offset, offset + PAGE_SIZE - 1);
    setComments((prev) => [...prev, ...(data ?? [])]);
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setOffset((prev) => prev + PAGE_SIZE);
    setLoadingMore(false);
  }, [offset, loadingMore, hasMore, sortOrder, jobId]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const filteredComments = searchQuery
    ? comments.filter(
        (c) =>
          c.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.author?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : comments;

  const handleExport = async (format: "csv" | "excel" | "json") => {
    const label = format === "excel" ? "Excel" : format.toUpperCase();
    const toastId = toast.loading(`Fetching all comments for ${label} export…`);
    try {
      const allComments = await fetchAllCommentsForExport(jobId);
      const slug = videoTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40).toLowerCase();
      if (format === "csv") downloadCSV(allComments, slug);
      else if (format === "excel") downloadExcel(allComments, slug);
      else downloadJSON(allComments, slug, videoTitle);
      await recordExport(jobId, format === "excel" ? "xlsx" : format, allComments.length);
      toast.success(`${allComments.length.toLocaleString()} comments exported as ${label}`, { id: toastId });
    } catch (e: any) {
      toast.error("Export failed: " + (e.message || "Unknown error"), { id: toastId });
    }
  };

  const sortLabel = sortOrder === "likes" ? "Top likes" : sortOrder === "newest" ? "Newest" : "Oldest";

  return (
    <div className={`flex flex-col bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ${isFullscreen ? "fixed inset-4 z-50" : "h-[650px]"}`}>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-border shrink-0 gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-foreground truncate">{videoTitle || "Untitled Video"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${comments.length.toLocaleString()} loaded · ${totalCount.toLocaleString()} total`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${showSearch ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground outline-none">
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">{sortLabel}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortOrder("likes")} className={sortOrder === "likes" ? "font-bold text-primary" : ""}>Top likes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("newest")} className={sortOrder === "newest" ? "font-bold text-primary" : ""}>Newest first</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("oldest")} className={sortOrder === "oldest" ? "font-bold text-primary" : ""}>Oldest first</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground outline-none">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline text-primary">Export</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => handleExport("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border bg-secondary/50 shrink-0 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by author or text…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">{filteredComments.length} found</span>
        </div>
      )}

      {/* Partial results banner */}
      {isPartial && totalCount >= 100 && (
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>
              <strong>Partial results</strong> — scrape stopped at{' '}
              <strong>{totalCount.toLocaleString()}</strong> comments.
              {jobStatus === 'cancelled' ? ' Job was cancelled.' : ' Credits ran out.'}
              {' '}You can still export what was collected.
            </span>
          </div>
          <a
            href="/dashboard/credits"
            className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 ml-4 flex-shrink-0 whitespace-nowrap"
          >
            Buy credits →
          </a>
        </div>
      )}

      {/* Table Header */}
      <div className="grid grid-cols-[32px_100px_160px_1fr_80px_70px] gap-4 px-4 py-3 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 pr-6">
        <div></div>
        <div>Published</div>
        <div>Author</div>
        <div>Comment</div>
        <div className="text-right">Likes</div>
        <div className="text-right">Replies</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto bg-card">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[32px_100px_160px_1fr_80px_70px] gap-4 px-4 py-4 border-b border-border/50">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
              <div className="flex gap-2 items-center"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-4 w-24" /></div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10 ml-auto" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          ))
        ) : filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
            <SlidersHorizontal className="w-12 h-12 mb-4 opacity-20" />
            <p>{searchQuery ? "No comments matching your search." : "No comments found for this job."}</p>
          </div>
        ) : (
          <div>
            {filteredComments.map((c) => {
              const isExpanded = expandedRows.has(c.comment_id || c.id);
              const initials = (c.author || "?").substring(0, 2).toUpperCase();
              const rowKey = c.comment_id || c.id;
              return (
                <div
                  key={rowKey}
                  onClick={() => toggleExpand(rowKey)}
                  className={`grid grid-cols-[32px_100px_160px_1fr_80px_70px] gap-4 px-4 py-3 border-b border-border/50 hover:bg-red-50/50 cursor-pointer transition-colors ${c.is_reply ? "bg-secondary/30" : ""}`}
                >
                  <div className="flex items-start pt-1 text-muted-foreground/40">
                    {c.is_reply && <CornerDownRight className="w-4 h-4 ml-2" />}
                  </div>
                  <div className="text-xs text-muted-foreground pt-1 truncate">
                    {c.published_at ? formatDistanceToNow(new Date(c.published_at), { addSuffix: false }) : "N/A"}
                  </div>
                  <div className="flex items-start gap-2 pt-0.5 truncate pr-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: getAvatarColor(c.author) }}
                    >
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{c.author}</span>
                  </div>
                  <div className="text-sm text-foreground pr-4 overflow-hidden">
                    <p className={`whitespace-pre-wrap ${!isExpanded ? "line-clamp-2" : ""}`}>{c.text}</p>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground text-right pt-1">
                    {(c.likes ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm font-mono text-muted-foreground/60 text-right pt-1">
                    {c.reply_count > 0 ? c.reply_count : "-"}
                  </div>
                </div>
              );
            })}

            {/* Load More */}
            {!searchQuery && hasMore && (
              <div className="py-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 mx-auto text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {loadingMore ? "Loading…" : "Load more comments"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="p-3 border-t border-border bg-secondary/30 text-xs text-center text-muted-foreground shrink-0">
          {searchQuery
            ? `${filteredComments.length} matching · ${comments.length.toLocaleString()} loaded`
            : `${comments.length.toLocaleString()} of ${totalCount.toLocaleString()} comments loaded`}
        </div>
      )}
    </div>
  );
}

