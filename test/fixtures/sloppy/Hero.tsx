import { Sparkles, Zap, Rocket } from 'lucide-react';

// =============================================
// HERO SECTION
// =============================================

// Hero component
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] rounded-full bg-purple-600/30 blur-3xl" />
      <span className="rounded-full border border-purple-500/40 px-3 py-1 text-xs">✨ Now with AI</span>
      <h1 className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent text-6xl">
        Supercharge your workflow
      </h1>
      <p>Trusted by 10,000+ teams worldwide. 99.9% uptime. SOC 2 Type II compliant.</p>
      <a href="#" className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-3 shadow-lg shadow-purple-500/50">
        Get Started →
      </a>
      <img src="https://i.pravatar.cc/150?img=3" className="h-10 w-10 rounded-full" />
      <p>"This changed everything." - Jane Doe, CEO at TechCorp</p>
    </section>
  );
}
