import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { HealthIndicator } from './HealthIndicator';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      
      {/* Main Content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 transition-all">
        {/* Top Bar */}
        <header className="hidden lg:flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-6 h-14 sticky top-0 z-20">
          <div />
          <HealthIndicator />
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
