import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { extractVideoId } from "@/lib/utils/youtube";
import { toast } from "sonner";
import { Settings, ArrowRight, Loader2, StopCircle } from "lucide-react";
import { CommentExplorer } from "@/components/dashboard/CommentExplorer";

type ScrapeState = 'input' | 'progress' | 'completed';

export default function Scrape() {
  const [state, setState] = useState<ScrapeState>('input');
  const [url, setUrl] = useState("");
  const [amount, setAmount] = useState(1000);
  const [showOptions, setShowOptions] = useState(false);
  const balance = 1240; // Mock balance
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Auto-show options when valid URL pasted
  useEffect(() => {
    if (extractVideoId(url)) {
      setShowOptions(true);
    } else {
      setShowOptions(false);
    }
  }, [url]);

  // Mock progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'progress') {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setState('completed');
            toast.success(`✓ ${amount.toLocaleString()} comments scraped successfully!`);
            return 100;
          }
          return p + Math.floor(Math.random() * 15);
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [state, amount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(url);
    if (!videoId) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    
    const cost = Math.ceil(amount / 1000);
    if (balance < cost) {
      toast.error("Insufficient credits for this job.");
      return;
    }

    // Start job mock
    setActiveJobId(`job_${Date.now()}`);
    setProgress(0);
    setState('progress');
    toast.success("Scrape job started!");
  };

  const handleCancel = () => {
    setState('input');
    setActiveJobId(null);
    setProgress(0);
    toast.info('Job cancelled. Credits refunded.');
  };

  const cost = Math.ceil(amount / 1000);
  const afterBalance = balance - cost;

  return (
    <DashboardShell title="New Scrape">
      <div className="max-w-3xl mx-auto mt-4 sm:mt-10">
        
        {state === 'input' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground tracking-tight mb-3">Scrape YouTube Comments</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">Paste any YouTube video URL and export comments as a structured dataset instantly.</p>
            </div>

            <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border overflow-hidden">
              <form onSubmit={handleSubmit} className="p-2">
                <div className="flex flex-col sm:flex-row gap-2 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none hidden sm:block">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21.582 6.186a2.605 2.605 0 0 0-1.838-1.838C18.122 4 12 4 12 4s-6.122 0-7.744.348a2.605 2.605 0 0 0-1.838 1.838C2 7.808 2 12 2 12s0 4.192.348 5.814a2.605 2.605 0 0 0 1.838 1.838C5.878 20 12 20 12 20s6.122 0 7.744-.348a2.605 2.605 0 0 0 1.838-1.838C22 16.192 22 12 22 12s0-4.192-.348-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 bg-background border-none text-foreground px-4 sm:pl-12 py-4 rounded-xl focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:font-normal placeholder:text-muted-foreground outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 shrink-0 hover:translate-y-[-1px] active:translate-y-0 group"
                  >
                    Scrape Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>

              {showOptions && (
                <div className="border-t border-border bg-secondary/30 p-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <label className="block font-bold text-foreground mb-1">Target amount</label>
                        <p className="text-sm text-muted-foreground">How many comments do you need?</p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xl font-bold text-foreground">{amount.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <input 
                      type="range" 
                      min="500" max="50000" step="500" 
                      value={amount} 
                      onChange={(e) => setAmount(parseInt(e.target.value))}
                      className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    
                    <div className="flex justify-between mt-3 text-sm">
                      <div className="text-muted-foreground">Cost: <span className="font-mono font-medium text-foreground">{cost} credits</span></div>
                      <div className={afterBalance >= 0 ? "text-success font-medium" : "text-destructive font-bold"}>
                        Balance after: <span className="font-mono">{afterBalance}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Settings className="w-4 h-4" />
                      Advanced options (Coming soon)
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/20 flex items-center justify-center"><span className="w-1 h-1 rounded-full bg-primary"></span></span>
              You have <span className="font-mono font-medium text-foreground">{balance.toLocaleString()}</span> credits available
            </div>
          </div>
        )}

        {state === 'progress' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl shadow-xl border border-border p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary">
                <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive animate-pulse"></span>
                Scraping in progress...
              </h2>
              <p className="text-muted-foreground mb-8 truncate px-4">
                Fetching comments from: <span className="font-medium text-foreground">{url}</span>
              </p>

              <div className="bg-secondary/50 rounded-xl p-6 mb-8 text-left">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-medium text-foreground">Progress</span>
                  <span className="font-mono font-bold text-primary text-xl">{progress}%</span>
                </div>
                <div className="w-full h-3 bg-border rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>~{Math.floor((amount * progress) / 100).toLocaleString()} of {amount.toLocaleString()} comments</span>
                  <span>Credits reserved: {Math.ceil(amount/1000)}</span>
                </div>
              </div>

              <button 
                onClick={handleCancel}
                className="text-muted-foreground hover:text-destructive text-sm font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Cancel Job
              </button>
            </div>
          </div>
        )}
      </div>

      {state === 'completed' && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground text-sm truncate">Scrape Completed Successfully</h4>
                <p className="text-xs text-muted-foreground truncate">{amount.toLocaleString()} comments fetched · Used {cost} credits</p>
              </div>
            </div>
            <button 
              onClick={() => { setState('input'); setUrl(''); setAmount(1000); }}
              className="bg-background border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors shrink-0"
            >
              Start New Scrape
            </button>
          </div>

          <CommentExplorer 
            jobId={activeJobId || "mock"} 
            videoTitle="Sample YouTube Video Title for Demo" 
            totalCount={amount} 
          />
        </div>
      )}
    </DashboardShell>
  );
}
