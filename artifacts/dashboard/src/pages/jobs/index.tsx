import { DashboardShell } from "@/components/layout/DashboardShell";
import { Link } from "wouter";
import { Plus, ChevronRight, FileText, Activity, AlertCircle, Clock, Zap, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function JobsList() {
  // Mock data
  const jobs = [
    { id: '1', title: 'Why I left my $500k job', channel: 'TechLead', status: 'completed', downloaded: 2450, requested: 2500, credits: 3, date: new Date(Date.now() - 3600000) },
    { id: '2', title: 'Apple Vision Pro Review', channel: 'MKBHD', status: 'running', progress: 68, downloaded: 1540, requested: 5000, credits: 5, date: new Date() },
    { id: '3', title: 'Building a SaaS in 24 hours', channel: 'DevDaily', status: 'failed', downloaded: 0, requested: 1000, credits: 0, date: new Date(Date.now() - 86400000), error: 'Video is private' },
    { id: '4', title: 'React 19 Changes Explained', channel: 'CodeStack', status: 'completed', downloaded: 890, requested: 1000, credits: 1, date: new Date(Date.now() - 172800000) },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20"><div className="w-1.5 h-1.5 rounded-full bg-success"></div> Completed</span>;
      case 'running': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div> Running</span>;
      case 'failed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default: return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-muted-foreground border border-border">Queued</span>;
    }
  };

  return (
    <DashboardShell title="My Jobs">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Scrape History</h2>
          <p className="text-muted-foreground mt-1">View and manage your past comment exports.</p>
        </div>
        <Link href="/scrape">
          <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-primary/20 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Scrape</span>
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Activity className="w-4 h-4" />
            <span className="font-medium text-sm">Total Jobs</span>
          </div>
          <div className="text-3xl font-display font-bold text-foreground">24</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <FileText className="w-4 h-4" />
            <span className="font-medium text-sm">Comments Scraped</span>
          </div>
          <div className="text-3xl font-display font-bold text-foreground text-success">142.5k</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Zap className="w-4 h-4" />
            <span className="font-medium text-sm">Credits Spent</span>
          </div>
          <div className="text-3xl font-display font-bold text-foreground text-primary font-mono">148</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Target Video</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Comments</th>
                <th className="px-6 py-4">Credits</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-secondary/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-muted rounded shrink-0 overflow-hidden flex items-center justify-center relative">
                        {/* Placeholder for thumbnail */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent z-10"></div>
                        <Play className="w-3 h-3 text-white/80 z-20 absolute" />
                      </div>
                      <div className="min-w-0 max-w-[250px]">
                        <p className="font-medium text-foreground truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.channel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {getStatusBadge(job.status)}
                      {job.status === 'running' && (
                        <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                        </div>
                      )}
                      {job.status === 'failed' && (
                        <p className="text-[10px] text-destructive truncate max-w-[120px]">{job.error}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-foreground font-medium">{job.downloaded.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">of {job.requested.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">
                    {job.credits}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(job.date, { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {job.status === 'completed' && (
                      <Link href={`/jobs/${job.id}`}>
                        <button className="text-primary font-medium text-xs hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100">
                          View
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    )}
                    {job.status === 'running' && (
                      <button className="text-muted-foreground hover:text-destructive font-medium text-xs px-3 py-1.5 rounded-md transition-colors">
                        Cancel
                      </button>
                    )}
                    {job.status === 'failed' && (
                      <button className="text-foreground hover:bg-secondary font-medium text-xs px-3 py-1.5 border border-border rounded-md transition-colors">
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
