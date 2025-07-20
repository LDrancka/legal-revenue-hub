import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Wallet, 
  FileText, 
  TrendingUp, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FolderOpen,
  Users,
  Receipt,
  LogOut,
  User,
  Mail
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/"
  },
  {
    title: "Contas",
    icon: Wallet,
    href: "/accounts"
  },
  {
    title: "Lançamentos",
    icon: Receipt,
    href: "/lancamentos"
  },
  {
    title: "Casos",
    icon: FolderOpen,
    href: "/cases"
  },
  {
    title: "Transferências",
    icon: DollarSign,
    href: "/transferencias"
  },
  {
    title: "Relatórios",
    icon: FileText,
    href: "/relatorios"
  },
  {
    title: "Clientes",
    icon: Users,
    href: "/clientes"
  }
];

const adminMenuItems = [
  {
    title: "Convites",
    icon: Mail,
    href: "/convites"
  }
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();

  return (
    <aside className={cn(
      "border-r border-border bg-card transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="financial-gradient h-8 w-8 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-foreground">JurisFinance</span>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                collapsed && "px-2",
                isActive && "financial-gradient text-white"
              )}
              asChild
            >
              <Link to={item.href} className="flex items-center w-full text-inherit no-underline">
                <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            </Button>
          );
        })}

        {/* Admin-only items */}
        {isAdmin() && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-2">
                <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administração
                </div>
              </div>
            )}
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    collapsed && "px-2",
                    isActive && "financial-gradient text-white"
                  )}
                  asChild
                >
                  <Link to={item.href} className="flex items-center w-full text-inherit no-underline">
                    <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </Button>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info & Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {!collapsed && (
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        )}
        
        <Button
          variant={location.pathname === "/settings" ? "default" : "ghost"}
          className={cn(
            "w-full justify-start",
            collapsed && "px-2",
            location.pathname === "/settings" && "financial-gradient text-white"
          )}
          asChild
        >
          <Link to="/settings" className="flex items-center w-full text-inherit no-underline">
            <Settings className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && <span>Configurações</span>}
          </Link>
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
            collapsed && "px-2"
          )}
          onClick={signOut}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </aside>
  );
};