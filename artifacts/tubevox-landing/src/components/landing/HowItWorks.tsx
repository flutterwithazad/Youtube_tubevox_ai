import { Reveal } from './Reveal';

const steps = [
  {
    num: "01",
    title: "Paste your URL",
    desc: "Drop in a link to any YouTube video, Short, or Channel homepage.",
    visual: (
      <div className="w-full bg-white p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-primary/20 shrink-0"></div>
        <div className="h-2 w-3/4 bg-border rounded-full"></div>
      </div>
    )
  },
  {
    num: "02",
    title: "Choose format",
    desc: "Select CSV, Excel, or JSON. Apply any filters for keywords or dates.",
    visual: (
      <div className="w-full flex gap-2">
        {['CSV', 'XLSX', 'JSON'].map(f => (
          <div key={f} className="flex-1 bg-white border border-border p-3 rounded-lg text-center font-mono text-xs font-bold text-muted-foreground shadow-sm">
            .{f}
          </div>
        ))}
      </div>
    )
  },
  {
    num: "03",
    title: "Download data",
    desc: "Get your structured dataset instantly, ready for analysis in seconds.",
    visual: (
      <div className="w-full bg-[#10B981]/10 border border-[#10B981]/20 p-4 rounded-xl flex items-center justify-center text-[#10B981] font-bold text-sm shadow-sm">
        ↓ dataset_ready.csv
      </div>
    )
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">How it works</h2>
          <p className="text-xl text-muted-foreground">Get your data in 3 simple steps.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-1/4 left-1/6 right-1/6 h-0.5 border-t-2 border-dashed border-border z-0"></div>
          
          {steps.map((step, i) => (
            <Reveal key={i} delay={(i * 200) as any} className="relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white border-4 border-card shadow-md flex items-center justify-center mb-6 relative">
                  <span className="font-display text-3xl font-black text-primary">{step.num}</span>
                  {/* Subtle red background glow */}
                  <div className="absolute inset-0 bg-primary/5 rounded-full -z-10 scale-150 blur-xl"></div>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground mb-8 min-h-[60px]">
                  {step.desc}
                </p>
                <div className="w-full max-w-[240px]">
                  {step.visual}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
