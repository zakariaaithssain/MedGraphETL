import { LayoutDashboard, Circle, GitBranch, Database, Menu } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { HealthIndicator } from './HealthIndicator';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  { title: 'Overview', path: '/', icon: LayoutDashboard },
  { title: 'Nodes', path: '/nodes', icon: Circle },
  { title: 'Relationships', path: '/relationships', icon: GitBranch },
];

export const AppSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-card border-b px-4 h-14">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <span className="font-semibold">MedGraphETL</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
        "lg:translate-x-0",
        collapsed ? "w-16" : "w-64",
        "max-lg:translate-x-[-100%]",
        collapsed && "max-lg:translate-x-0 max-lg:w-64"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 border-b px-4 h-14">
          <Database className="h-6 w-6 text-primary flex-shrink-0" />
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-semibold text-foreground">MedGraphETL</h1>
              <p className="text-[10px] text-muted-foreground">Graph Explorer</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
                onClick={() => window.innerWidth < 1024 && setCollapsed(false)}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <HealthIndicator compact />
          </div>
        )}

        {/* Collapse Toggle (Desktop) */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 -right-3 h-6 w-6 rounded-full border bg-card shadow-sm hidden lg:flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-3 w-3" />
        </Button>
      </aside>

      {/* Mobile Overlay */}
      {collapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setCollapsed(false)}
        />
      )}
    </>
  );
};
