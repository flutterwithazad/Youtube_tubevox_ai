import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, ArrowUpDown, SlidersHorizontal, Download,
  Maximize2, Minimize2, CornerDownRight,
  Columns3, Check, Plus, Trash2, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAvatarColor } from "@/lib/utils/youtube";
import { downloadCSV, downloadExcel, downloadJSON, fetchAllCommentsForExport, recordExport } from "@/lib/utils/export";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

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

type SortOrder = "likes" | "newest" | "oldest";
type PanelName = "sort" | "filter" | "fields" | "export" | null;

const OPERATORS_TEXT = ["contains", "does not contain", "equals", "not equals", "starts with", "ends with", "matches regex"];
const OPERATORS_NUM  = ["greater than", "less than", "equals"];
const OPERATORS_BOOL = ["is true", "is false"];

function operatorsFor(field: FilterRule["field"]) {
  if (field === "likes") return OPERATORS_NUM;
  if (field === "is_reply") return OPERATORS_BOOL;
  return OPERATORS_TEXT;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const RENDER_PAGE = 300;

export function CommentExplorer({ jobId, videoTitle, totalCount, isPartial, jobStatus }: CommentExplorerProps) {
  // ── DB state ─────────────────────────────────────────────────────────────────
  const [comments,     setComments]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [expandedRows,  setExpandedRows]  = useState<Set<string>>(new Set());
  const [sortOrder,     setSortOrder]     = useState<SortOrder>("likes");
  const [showSearch,    setShowSearch]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [openPanel,     setOpenPanel]     = useState<PanelName>(null);
  const [filterTab,     setFilterTab]     = useState<"simple" | "advanced">("simple");
  // Render window — keeps DOM nodes manageable for large datasets
  const [renderLimit,  setRenderLimit]   = useState(RENDER_PAGE);

  // ── Simple filter state ───────────────────────────────────────────────────────
  const [simpleFilters, setSimpleFilters] = useState({
    includeReplies: true,
    authorSearch:   "",
    commentWith:    [] as string[],
    minLikes:       0,
  });

  // ── Advanced filter state ─────────────────────────────────────────────────────
  const [advancedRules, setAdvancedRules] = useState<FilterRule[]>([]);
  const [matchMode,     setMatchMode]     = useState<"all" | "any">("all");

  // ── Field visibility state ────────────────────────────────────────────────────
  const [visibleFields, setVisibleFields] = useState({
    published:       true,
    author:          true,
    likes:           true,
    replies:         true,
    heart:           false,
    pinned:          false,
    paid:            false,
    authorChannel:   false,
  });

  // ── Toolbar panel ref for click-outside ──────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────────────
  const maxLikes = useMemo(
    () => comments.reduce((m, c) => Math.max(m, c.likes ?? 0), 0),
    [comments],
  );

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

    return result;
  }, [comments, searchQuery, simpleFilters, advancedRules, applyAdvancedRules]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!simpleFilters.includeReplies) count++;
    if (simpleFilters.authorSearch) count++;
    count += simpleFilters.commentWith.length;
    if (simpleFilters.minLikes > 0) count++;
    count += advancedRules.length;
    return count;
  }, [simpleFilters, advancedRules]);

  const computedGridTemplate = useMemo(() => [
    "28px",
    visibleFields.published     ? "96px"  : null,
    visibleFields.author        ? "160px" : null,
    "1fr",
    visibleFields.likes         ? "72px"  : null,
    visibleFields.replies       ? "64px"  : null,
    visibleFields.heart         ? "56px"  : null,
    visibleFields.pinned        ? "60px"  : null,
    visibleFields.paid          ? "56px"  : null,
    visibleFields.authorChannel ? "150px" : null,
  ].filter(Boolean).join(" "), [visibleFields]);

  // ── DB loading — fetch ALL comments in batches, deduplicated ─────────────────
  useEffect(() => { if (jobId) loadAll(); }, [jobId, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const q = supabase.from("comments").select("*").eq("job_id", jobId);
        const ordered =
          sortOrder === "likes"  ? q.order("likes",        { ascending: false }) :
          sortOrder === "newest" ? q.order("published_at", { ascending: false }) :
                                   q.order("published_at", { ascending: true  });
        const { data, error } = await ordered.range(from, from + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        // Deduplicate by comment_id to avoid React key collisions and filter glitches
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

  // Reset render window when filters change so results always start from top
  useEffect(() => { setRenderLimit(RENDER_PAGE); }, [searchQuery, simpleFilters, advancedRules]);

  const toggleExpand = (id: string) => {
    const s = new Set(expandedRows);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedRows(s);
  };

  // ── Export helpers ────────────────────────────────────────────────────────────
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

  // ── Panel toggles ─────────────────────────────────────────────────────────────
  const togglePanel = (name: PanelName) =>
    setOpenPanel(prev => prev === name ? null : name);

  const sortLabel = sortOrder === "likes" ? "Top likes" : sortOrder === "newest" ? "Newest" : "Oldest";

  const BtnBase = "relative p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground select-none";
  const BtnActive = "bg-secondary text-foreground";

  // ── Field toggle helper ───────────────────────────────────────────────────────
  const toggleField = (key: keyof typeof visibleFields) =>
    setVisibleFields(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Advanced rule helpers ─────────────────────────────────────────────────────
  const addRule = () =>
    setAdvancedRules(prev => [...prev, { id: uid(), field: "text", operator: "contains", value: "" }]);

  const updateRule = (id: string, patch: Partial<FilterRule>) =>
    setAdvancedRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      // Reset operator when field changes to avoid invalid combinations
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

  // ── Pill toggle helper ────────────────────────────────────────────────────────
  const togglePill = (pill: string) =>
    setSimpleFilters(prev => ({
      ...prev,
      commentWith: prev.commentWith.includes(pill)
        ? prev.commentWith.filter(p => p !== pill)
        : [...prev.commentWith, pill],
    }));

  return (
    <div className={`flex flex-col bg-card border border-border rounded-xl shadow-sm transition-all duration-300 ${isFullscreen ? "fixed inset-4 z-50" : "h-[660px]"}`}>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
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

        {/* Buttons row — no overflow context so panels can escape */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {/* Search */}
          <button
            onClick={() => { setShowSearch(v => !v); setOpenPanel(null); }}
            className={`${BtnBase} ${showSearch ? BtnActive : ""}`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {/* Sort */}
          <button
            onClick={() => togglePanel("sort")}
            className={`${BtnBase} ${openPanel === "sort" ? BtnActive : ""}`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{sortLabel}</span>
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

        {/* ── Dropdown panels — rendered outside overflow-x-auto, anchored to toolbar ── */}

        {openPanel === "sort" && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-popover border border-border rounded-xl shadow-lg z-50 py-1">
            {(["likes", "newest", "oldest"] as SortOrder[]).map(opt => (
              <button
                key={opt}
                onClick={() => { setSortOrder(opt); setOpenPanel(null); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
              >
                <Check className={`w-3.5 h-3.5 shrink-0 ${sortOrder === opt ? "text-primary" : "opacity-0"}`} />
                {opt === "likes" ? "Top likes" : opt === "newest" ? "Newest first" : "Oldest first"}
              </button>
            ))}
          </div>
        )}

        {openPanel === "filter" && (
          <div className="absolute top-full right-0 mt-1 w-80 bg-popover border border-border rounded-xl shadow-lg z-50">
            {/* Tab bar */}
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
                  {/* Include replies toggle */}
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm font-medium text-foreground">Include replies</span>
                    <div
                      onClick={() => setSimpleFilters(p => ({ ...p, includeReplies: !p.includeReplies }))}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${simpleFilters.includeReplies ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${simpleFilters.includeReplies ? "translate-x-4" : ""}`} />
                    </div>
                  </label>

                  {/* Author search */}
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

                  {/* Comment-with pills */}
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

                  {/* Min likes slider */}
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
                /* Advanced tab */
                <>
                  {/* Match mode */}
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

                  {/* Rules */}
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

        {openPanel === "fields" && (
          <div className="absolute top-full right-0 mt-1 w-52 bg-popover border border-border rounded-xl shadow-lg z-50 py-2">
            {(
              [
                { key: "published",     label: "Published" },
                { key: "author",        label: "Author" },
                { key: "likes",         label: "Likes" },
                { key: "replies",       label: "Reply count" },
                { key: "heart",         label: "❤️ Heart" },
                { key: "pinned",        label: "📌 Pinned" },
                { key: "paid",          label: "💰 Paid" },
                { key: "authorChannel", label: "Author channel" },
              ] as { key: keyof typeof visibleFields; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleField(key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${visibleFields[key] ? "bg-primary border-primary" : "border-border"}`}>
                  {visibleFields[key] && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {label}
              </button>
            ))}
          </div>
        )}

        {openPanel === "export" && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-lg z-50">
            <div className="px-3 py-2.5 bg-secondary/50 border-b border-border rounded-t-xl">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Export what you see (filtered)</p>
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Export full data (all comments)</p>
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

      {/* ── Search Bar ───────────────────────────────────────────────────────── */}
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

      {/* ── Partial results banner ────────────────────────────────────────────── */}
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

      {/* ── Table Header ─────────────────────────────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: computedGridTemplate }}
        className="gap-4 px-4 py-3 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 pr-6"
      >
        <div />
        {visibleFields.published     && <div>Published</div>}
        {visibleFields.author        && <div>Author</div>}
        <div>Comment</div>
        {visibleFields.likes         && <div className="text-right">Likes</div>}
        {visibleFields.replies       && <div className="text-right">Replies</div>}
        {visibleFields.heart         && <div className="text-center">Heart</div>}
        {visibleFields.pinned        && <div className="text-center">Pinned</div>}
        {visibleFields.paid          && <div className="text-center">Paid</div>}
        {visibleFields.authorChannel && <div>Channel</div>}
      </div>

      {/* ── Table Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-card">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: computedGridTemplate }} className="gap-4 px-4 py-4 border-b border-border/50">
              <Skeleton className="h-4 w-4 rounded" />
              {visibleFields.published     && <Skeleton className="h-4 w-16" />}
              {visibleFields.author        && <div className="flex gap-2 items-center"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-4 w-24" /></div>}
              <Skeleton className="h-4 w-full" />
              {visibleFields.likes         && <Skeleton className="h-4 w-10 ml-auto" />}
              {visibleFields.replies       && <Skeleton className="h-4 w-8 ml-auto" />}
              {visibleFields.heart         && <Skeleton className="h-4 w-6 mx-auto" />}
              {visibleFields.pinned        && <Skeleton className="h-4 w-6 mx-auto" />}
              {visibleFields.paid          && <Skeleton className="h-4 w-6 mx-auto" />}
              {visibleFields.authorChannel && <Skeleton className="h-4 w-24" />}
            </div>
          ))
        ) : displayedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center gap-3">
            <SlidersHorizontal className="w-10 h-10 opacity-20" />
            <p className="text-sm">{searchQuery || activeFilterCount > 0 ? "No comments match your current filters." : "No comments found for this job."}</p>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="text-xs text-primary underline underline-offset-2 hover:text-primary/80">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {displayedComments.slice(0, renderLimit).map((c) => {
              const key = c.comment_id || c.id;
              const isExpanded = expandedRows.has(key);
              const initials = (c.author || "?").substring(0, 2).toUpperCase();
              return (
                <div
                  key={key}
                  style={{ display: "grid", gridTemplateColumns: computedGridTemplate }}
                  onClick={() => toggleExpand(key)}
                  className={`gap-4 px-4 py-3 border-b border-border/50 hover:bg-red-50/50 cursor-pointer transition-colors ${c.is_reply ? "bg-secondary/20" : ""}`}
                >
                  <div className="flex items-start pt-1 text-muted-foreground/40">
                    {c.is_reply && <CornerDownRight className="w-4 h-4 ml-2" />}
                  </div>
                  {visibleFields.published && (
                    <div className="text-xs text-muted-foreground pt-1 truncate">
                      {c.published_at ? formatDistanceToNow(new Date(c.published_at), { addSuffix: false }) : "N/A"}
                    </div>
                  )}
                  {visibleFields.author && (
                    <div className="flex items-start gap-2 pt-0.5 truncate pr-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: getAvatarColor(c.author) }}
                      >
                        {initials}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{c.author}</span>
                    </div>
                  )}
                  <div className="text-sm text-foreground pr-4 overflow-hidden">
                    <p className={`whitespace-pre-wrap ${!isExpanded ? "line-clamp-2" : ""}`}>{c.text}</p>
                  </div>
                  {visibleFields.likes && (
                    <div className="text-sm font-mono text-muted-foreground text-right pt-1">
                      {(c.likes ?? 0).toLocaleString()}
                    </div>
                  )}
                  {visibleFields.replies && (
                    <div className="text-sm font-mono text-muted-foreground/60 text-right pt-1">
                      {c.reply_count > 0 ? c.reply_count : "-"}
                    </div>
                  )}
                  {visibleFields.heart && (
                    <div className="text-center pt-1">
                      {c.liked_by_creator ? <span title="Hearted by creator">❤️</span> : <span className="text-muted-foreground/30 text-xs">—</span>}
                    </div>
                  )}
                  {visibleFields.pinned && (
                    <div className="text-center pt-1">
                      {c.is_pinned ? <span title="Pinned comment">📌</span> : <span className="text-muted-foreground/30 text-xs">—</span>}
                    </div>
                  )}
                  {visibleFields.paid && (
                    <div className="text-center pt-1">
                      {c.is_paid ? <span title="Paid comment">💰</span> : <span className="text-muted-foreground/30 text-xs">—</span>}
                    </div>
                  )}
                  {visibleFields.authorChannel && (
                    <div className="text-xs text-muted-foreground pt-1 truncate">
                      {c.author_channel ?? "—"}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Show more rows button */}
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
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
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
                {" "}comments loaded
              </>
          }
        </div>
      )}
    </div>
  );
}
