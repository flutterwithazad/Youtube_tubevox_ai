import { Link } from 'wouter';
import { Play } from 'lucide-react';
import { SocialIcon } from './SocialIcon';
import { useSiteData } from '@/hooks/useSiteData';

export function Footer() {
  const { settings, socialLinks } = useSiteData();
  const year = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: 'Features',     href: '/#features'     },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing',      href: '/#pricing'      },
    ],
    Company: [
      { label: 'About',  href: '/about' },
      { label: 'Blog',   href: '/blog'  },
    ],
    Support: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQ',        href: '/#faq'   },
      { label: 'Status',     href: '/status' },
    ],
    Legal: [
      { label: 'Privacy Policy',   href: '/privacy'  },
      { label: 'Terms of Service', href: '/terms'    },
      { label: 'Refund Policy',    href: '/refunds'  },
      { label: 'Cookie Policy',    href: '/cookies'  },
    ],
  };

  return (
    <footer className="bg-[#0A0A0F] text-white pt-20 pb-10 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Brand column — 2 cols */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">YTScraper</span>
            </Link>
            <p className="text-white/60 mb-6 max-w-xs text-sm leading-relaxed">
              Turn YouTube comments into research-ready datasets. Export to CSV, Excel, or JSON in seconds.
            </p>
            {socialLinks.length > 0 ? (
              <div className="flex items-center gap-3">
                {socialLinks.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-colors text-white/40 hover:text-white"
                  >
                    <SocialIcon iconKey={link.icon_key} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="col-span-1">
              <h4 className="font-semibold mb-5 text-xs text-white/50 uppercase tracking-widest">
                {section}
              </h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/60 hover:text-white transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© {year} {settings.company_name}. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-white/70 transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-white/70 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
