import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface PageLayoutProps {
  children: React.ReactNode;
  lightBg?: boolean;
}

export function PageLayout({ children, lightBg = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 pt-16 ${lightBg ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
