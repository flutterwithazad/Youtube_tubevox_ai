import { useState, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, Play } from 'lucide-react';
import { Reveal } from './Reveal';

export function Hero() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setLocation(`/dashboard/scrape?url=${encodeURIComponent(url)}`);
    } else {
      setLocation('/dashboard');
    }
  };

  return (
    <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left Column: Copy & CTA */}
          <div className="max-w-2xl">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-sm font-medium text-muted-foreground mb-6 shadow-sm">
                <span>🎯</span> Trusted by 2,000+ researchers & marketers
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 text-balance">
                Turn YouTube comments into a <span className="text-primary relative inline-block">
                  research-ready
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/20" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0,10 Q50,0 100,10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span> dataset in seconds.
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 text-balance leading-relaxed">
                Export comments from any YouTube video or channel. Filter by keywords, date, likes, and language. Download as CSV, Excel, or JSON — instantly.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <ul className="space-y-3 mb-10">
                {[
                  "Export comments from millions of videos in one click",
                  "Filter by 10+ data points — keywords, likes, replies, language",
                  "Export to CSV, Excel, JSON, or push to Google Sheets"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-card-foreground">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={400}>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-lg relative z-10">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Play className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="url"
                    className="block w-full pl-11 pr-4 py-4 rounded-xl border-2 border-border bg-white text-foreground placeholder:text-muted-foreground focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm outline-none"
                    placeholder="Paste a YouTube URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="whitespace-nowrap px-8 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:translate-y-0"
                >
                  START FOR FREE →
                </button>
              </form>
              <p className="mt-4 text-sm text-muted-foreground">
                Free plan includes 500 comments · No credit card required
              </p>
            </Reveal>
          </div>

          {/* Right Column: Mockup */}
          <Reveal delay={300} className="relative lg:h-[600px] flex items-center justify-center">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-[3rem] -z-10 transform rotate-3 scale-105"></div>
            
            <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col relative z-10 hover:shadow-3xl transition-shadow duration-500">
              {/* Browser Header */}
              <div className="h-12 bg-card border-b border-border flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                </div>
                <div className="mx-auto px-4 py-1 bg-white border border-border rounded-md text-xs font-mono text-muted-foreground w-1/2 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                  ytscraper.com/dashboard/video_id=dQw4w9WgXcQ
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-6 bg-white flex-grow flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-bold text-sm">Comments Export</h3>
                    <p className="text-xs text-muted-foreground">12,405 comments found</p>
                  </div>
                  <div className="px-3 py-1.5 bg-[#10B981] text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                    ↓ Export CSV
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 pb-2 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Author</div>
                  <div className="col-span-5">Comment</div>
                  <div className="col-span-2">Likes</div>
                  <div className="col-span-2">Date</div>
                </div>

                {/* Table Rows */}
                {[
                  { author: "@techreview", text: "This saved me hours of manual copy pasting...", likes: "1.2k", date: "2d ago" },
                  { author: "@marketer_pro", text: "Incredible tool for sentiment analysis.", likes: "850", date: "3d ago" },
                  { author: "@datageek", text: "Love the JSON export feature specifically.", likes: "420", date: "1w ago" },
                  { author: "@sarah.codes", text: "Can you add channel bulk export next?", likes: "310", date: "1w ago" },
                  { author: "@agencyowner", text: "Just pushed 10k comments to Google Sheets. Flawless.", likes: "89", date: "2w ago" },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 py-2.5 border-b border-card text-xs font-mono items-center group hover:bg-card/50 transition-colors rounded px-1">
                    <div className="col-span-3 font-medium text-foreground truncate">{row.author}</div>
                    <div className="col-span-5 text-muted-foreground truncate">{row.text}</div>
                    <div className="col-span-2 text-primary/80">{row.likes}</div>
                    <div className="col-span-2 text-muted-foreground">{row.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating label */}
            <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-foreground text-background px-6 py-3 rounded-xl font-display font-bold shadow-xl transform -rotate-2 border border-foreground/10 animate-bounce" style={{animationDuration: '3s'}}>
              Copy. Paste. Done.
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
