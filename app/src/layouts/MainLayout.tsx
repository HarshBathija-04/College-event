/**
 * Main Layout Component
 * Includes navigation and footer
 */

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Home, 
  LayoutDashboard, 
  User, 
  Bell, 
  Menu, 
  Sun,
  Moon,
  LogOut,
  PlusCircle,
  ClipboardList,
  Users,
  Settings,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { notificationApi } from '@/lib/api';

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch unread notification count
  useEffect(() => {
    if (isAuthenticated) {
      notificationApi.getUnreadCount()
        .then(response => {
          if (response.success && response.data) {
            setUnreadCount(response.data.count);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Home', href: '/', icon: Home, public: true },
    { label: 'Events', href: '/events', icon: Calendar, public: true },
    ...(user?.role !== 'STUDENT' ? [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, auth: true }] : []),
    { label: 'My Registrations', href: '/my-registrations', icon: ClipboardList, auth: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b glass shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black hidden sm:inline gradient-text">EventHub</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              (item.public || (item.auth && isAuthenticated)) && (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link to="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.avatar} alt={user?.firstName} />
                        <AvatarFallback>
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72">
                    <div className="flex flex-col gap-6 mt-6">
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user?.avatar} alt={user?.firstName} />
                          <AvatarFallback>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {user?.role}
                          </Badge>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <nav className="flex flex-col gap-1">
                        <Link to="/profile">
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <User className="h-4 w-4" />
                            Profile
                          </Button>
                        </Link>
                        {user?.role !== 'STUDENT' && (
                          <Link to="/dashboard">
                            <Button variant="ghost" className="w-full justify-start gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              Dashboard
                            </Button>
                          </Link>
                        )}
                        <Link to="/my-registrations">
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <ClipboardList className="h-4 w-4" />
                            My Registrations
                          </Button>
                        </Link>
                        <Link to="/notifications">
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                            {unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-auto">
                                {unreadCount}
                              </Badge>
                            )}
                          </Button>
                        </Link>

                        {/* Organizer Items */}
                        {(user?.role === 'ORGANIZER' || user?.role === 'FACULTY' || user?.role === 'ADMIN') && (
                          <>
                            <div className="my-2 border-t" />
                            <p className="text-xs font-medium text-muted-foreground px-2">Organizer</p>
                            <Link to="/events/create">
                              <Button variant="ghost" className="w-full justify-start gap-2">
                                <PlusCircle className="h-4 w-4" />
                                Create Event
                              </Button>
                            </Link>
                          </>
                        )}

                        {/* Admin Items */}
                        {user?.role === 'ADMIN' && (
                          <>
                            <div className="my-2 border-t" />
                            <p className="text-xs font-medium text-muted-foreground px-2">Admin</p>
                            <Link to="/admin">
                              <Button variant="ghost" className="w-full justify-start gap-2">
                                <Settings className="h-4 w-4" />
                                Admin Dashboard
                              </Button>
                            </Link>
                            <Link to="/admin/pending-approvals">
                              <Button variant="ghost" className="w-full justify-start gap-2">
                                <CheckSquare className="h-4 w-4" />
                                Pending Approvals
                              </Button>
                            </Link>
                            <Link to="/admin/users">
                              <Button variant="ghost" className="w-full justify-start gap-2">
                                <Users className="h-4 w-4" />
                                User Management
                              </Button>
                            </Link>
                          </>
                        )}

                        <div className="my-2 border-t" />
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-2 text-destructive"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col gap-6 mt-6">
                  <Link to="/" className="flex items-center gap-2">
                    <div className="bg-primary p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold">EventHub</span>
                  </Link>

                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                      (item.public || (item.auth && isAuthenticated)) && (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Button 
                            variant={isActive(item.href) ? 'secondary' : 'ghost'}
                            className="w-full justify-start gap-2"
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Button>
                        </Link>
                      )
                    ))}

                    {isAuthenticated && (
                      <>
                        <div className="my-2 border-t" />
                        <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <User className="h-4 w-4" />
                            Profile
                          </Button>
                        </Link>
                        <Link to="/notifications" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                          </Button>
                        </Link>
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-1.5 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">EventHub</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your one-stop platform for all college events. Discover, register, and participate in events that matter to you.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link></li>
                <li><Link to="/events" className="text-muted-foreground hover:text-foreground">Events</Link></li>
                {user?.role !== 'STUDENT' && (
                  <li><Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link></li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact Us</Link></li>
                <li><Link to="/faq" className="text-muted-foreground hover:text-foreground">FAQ</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Connect</h4>
              <p className="text-sm text-muted-foreground">
                Stay updated with the latest events and announcements.
              </p>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} EventHub - College Event Aggregator. All rights reserved.</p>
            <p className="mt-1">MCA Final Year Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}