import { Link } from 'wouter';
import { Play, Twitter, Linkedin, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#0A0A0F] text-white pt-20 pb-10 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Col 1 */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">YTScraper</span>
            </div>
            <p className="text-white/60 mb-6 max-w-xs">
              The fastest way to export YouTube comments as structured data.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-bold mb-6 text-lg">Download comments</h4>
            <ul className="space-y-4">
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">YouTube video comments</Link></li>
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">YouTube Shorts comments</Link></li>
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">YouTube channel comments</Link></li>
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">Live stream comments</Link></li>
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">Bulk channel export</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-bold mb-6 text-lg">Blog</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors">How to analyze YouTube comments</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors">Best tools for YouTube research</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors">YouTube comment export guide</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors">Sentiment analysis tutorial</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-bold mb-6 text-lg">Support</h4>
            <ul className="space-y-4">
              <li><a href="#pricing" className="text-white/60 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#faq" className="text-white/60 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors">Privacy policy</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors">Terms of service</a></li>
              <li><a href="mailto:hello@ytscraper.com" className="text-white/60 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© 2025 YTScraper. All rights reserved.</p>
          <p>Made in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}
