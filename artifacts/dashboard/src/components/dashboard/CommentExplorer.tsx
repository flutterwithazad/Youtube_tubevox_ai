import { useState, useEffect } from "react";
import { Search, ArrowUpDown, Filter, Columns, Download, Maximize2, Minimize2, CornerDownRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAvatarColor } from "@/lib/utils/youtube";
import { downloadCSV, downloadExcel, downloadJSON } from "@/lib/utils/export";
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
}

export function CommentExplorer({ jobId, videoTitle, totalCount }: CommentExplorerProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialComments();
  }, [jobId]);

  const loadInitialComments = async () => {
    try {
      setLoading(true);
      // Mock fetch - assume comments table exists
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('job_id', jobId)
        .order('likes', { ascending: false })
        .range(0, 49);

      if (error) throw error;
      
      // If no data returned (mock mode fallback)
      if (!data || data.length === 0) {
        setComments(generateMockComments());
      } else {
        setComments(data);
      }
    } catch (e) {
      console.error(e);
      // Fallback for visual testing
      setComments(generateMockComments());
    } finally {
      setLoading(false);
    }
  };

  const generateMockComments = () => {
    return Array.from({ length: 15 }).map((_, i) => ({
      comment_id: `mock_${i}`,
      author: `User ${Math.floor(Math.random() * 1000)}`,
      text: "This is an incredible video. I really appreciate the detailed breakdown of the topic. The editing is also top notch. Keep up the great work! " + (Math.random() > 0.5 ? "Here is some more text to make this comment longer and require expansion." : ""),
      likes: Math.floor(Math.random() * 5000),
      reply_count: Math.floor(Math.random() * 50),
      is_reply: Math.random() > 0.8,
      published_at: new Date(Date.now() - Math.random() * 10000000000).toISOString()
    }));
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const filteredComments = comments.filter(c => 
    !searchQuery || 
    c.text?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = async (format: 'csv' | 'excel' | 'json') => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)), // Simulate network delay
      {
        loading: `Preparing ${format.toUpperCase()} export...`,
        success: () => {
          if (format === 'csv') downloadCSV(filteredComments, 'ytscraper_export');
          if (format === 'excel') downloadExcel(filteredComments, 'ytscraper_export');
          if (format === 'json') downloadJSON(filteredComments, 'ytscraper_export', videoTitle);
          return `Export complete`;
        },
        error: 'Export failed'
      }
    );
  };

  return (
    <div className={`flex flex-col bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : 'h-[650px]'}`}>
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-border shrink-0 gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-foreground truncate">{videoTitle || 'Untitled Video'}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {totalCount?.toLocaleString()} comments total
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${showSearch ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground outline-none">
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">Sort</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="font-medium">Top likes</DropdownMenuItem>
              <DropdownMenuItem disabled>Newest <span className="ml-auto text-[10px] bg-secondary px-1.5 rounded">soon</span></DropdownMenuItem>
              <DropdownMenuItem disabled>Oldest <span className="ml-auto text-[10px] bg-secondary px-1.5 rounded">soon</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button className="p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground relative group">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Coming soon</div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground outline-none">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline text-primary">Export</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>JSON</DropdownMenuItem>
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
            placeholder="Search by author or text..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">{filteredComments.length} found</span>
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
            <Filter className="w-12 h-12 mb-4 opacity-20" />
            <p>No comments found matching your criteria.</p>
          </div>
        ) : (
          <div className="pb-4">
            {filteredComments.map((c) => {
              const isExpanded = expandedRows.has(c.comment_id);
              const initials = (c.author || '?').substring(0, 2).toUpperCase();
              return (
                <div 
                  key={c.comment_id} 
                  onClick={() => toggleExpand(c.comment_id)}
                  className={`grid grid-cols-[32px_100px_160px_1fr_80px_70px] gap-4 px-4 py-3 border-b border-border/50 hover:bg-red-50/50 cursor-pointer transition-colors ${c.is_reply ? 'bg-secondary/30' : ''}`}
                >
                  <div className="flex items-start pt-1 text-muted-foreground/40">
                    {c.is_reply && <CornerDownRight className="w-4 h-4 ml-2" />}
                  </div>
                  <div className="text-xs text-muted-foreground pt-1 truncate">
                    {c.published_at ? formatDistanceToNow(new Date(c.published_at)) : 'N/A'}
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
                    <p className={`whitespace-pre-wrap ${!isExpanded && 'line-clamp-2'}`}>
                      {c.text}
                    </p>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground text-right pt-1">
                    {c.likes?.toLocaleString()}
                  </div>
                  <div className="text-sm font-mono text-muted-foreground/60 text-right pt-1">
                    {c.reply_count > 0 ? c.reply_count : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {!loading && (
        <div className="p-3 border-t border-border bg-secondary/30 text-xs text-center text-muted-foreground shrink-0">
          Showing {filteredComments.length} of {totalCount?.toLocaleString()} comments
        </div>
      )}
    </div>
  );
}
