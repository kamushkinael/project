import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Sun, Moon, LogOut, Calendar, LayoutDashboard, FileText, Users } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Главная', icon: LayoutDashboard, roles: ['employee', 'manager', 'hr'] },
    { path: '/calendar', label: 'Календарь', icon: Calendar, roles: ['employee', 'manager', 'hr'] },
    { path: '/requests', label: 'Заявки', icon: FileText, roles: ['manager', 'hr'] },
    { path: '/hr', label: 'HR', icon: Users, roles: ['hr'] },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-foreground">
                VacationFlow
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = window.location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="gap-2"
                    data-testid={`nav-${item.path.slice(1)}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden flex-col items-end md:flex">
                <span className="font-mono text-sm font-medium text-foreground" data-testid="user-name">
                  {user?.full_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.role === 'hr' ? 'HR' : user?.role === 'manager' ? 'Руководитель' : 'Сотрудник'}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="theme-toggle-btn"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
