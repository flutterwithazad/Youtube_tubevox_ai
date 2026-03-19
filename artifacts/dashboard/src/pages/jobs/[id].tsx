import { useRoute } from "wouter";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CommentExplorer } from "@/components/dashboard/CommentExplorer";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Clock, Database, Zap, CheckCircle2 } from "lucide-react";

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = params?.id || "mock";

  return (
    <DashboardShell title={`Job #${jobId}`}>
      <div className="mb-6">
        <Link href="/jobs">
          <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </button>
        </Link>
        
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-12 bg-muted rounded-lg shrink-0 border border-border mt-1"></div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> 2 hours ago</span>
              </div>
              <h2 className="text-lg font-display font-bold text-foreground">Why I left my $500k job</h2>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="text-muted-foreground">TechLead</span>
                <a href="#" className="text-primary hover:underline flex items-center gap-1 text-xs font-medium">
                  View on YouTube <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-x-8 gap-y-3 p-4 md:p-0 bg-secondary/50 md:bg-transparent rounded-lg border border-border md:border-none">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1"><Database className="w-3 h-3" /> Extracted</span>
              <span className="font-mono font-bold text-foreground">2,450 <span className="text-xs text-muted-foreground font-sans font-normal">/ 2,500</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1"><Zap className="w-3 h-3" /> Cost</span>
              <span className="font-mono font-bold text-primary">3 <span className="text-xs text-muted-foreground font-sans font-normal">credits</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1"><Clock className="w-3 h-3" /> Duration</span>
              <span className="font-mono font-bold text-foreground">42s</span>
            </div>
          </div>
        </div>
      </div>

      <CommentExplorer 
        jobId={jobId} 
        videoTitle="Why I left my $500k job" 
        totalCount={2450} 
      />
    </DashboardShell>
  );
}
