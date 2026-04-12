import { Navbar } from './Navbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main className="flex-grow flex flex-col relative z-10 w-full">
        {children}
      </main>
    </div>
  );
}
