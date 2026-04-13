import { Reveal } from './Reveal';

const testimonials = [
  {
    name: "Aarav Sharma",
    role: "Market Researcher",
    company: "GrowthX",
    quote: "This tool literally saves me 6 hours a week. I used to manually copy comments to gauge sentiment on competitor videos. Now it's a single click."
  },
  {
    name: "Priya Mehta",
    role: "Content Strategist",
    company: "Creator Studio",
    quote: "The ability to filter comments by 'likes' instantly shows me what the audience actually cares about. Best $19 I spend every month."
  },
  {
    name: "James T.",
    role: "Data Scientist",
    company: "Analytics Co",
    quote: "Finally, a scraper that outputs clean JSON arrays instead of messy text blobs. Integrating this into our data pipeline took less than 10 minutes."
  },
  {
    name: "Sofia R.",
    role: "E-comm Founder",
    company: "Luxe Brands",
    quote: "We use TubeVox to analyze feedback on product reviews. The Google Sheets integration means my whole team can view the data live."
  },
  {
    name: "Rahul V.",
    role: "YouTube Producer",
    company: "Media Tech",
    quote: "Extracting Q&A questions from our comments section used to be a nightmare. Now we just search for '?' and export. Brilliant."
  },
  {
    name: "Lisa K.",
    role: "Ph.D Candidate",
    company: "State University",
    quote: "I needed to scrape 50,000 comments for my thesis on digital communities. TubeVox handled it without breaking a sweat or rate limiting."
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Hear what our customers say</h2>
          <p className="text-xl text-muted-foreground">Rated 4.9/5 from 300+ happy customers</p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={(i % 3 * 100) as any} type="scale">
              <div className="bg-card p-8 rounded-2xl border border-border h-full flex flex-col">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(star => (
                    <svg key={star} className="w-5 h-5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-lg italic text-foreground mb-8 flex-grow">
                  "{t.quote}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-display">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role}, {t.company}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
