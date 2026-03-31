import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, SlidersHorizontal, Download,
  Maximize2, Minimize2, CornerDownRight,
  Columns3, Check, Plus, Trash2, X,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAvatarColor } from "@/lib/utils/youtube";
import { downloadCSV, downloadExcel, downloadJSON, fetchAllCommentsForExport, recordExport } from "@/lib/utils/export";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface CommentExplorerProps {
  jobId: string;
  videoTitle: string;
  totalCount: number;
  isPartial?: boolean;
  jobStatus?: string;
}

interface FilterRule {
  id: string;
  field: "text" | "author" | "likes" | "is_reply";
  operator: string;
  value: string;
}

type PanelName = "filter" | "fields" | "export" | null;

// ── Column config ───────────────────────────────────────────────────────────

interface ColDef {
  id: string;
  label: string;
  width: string;
  sortable: boolean;
  sortKey?: string;        // data field key to sort by
  always?: boolean;        // always visible, cannot be toggled off
  align?: "center";
  toggleLabel?: string;    // label in Fields dropdown
}

const ALL_COLUMNS: ColDef[] = [
  { id: "reply",         label: "",           width: "28px",               sortable: false, always: true },
  { id: "published",     label: "Published",  width: "96px",               sortable: true,  sortKey: "published_at",   toggleLabel: "Published" },
  { id: "author",        label: "Author",     width: "160px",              sortable: true,  sortKey: "author",         toggleLabel: "Author" },
  { id: "comment",       label: "Comment",    width: "minmax(200px,1fr)",  sortable: false, always: true },
  { id: "likes",         label: "Likes",      width: "72px",               sortable: true,  sortKey: "likes",          toggleLabel: "Likes" },
  { id: "replies",       label: "Reply",      width: "64px",               sortable: true,  sortKey: "reply_count",    toggleLabel: "Reply count" },
  { id: "heart",         label: "Heart",      width: "56px",               sortable: false, align: "center",           toggleLabel: "❤️ Heart" },
  { id: "authorChannel", label: "Channel",    width: "150px",              sortable: false,                            toggleLabel: "Author channel" },
];

const DEFAULT_VISIBLE_COLS = new Set(["published", "author", "likes", "replies"]);

const OPERATORS_TEXT = ["contains", "does not contain", "equals", "not equals", "starts with", "ends with", "matches regex"];
const OPERATORS_NUM  = ["greater than", "less than", "equals"];
const OPERATORS_BOOL = ["is true", "is false"];

