import { DownloadCloud, Layers, Database, Zap, Search, Code2 } from 'lucide-react';
import { Reveal } from './Reveal';

const features = [
  {
    icon: <DownloadCloud className="w-6 h-6 text-primary" />,
    title: "Versatile export options",
    description: "Download data exactly how you need it: raw CSV, formatted Excel, or developer-ready JSON arrays."
  },
  {
    icon: <Layers className="w-6 h-6 text-primary" />,
    title: "Bulk channel downloads",
    description: "Don't stop at one video. Paste a channel URL and export comments across their entire video library."
  },
  {
    icon: <Database className="w-6 h-6 text-primary" />,
    title: "Google Sheets sync",
    description: "Push datasets directly into your Google Sheets workspace with one click. No downloading required."
  },
  {
    icon: <Code2 className="w-6 h-6 text-primary" />,
    title: "No code required",
    description: "A clean, intuitive interface designed for researchers and marketers, not just developers."
  },
  {
    icon: <Zap className="w-6 h-6 text-primary" />,
    title: "Time-efficient scraping",
    description: "Our distributed infrastructure pulls thousands of comments per second, bypassing rate limits automatically."
  },
  {
    icon: <Search className="w-6 h-6 text-primary" />,
    title: "Advanced filtering",
    description: "Search within comments, filter by minimum likes, date ranges, or restrict to specific languages."
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything you need to work<br className="hidden md:block"/> with YouTube comments
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop manually copying text. Start analyzing data. We handle the complex extraction so you can focus on insights.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <Reveal key={i} delay={(i % 3) * 100 as any}>
              <div className="group bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden h-full">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
