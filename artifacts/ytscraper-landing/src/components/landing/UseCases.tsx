import { Reveal } from './Reveal';
import { cn } from '@/lib/utils';

const surfaces = [
  { icon: "🎯", label: "VIDEO COMMENTS" },
  { icon: "🔍", label: "SHORTS COMMENTS" },
  { icon: "📢", label: "LIVE STREAM CHAT" },
  { icon: "🎙️", label: "COMMUNITY POSTS" },
  { icon: "📊", label: "CHANNEL COMMENTS" },
  { icon: "🤝", label: "COLLAB COMMENTS" },
  { icon: "📦", label: "BULK EXPORT" },
  { icon: "⏱️", label: "SCHEDULED SCRAPES" },
];

export function UseCases() {
  return (
    <section id="use-cases" className="py-24 bg-card border-y border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Built for every YouTube data workflow
          </h2>
        </Reveal>
        
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {surfaces.map((item, i) => (
            <Reveal key={i} delay={((i % 4) * 100) as any} type="scale">
              <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-border text-sm font-bold shadow-sm hover:border-primary hover:text-primary hover:shadow-md cursor-default transition-all duration-300 hover:-translate-y-1">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