function operatorsFor(field: FilterRule["field"]) {
  if (field === "likes")    return OPERATORS_NUM;
  if (field === "is_reply") return OPERATORS_BOOL;
  return OPERATORS_TEXT;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const RENDER_PAGE = 300;

// ── GreenCheck ──────────────────────────────────────────────────────────────

const GreenCheck = () => (
  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// ── Component ───────────────────────────────────────────────────────────────

export function CommentExplorer({ jobId, videoTitle, totalCount, isPartial, jobStatus }: CommentExplorerProps) {

  // ── Data layer ──────────────────────────────────────────────────────────
  const [comments, setComments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  // ── State layer ─────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch,   setShowSearch]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [openPanel,    setOpenPanel]    = useState<PanelName>(null);
  const [filterTab,    setFilterTab]    = useState<"simple" | "advanced">("simple");
  const [renderLimit,  setRenderLimit]  = useState(RENDER_PAGE);

  // Sort state — column id + direction, sorted in-memory
  const [sortCol, setSortCol] = useState<string>("likes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Column visibility — Set of visible column ids
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLS));

  // Simple filter state
  const [simpleFilters, setSimpleFilters] = useState({
    includeReplies: true,
    authorSearch:   "",
    commentWith:    [] as string[],
    minLikes:       0,
  });

  // Advanced filter state
  const [advancedRules, setAdvancedRules] = useState<FilterRule[]>([]);
  const [matchMode,     setMatchMode]     = useState<"all" | "any">("all");

  // ── Click-outside to close panels ───────────────────────────────────────
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPanel) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openPanel]);

  // ── Derived: active columns + grid template ──────────────────────────────
  const activeColumns = useMemo(
    () => ALL_COLUMNS.filter(col => col.always || visibleCols.has(col.id)),
    [visibleCols],
  );

  const gridTemplate = useMemo(
    () => activeColumns.map(col => col.width).join(" "),
    [activeColumns],
  );

  // ── Derived: max likes (for slider) ─────────────────────────────────────
  const maxLikes = useMemo(
    () => comments.reduce((m, c) => Math.max(m, c.likes ?? 0), 0),
    [comments],
  );

  // ── Advanced filter logic ────────────────────────────────────────────────
  const applyAdvancedRules = useCallback((c: any): boolean => {
    if (advancedRules.length === 0) return true;
    const results = advancedRules.map((rule) => {
      const raw =
        rule.field === "text"     ? (c.text    ?? "") :
        rule.field === "author"   ? (c.author  ?? "") :
        rule.field === "likes"    ? String(c.likes ?? 0) :
        rule.field === "is_reply" ? String(c.is_reply) : "";
      const fieldVal = raw.toLowerCase();
      const val = rule.value.toLowerCase();
      switch (rule.operator) {
        case "contains":         return fieldVal.includes(val);
        case "does not contain": return !fieldVal.includes(val);
        case "equals":           return fieldVal === val;
        case "not equals":       return fieldVal !== val;
        case "starts with":      return fieldVal.startsWith(val);
        case "ends with":        return fieldVal.endsWith(val);
        case "matches regex":    try { return new RegExp(val, "i").test(fieldVal); } catch { return false; }
        case "greater than":     return Number(raw) > Number(rule.value);
        case "less than":        return Number(raw) < Number(rule.value);
        case "is true":          return c.is_reply === true;
        case "is false":         return c.is_reply === false;
        default:                 return true;
      }
    });
    return matchMode === "all" ? results.every(Boolean) : results.some(Boolean);
  }, [advancedRules, matchMode]);

  // ── Derived data: filtered → sorted ─────────────────────────────────────
  const displayedComments = useMemo(() => {
    let result = [...comments];

    // 1. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.text?.toLowerCase().includes(q) || c.author?.toLowerCase().includes(q)
      );
    }

    // 2. Simple filters
    if (!simpleFilters.includeReplies) result = result.filter(c => !c.is_reply);
    if (simpleFilters.authorSearch)    result = result.filter(c => c.author?.toLowerCase().includes(simpleFilters.authorSearch.toLowerCase()));
    if (simpleFilters.commentWith.includes("questions")) result = result.filter(c => c.text?.includes("?"));
    if (simpleFilters.commentWith.includes("mentions"))  result = result.filter(c => c.text?.includes("@"));
    if (simpleFilters.commentWith.includes("hashtags"))  result = result.filter(c => c.text?.includes("#"));
    if (simpleFilters.commentWith.includes("emojis"))    result = result.filter(c => /\p{Emoji}/u.test(c.text ?? ""));
    if (simpleFilters.minLikes > 0)    result = result.filter(c => (c.likes ?? 0) >= simpleFilters.minLikes);

    // 3. Advanced rules
    if (advancedRules.length > 0) result = result.filter(applyAdvancedRules);

    // 4. In-memory sort
    const colDef = ALL_COLUMNS.find(col => col.id === sortCol);
    const key    = colDef?.sortKey ?? sortCol;
    result.sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    return result;
  }, [comments, searchQuery, simpleFilters, advancedRules, applyAdvancedRules, sortCol, sortDir]);

  // ── Active filter count ──────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!simpleFilters.includeReplies) count++;
    if (simpleFilters.authorSearch)    count++;
    count += simpleFilters.commentWith.length;
    if (simpleFilters.minLikes > 0)    count++;
    count += advancedRules.length;
    return count;
  }, [simpleFilters, advancedRules]);

  // ── Data load — fetch ALL comments in batches, deduplicated ─────────────
  useEffect(() => { if (jobId) loadAll(); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = async () => {
    try {
      setLoading(true);
      setComments([]);
      setRenderLimit(RENDER_PAGE);
      const all: any[] = [];
      const seen = new Set<string>();
      let from = 0;
      const BATCH = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("job_id", jobId)
          .order("likes", { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const c of data) {
          const key = c.comment_id || c.id;
          if (!seen.has(key)) { seen.add(key); all.push(c); }
        }
        if (data.length < BATCH) break;
        from += BATCH;
      }
      setComments(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Reset render window when filters/sort change
  useEffect(() => { setRenderLimit(RENDER_PAGE); }, [searchQuery, simpleFilters, advancedRules, sortCol, sortDir]);

  // ── Column sort handler ──────────────────────────────────────────────────
  const handleSortCol = (colId: string) => {
    const col = ALL_COLUMNS.find(c => c.id === colId);
    if (!col?.sortable) return;
    if (sortCol === colId) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortCol(colId);
      // Numeric columns default desc, text columns default asc
      setSortDir(colId === "likes" || colId === "replies" ? "desc" : "asc");
    }
  };

  // ── Export helpers ───────────────────────────────────────────────────────
  const slug = videoTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40).toLowerCase();

  const exportFiltered = async (format: "csv" | "xlsx" | "json") => {
    const data = displayedComments;
    if (format === "csv")  downloadCSV(data, slug);
    if (format === "xlsx") downloadExcel(data, slug);
    if (format === "json") downloadJSON(data, slug, videoTitle);
    toast.success(`Exported ${data.length.toLocaleString()} comments as ${format.toUpperCase()}`);
  };

  const exportAll = async (format: "csv" | "xlsx" | "json") => {
    const id = toast.loading(`Fetching all ${totalCount.toLocaleString()} comments…`);
    try {
      const all = await fetchAllCommentsForExport(jobId);
      if (format === "csv")  downloadCSV(all, slug);
      if (format === "xlsx") downloadExcel(all, slug);
      if (format === "json") downloadJSON(all, slug, videoTitle);
      await recordExport(jobId, format, all.length);
      toast.success(`Exported ${all.length.toLocaleString()} comments`, { id });
    } catch (e: any) {
      toast.error("Export failed: " + (e.message ?? "Unknown"), { id });
    }
  };

  // ── Panel helpers ────────────────────────────────────────────────────────
  const togglePanel = (name: PanelName) =>
    setOpenPanel(prev => prev === name ? null : name);

  const toggleCol = (colId: string) =>
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(colId) ? next.delete(colId) : next.add(colId);
      return next;
    });

  // ── Filter helpers ───────────────────────────────────────────────────────
  const togglePill = (pill: string) =>
    setSimpleFilters(prev => ({
      ...prev,
      commentWith: prev.commentWith.includes(pill)
        ? prev.commentWith.filter(p => p !== pill)
        : [...prev.commentWith, pill],
    }));

  const addRule = () =>
    setAdvancedRules(prev => [...prev, { id: uid(), field: "text", operator: "contains", value: "" }]);

  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    setAdvancedRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.field && patch.field !== r.field) {
        next.operator = operatorsFor(next.field)[0];
        next.value = "";
      }
      return next;
    }));

  const removeRule = (id: string) =>
    setAdvancedRules(prev => prev.filter(r => r.id !== id));

  const clearSimple = () => setSimpleFilters({ includeReplies: true, authorSearch: "", commentWith: [], minLikes: 0 });
  const clearAll    = () => { clearSimple(); setAdvancedRules([]); };

  // ── Button styles ────────────────────────────────────────────────────────
  const BtnBase   = "relative p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground select-none";
  const BtnActive = "bg-secondary text-foreground";

  // ── Sort indicator ───────────────────────────────────────────────────────
  const SortIcon = ({ colId }: { colId: string }) => {
    if (sortCol !== colId) return <ChevronsUpDown className="w-3 h-3 opacity-25 ml-0.5" />;
    return sortDir === "asc"
      ? <ChevronUp   className="w-3 h-3 ml-0.5 text-primary" />
      : <ChevronDown className="w-3 h-3 ml-0.5 text-primary" />;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ${isFullscreen ? "fixed inset-4 z-50" : "h-[660px]"}`}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        ref={toolbarRef}
        className="relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-border shrink-0 gap-3"
      >
        <div className="min-w-0">
          <h3 className="font-display font-bold text-foreground truncate">{videoTitle || "Untitled Video"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading
              ? "Loading…"
              : displayedComments.length > renderLimit
                ? `Showing ${renderLimit.toLocaleString()} of ${displayedComments.length.toLocaleString()} filtered · ${totalCount.toLocaleString()} total${activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active` : ""}`
                : `${displayedComments.length.toLocaleString()} of ${totalCount.toLocaleString()} comments${activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active` : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {/* Search */}
          <button
            onClick={() => { setShowSearch(v => !v); setOpenPanel(null); }}
            className={`${BtnBase} ${showSearch ? BtnActive : ""}`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {/* Filter */}
          <button
            onClick={() => togglePanel("filter")}
            className={`${BtnBase} ${openPanel === "filter" ? BtnActive : ""}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Fields */}
          <button
            onClick={() => togglePanel("fields")}
            className={`${BtnBase} ${openPanel === "fields" ? BtnActive : ""}`}
          >
            <Columns3 className="w-4 h-4" />
            <span className="hidden sm:inline">Fields</span>
          </button>

          {/* Export */}
          <button
            onClick={() => togglePanel("export")}
            className={`${BtnBase} ${openPanel === "export" ? BtnActive : ""} text-primary`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => { setIsFullscreen(v => !v); setOpenPanel(null); }}
            className={`${BtnBase} hidden sm:flex`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Filter panel ──────────────────────────────────────────────── */}
        {openPanel === "filter" && (
          <div className="absolute top-full right-0 mt-1 w-80 bg-popover border border-border rounded-xl shadow-lg z-50">
            <div className="flex border-b border-border rounded-t-xl overflow-hidden">
              {(["simple", "advanced"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${filterTab === tab ? "border-b-2 border-primary text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {filterTab === "simple" ? (
                <>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm font-medium text-foreground">Include replies</span>
                    <div
                      onClick={() => setSimpleFilters(p => ({ ...p, includeReplies: !p.includeReplies }))}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${simpleFilters.includeReplies ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${simpleFilters.includeReplies ? "translate-x-4" : ""}`} />
                    </div>
                  </label>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comment author</label>
                    <input
                      type="text"
                      placeholder="Search by author…"
                      value={simpleFilters.authorSearch}
                      onChange={e => setSimpleFilters(p => ({ ...p, authorSearch: e.target.value }))}
                      className="mt-1.5 w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comments with</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["questions", "mentions", "hashtags", "emojis"].map(pill => {
                        const active = simpleFilters.commentWith.includes(pill);
                        return (
                          <button
                            key={pill}
                            onClick={() => togglePill(pill)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${active ? "bg-red-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                          >
                            {pill === "questions" ? "❓ Questions" : pill === "mentions" ? "@ Mentions" : pill === "hashtags" ? "# Hashtags" : "😀 Emojis"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min. likes</label>
                      <span className="text-xs font-mono text-foreground">{simpleFilters.minLikes.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxLikes || 100}
                      value={simpleFilters.minLikes}
                      onChange={e => setSimpleFilters(p => ({ ...p, minLikes: Number(e.target.value) }))}
                      className="w-full accent-red-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
                      <span>0</span>
                      <span>{(maxLikes || 100).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={clearSimple}
                    className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                  >
                    Clear all filters
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Match</span>
                    {(["all", "any"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setMatchMode(mode)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${matchMode === mode ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                      >
                        {mode}
                      </button>
                    ))}
                    <span className="text-muted-foreground">conditions</span>
                  </div>

                  <div className="space-y-2">
                    {advancedRules.map(rule => (
                      <div key={rule.id} className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={rule.field}
                          onChange={e => updateRule(rule.id, { field: e.target.value as FilterRule["field"] })}
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          <option value="text">Comment text</option>
                          <option value="author">Author</option>
                          <option value="likes">Likes</option>
                          <option value="is_reply">Is reply</option>
                        </select>

                        <select
                          value={rule.operator}
                          onChange={e => updateRule(rule.id, { operator: e.target.value })}
                          className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          {operatorsFor(rule.field).map(op => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>

                        {rule.field !== "is_reply" && (
                          <input
                            type={rule.field === "likes" ? "number" : "text"}
                            value={rule.value}
                            onChange={e => updateRule(rule.id, { value: e.target.value })}
                            placeholder="value"
                            className="w-20 px-2 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                          />
                        )}

                        <button
                          onClick={() => removeRule(rule.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={addRule}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Rule
                    </button>
                    {advancedRules.length > 0 && (
                      <button
                        onClick={() => setAdvancedRules([])}
                        className="px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Fields panel ──────────────────────────────────────────────── */}
        {openPanel === "fields" && (
          <div className="absolute top-full right-0 mt-1 w-52 bg-popover border border-border rounded-xl shadow-lg z-50 py-2">
            {ALL_COLUMNS.filter(col => !col.always && col.toggleLabel).map(col => (
              <button
                key={col.id}
                onClick={() => toggleCol(col.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${visibleCols.has(col.id) ? "bg-primary border-primary" : "border-border"}`}>
                  {visibleCols.has(col.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {col.toggleLabel}
              </button>
            ))}
          </div>
        )}

        {/* ── Export panel ──────────────────────────────────────────────── */}
        {openPanel === "export" && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-lg z-50">
            <div className="px-3 py-2.5 bg-secondary/50 border-b border-border rounded-t-xl">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Export filtered view</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{displayedComments.length.toLocaleString()} comments</p>
            </div>
            {(["csv", "xlsx", "json"] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => { exportFiltered(fmt); setOpenPanel(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                {fmt === "csv" ? "Spreadsheet (CSV)" : fmt === "xlsx" ? "Excel (XLSX)" : "Raw data (JSON)"}
              </button>
            ))}

            <div className="px-3 py-2.5 bg-secondary/50 border-y border-border mt-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Export all comments</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{totalCount.toLocaleString()} comments</p>
            </div>
            {(["csv", "xlsx", "json"] as const).map(fmt => (
              <button
                key={"all-" + fmt}
                onClick={() => { exportAll(fmt); setOpenPanel(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                {fmt === "csv" ? "Spreadsheet (CSV)" : fmt === "xlsx" ? "Excel (XLSX)" : "Raw data (JSON)"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border bg-secondary/50 shrink-0 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search by author or comment text…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs text-muted-foreground shrink-0">{displayedComments.length.toLocaleString()} found</span>
        </div>
      )}

      {/* ── Partial results banner ───────────────────────────────────────── */}
      {isPartial && totalCount >= 100 && (
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>
              <strong>Partial results</strong> — {jobStatus === "cancelled" ? "job was cancelled" : "credits ran out"} at{" "}
              <strong>{totalCount.toLocaleString()}</strong> comments. You can still export what was collected.
            </span>
          </div>
          <a href="/dashboard/credits" className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 ml-4 shrink-0 whitespace-nowrap">
            Buy credits →
          </a>
        </div>
      )}

      {/* ── Data grid: horizontal scroll wraps both header + body ───────── */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex flex-col h-full" style={{ minWidth: "700px" }}>

          {/* ── Sticky header ─────────────────────────────────────────── */}
          <div
            style={{ display: "grid", gridTemplateColumns: gridTemplate }}
            className="gap-4 px-4 py-2.5 bg-secondary/60 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0"
          >
            {activeColumns.map(col => (
              <div
                key={col.id}
                onClick={() => handleSortCol(col.id)}
                className={[
                  "flex items-center gap-0.5",
                  col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : "",
                  col.align === "center" ? "justify-center" : "",
                ].filter(Boolean).join(" ")}
              >
                {col.label}
                {col.sortable && <SortIcon colId={col.id} />}
              </div>
            ))}
          </div>

          {/* ── Scrollable body ────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-card min-h-0">
            {loading ? (
              /* Skeleton rows */
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: gridTemplate }} className="gap-4 px-4 py-4 border-b border-border/40">
                  <Skeleton className="h-4 w-4 rounded" />
                  {activeColumns.slice(1).map(col => (
                    <div key={col.id}>
                      {col.id === "author"
                        ? <div className="flex gap-2 items-center"><Skeleton className="h-7 w-7 rounded-full shrink-0" /><Skeleton className="h-4 w-24" /></div>
                        : <Skeleton className="h-4 w-full max-w-[80px]" />
                      }
                    </div>
                  ))}
                </div>
              ))
            ) : displayedComments.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center gap-3">
                <SlidersHorizontal className="w-10 h-10 opacity-20" />
                <p className="text-sm">
                  {searchQuery || activeFilterCount > 0
                    ? "No comments match your current filters."
                    : "No comments found for this job."}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="text-xs text-primary underline underline-offset-2 hover:text-primary/80">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              /* Rows */
              <>
                {displayedComments.slice(0, renderLimit).map((c) => {
                  const key = c.comment_id || c.id;
                  const initials = (c.author || "?").substring(0, 2).toUpperCase();
                  return (
                    <div
                      key={key}
                      style={{ display: "grid", gridTemplateColumns: gridTemplate }}
                      className="gap-4 px-4 py-3 border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      {activeColumns.map(col => {
                        switch (col.id) {
                          case "reply":
                            return (
                              <div key="reply" className="flex items-center justify-center text-muted-foreground/30">
                                {c.is_reply && <CornerDownRight className="w-3.5 h-3.5" />}
                              </div>
                            );
                          case "published":
                            return (
                              <div key="published" className="text-xs text-muted-foreground flex items-center">
                                {c.published_at ? formatDistanceToNow(new Date(c.published_at), { addSuffix: false }) : "—"}
                              </div>
                            );
                          case "author":
                            return (
                              <div key="author" className="flex items-center gap-2 min-w-0 pr-2">
                                {c.author_profile_image ? (
                                  <img
                                    src={c.author_profile_image}
                                    alt={c.author}
                                    className="w-7 h-7 rounded-full shrink-0 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${c.author_profile_image ? "hidden" : ""}`}
                                  style={{ backgroundColor: getAvatarColor(c.author) }}
                                >
                                  {initials}
                                </div>
                                <span className="text-sm text-foreground truncate">{c.author}</span>
                              </div>
                            );
                          case "comment":
                            return (
                              <div key="comment" className="text-sm text-foreground leading-relaxed">
                                <p className="whitespace-pre-wrap break-words">{c.text}</p>
                              </div>
                            );
                          case "likes":
                            return (
                              <div key="likes" className="text-sm text-foreground flex items-center">
                                {(c.likes ?? 0).toLocaleString()}
                              </div>
                            );
                          case "replies":
                            return (
                              <div key="replies" className="text-sm text-muted-foreground flex items-center">
                                {c.reply_count > 0 ? c.reply_count.toLocaleString() : "—"}
                              </div>
                            );
                          case "heart":
                            return (
                              <div key="heart" className="flex items-center justify-center">
                                {c.liked_by_creator ? <GreenCheck /> : null}
                              </div>
                            );
                          case "authorChannel":
                            return (
                              <div key="authorChannel" className="text-xs text-muted-foreground flex items-center truncate">
                                {c.author_channel ?? "—"}
                              </div>
                            );
                          default:
                            return null;
                        }
                      })}
                    </div>
                  );
                })}

                {/* Load more */}
                {displayedComments.length > renderLimit && (
                  <div className="py-4 text-center border-t border-border/30">
                    <button
                      onClick={() => setRenderLimit(prev => prev + RENDER_PAGE)}
                      className="flex items-center gap-2 mx-auto text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-lg hover:bg-primary/5"
                    >
                      Show {Math.min(RENDER_PAGE, displayedComments.length - renderLimit).toLocaleString()} more
                      <span className="text-xs text-muted-foreground">
                        ({renderLimit.toLocaleString()} of {displayedComments.length.toLocaleString()} shown)
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="p-3 border-t border-border bg-secondary/30 text-xs text-center text-muted-foreground shrink-0">
          {activeFilterCount > 0
            ? <>
                <strong className="text-foreground">{displayedComments.length.toLocaleString()}</strong>
                {" "}matching of{" "}
                <strong className="text-foreground">{comments.length.toLocaleString()}</strong>
                {" "}comments
                <span className="ml-1 text-red-600 font-medium">
                  ({activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active ·{" "}
                  <button onClick={clearAll} className="underline underline-offset-1 hover:text-red-700">clear</button>)
                </span>
              </>
            : <>
                All{" "}
                <strong className="text-foreground">{comments.length.toLocaleString()}</strong>
                {" "}comments loaded · sorted by{" "}
                <span className="font-medium text-foreground">
                  {ALL_COLUMNS.find(c => c.id === sortCol)?.label ?? sortCol}
                </span>
                {" "}{sortDir === "desc" ? "↓" : "↑"}
              </>
          }
        </div>
      )}
    </div>
  );
}
