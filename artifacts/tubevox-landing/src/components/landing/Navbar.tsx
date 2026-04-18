import { Link } from 'wouter';
import { Menu, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'glass-nav py-3' : 'bg-transparent py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Play className="w-4 h-4 text-primary fill-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">TubeVox</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo('features')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</button>
          <button onClick={() => scrollTo('how-it-works')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</button>
          <button onClick={() => scrollTo('pricing')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
          <button onClick={() => scrollTo('faq')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <a href="/dashboard" className="text-sm font-semibold hover:text-primary transition-colors">Log in</a>
          <a 
            href="/dashboard/signup" 
            className="text-sm font-bold bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            Start for free →
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border shadow-xl p-4 flex flex-col gap-4">
          <button onClick={() => scrollTo('features')} className="text-left font-medium p-2">Features</button>
          <button onClick={() => scrollTo('how-it-works')} className="text-left font-medium p-2">How it works</button>
          <button onClick={() => scrollTo('pricing')} className="text-left font-medium p-2">Pricing</button>
          <button onClick={() => scrollTo('faq')} className="text-left font-medium p-2">FAQ</button>
          <hr className="border-border" />
          <a href="/dashboard" className="font-semibold p-2">Log in</a>
          <a href="/dashboard/signup" className="w-full text-center font-bold bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-md">
            Start for free →
          </a>
        </div>
      )}
    </header>
  );
}
