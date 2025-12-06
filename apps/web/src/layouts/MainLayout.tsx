// ===========================================
// Layout Principal avec Sidebar (US-020 à US-024)
// ===========================================

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Sidebar } from '../components/sidebar/Sidebar';
import { HelpMenu } from '../components/sidebar/HelpMenu';
import { cn } from '../lib/utils';

export function MainLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300',
          isSidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b">
          {!isSidebarCollapsed && (
            <NavLink to="/" className="font-semibold text-lg">
              CollabNotes
            </NavLink>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-8 w-8"
          >
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                isSidebarCollapsed && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Quick Links */}
          <div className="space-y-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )
              }
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {!isSidebarCollapsed && <span>Accueil</span>}
            </NavLink>

            <NavLink
              to="/search"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )
              }
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {!isSidebarCollapsed && <span>Recherche</span>}
            </NavLink>

            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )
              }
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {!isSidebarCollapsed && <span>Calendrier</span>}
            </NavLink>
          </div>

          {/* Folder Tree */}
          {!isSidebarCollapsed && (
            <div className="mt-6">
              <Sidebar />
            </div>
          )}
        </nav>

        {/* Menu Aide */}
        <div className="px-2 py-2 border-t">
          <HelpMenu isCollapsed={isSidebarCollapsed} />
        </div>

        {/* User Menu */}
        <div className="border-t p-2">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors',
                isSidebarCollapsed && 'justify-center'
              )}
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium flex-shrink-0">
                {user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?'}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">
                    {user?.displayName || user?.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </div>
                </div>
              )}
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className={cn(
                  'absolute bottom-full mb-2 w-48 rounded-md border bg-popover shadow-lg z-20',
                  isSidebarCollapsed ? 'left-0' : 'left-0'
                )}>
                  <div className="py-1">
                    {user?.role?.name === 'admin' && (
                      <NavLink
                        to="/admin"
                        className="block px-4 py-2 text-sm hover:bg-muted"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Administration
                      </NavLink>
                    )}
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        // TODO: Settings page
                        setShowUserMenu(false);
                      }}
                    >
                      Paramètres
                    </button>
                    <hr className="my-1" />
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted"
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
