import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { FolderOpen, CheckSquare, Calendar, User, LogOut, Sparkles, Tag } from "lucide-react";
import logoSymbol from "@assets/ChatGPT Image 8 ott 2025, 11_45_12_1759921521136.png";

// Main navigation
const getDefaultNavigation = (t: any) => [
  { id: "t1", name: t("nav.interestAreas"), href: "/interest-areas", icon: Tag, testId: "nav-interest-areas" },
  { id: "t0", name: "Mappa del Tempo", href: "/time-planner", icon: Calendar, testId: "nav-time-planner" },
  { id: "1", name: t("nav.projects"), href: "/projects", icon: FolderOpen, testId: "nav-projects" },
  { id: "2", name: t("nav.tasks"), href: "/tasks", icon: CheckSquare, testId: "nav-tasks" },
  { id: "5", name: t("nav.proposals"), href: "/proposals", icon: Sparkles, testId: "nav-proposals" },
];

// Simple Navigation Item Component
function NavItem({ item, isActive }: { item: any; isActive: boolean }) {
  const [, setLocation] = useLocation();
  const Icon = item.icon;

  return (
    <div 
      className="w-full p-2 rounded-md group flex items-center cursor-pointer transition-all sidebar-nav-item"
      data-testid={item.testId}
      onClick={() => setLocation(item.href)}
    >
      <div 
        className="flex items-center px-4 py-3 rounded-lg nav-box transition-all flex-1 group-hover:bg-[#D4A574]" 
        style={{ 
          backgroundColor: isActive ? 'hsl(160, 15%, 55%, 0.3)' : 'hsl(160, 15%, 55%, 0.1)', 
          border: '1px solid hsl(160, 15%, 55%, 0.2)', 
          minWidth: '260px', 
          maxWidth: '260px' 
        }}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-md mr-3 flex-shrink-0 transition-all" style={{ backgroundColor: '#D4A574' }}>
          <Icon className="h-5 w-5 text-white transition-all group-hover:text-green-600" />
        </div>
        <span className="text-base font-medium flex-1 text-muted-foreground">{item.name}</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t } = useTranslation();
  const navigation = getDefaultNavigation(t);

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col">
      {/* Logo and Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-center">
          <img
            src={logoSymbol}
            alt="Mentore"
            className="w-full h-auto object-contain"
            style={{ mixBlendMode: 'multiply' }}
            data-testid="img-app-logo"
          />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Main Navigation */}
        {navigation.map((item: any) => {
          const isActive = location === item.href;
          return (
            <NavItem key={item.id} item={item} isActive={isActive} />
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent transition-colors">
          <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logoutMutation.mutate()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
