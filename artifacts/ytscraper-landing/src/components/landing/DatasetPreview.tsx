import { Reveal } from './Reveal';
import { Download } from 'lucide-react';
import { Link } from 'wouter';

const sampleData = [
  { id: 1, author: "JohnDoe99", text: "This tutorial completely changed how I approach React hooks. The explanation of useEffect dependencies was exactly what I needed to hear.", likes: 452, replies: 12, date: "2024-05-12", sentiment: "Positive", isReply: "No" },
  { id: 2, author: "TechMaster_X", text: "Audio quality is a bit low around the 4:20 mark, otherwise great content.", likes: 89, replies: 3, date: "2024-05-13", sentiment: "Neutral", isReply: "No" },
  { id: 3, author: "SaraCodes", text: "I've been stuck on this bug for 3 days and your 10 minute video solved it. Thank you so much!!!", likes: 1205, replies: 45, date: "2024-05-15", sentiment: "Positive", isReply: "No" },
  { id: 4, author: "DevNewb", text: "Wait, so is useState async or synchronous? I'm still confused about the batching.", likes: 34, replies: 8, date: "2024-05-16", sentiment: "Neutral", isReply: "No" },
  { id: 5, author: "ReactPro", text: "Actually, this method is outdated in React 19. You should be using the use() hook for promises now.", likes: 56, replies: 21, date: "2024-05-18", sentiment: "Negative", isReply: "No" },
  { id: 6, author: "JohnDoe99", text: "Oh wow, I didn't know about the use() hook. Do you have a link to the docs for that?", likes: 12, replies: 1, date: "2024-05-18", sentiment: "Neutral", isReply: "Yes" },
];

export function DatasetPreview() {
  return (
    <section id="dataset" className="py-24 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Dataset preview</h2>
          <p className="text-xl text-muted-foreground">Clean, structured, and ready for your favorite spreadsheet or database.</p>
        </Reveal>

        <Reveal delay={200} className="w-full overflow-x-auto rounded-2xl border border-border shadow-xl bg-white mb-8">
          <div className="min-w-[1000px]">
            {/* Table Header */}
            <div className="bg-card border-b border-border px-6 py-4 grid grid-cols-12 gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0">
              <div className="col-span-2">Author</div>
              <div className="col-span-5">Comment Text</div>
              <div className="col-span-1 text-right">Likes</div>
              <div className="col-span-1 text-right">Replies</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1">Sentiment</div>
              <div className="col-span-1">Is Reply</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-card font-mono text-sm">
              {sampleData.map((row, i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 hover:bg-card/30 transition-colors items-center">
                  <div className="col-span-2 font-medium text-foreground truncate" title={row.author}>@{row.author}</div>
                  <div className="col-span-5 text-muted-foreground truncate" title={row.text}>{row.text}</div>
                  <div className="col-span-1 text-right">{row.likes}</div>
                  <div className="col-span-1 text-right">{row.replies}</div>
                  <div className="col-span-1 text-muted-foreground">{row.date}</div>
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-md text-xs font-sans font-bold
                      ${row.sentiment === 'Positive' ? 'bg-[#10B981]/10 text-[#10B981]' : 
                        row.sentiment === 'Negative' ? 'bg-primary/10 text-primary' : 
                        'bg-gray-100 text-gray-600'}`}
                    >
                      {row.sentiment}
                    </span>
                  </div>
                  <div className="col-span-1 text-muted-foreground">{row.isReply}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={300} className="flex justify-center">
          <a href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-white border-2 border-border hover:border-foreground hover:bg-card text-foreground transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Download Sample Dataset
          </a>
        </Reveal>
      </div>
    </section>
  );
}
