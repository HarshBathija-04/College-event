/**
 * Dashboard Page
 * Main dashboard for organizers and faculty
 */

import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  Bell,
  ArrowRight,
  PlusCircle,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi, notificationApi } from '@/lib/api';
import type {  OrganizerDashboard, Notification   } from '@/types';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const [organizerData, setOrganizerData] = useState<OrganizerDashboard | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'STUDENT') {
    return <Navigate to="/my-registrations" replace />;
  }

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardApi.getOrganizerDashboard();
      if (response.success && response.data) {
        setOrganizerData(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationApi.getNotifications(undefined, 1, 5);
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'FACULTY';

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your events
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {isOrganizer && organizerData && (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Events</p>
                      <p className="text-3xl font-bold">{organizerData.stats.totalEvents}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Approval</p>
                      <p className="text-3xl font-bold">{organizerData.stats.pendingEvents}</p>
                    </div>
                    <div className="bg-yellow-500/10 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Registrations</p>
                      <p className="text-3xl font-bold">{organizerData.stats.totalRegistrations}</p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-lg">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <p className="text-3xl font-bold">{organizerData.stats.attendanceRate}%</p>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {isOrganizer && organizerData && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Your Events</h2>
                    <Link to="/events/create">
                      <Button size="sm" className="gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Create Event
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {organizerData.upcomingEvents.length > 0 ? (
                      organizerData.upcomingEvents.map((event) => (
                        <Link key={event.id} to={`/events/${event.id}`}>
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div 
                                  className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                                  style={{ 
                                    backgroundImage: event.bannerImage 
                                      ? `url(${event.bannerImage})` 
                                      : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' 
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold truncate">{event.title}</h3>
                                    <Badge variant={event.status === 'APPROVED' ? 'default' : 'secondary'}>
                                      {event.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(event.startDate).toLocaleDateString()}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-4 w-4" />
                                      {event.currentParticipants} registered
                                    </span>
                                  </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No upcoming events</p>
                        <Link to="/events/create">
                          <Button variant="outline" className="mt-4">
                            Create Your First Event
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to="/events">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Calendar className="h-4 w-4" />
                      Browse Events
                    </Button>
                  </Link>
                  <Link to="/my-registrations">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <ClipboardList className="h-4 w-4" />
                      My Registrations
                    </Button>
                  </Link>
                  {(isOrganizer || user?.role === 'ADMIN') && (
                    <Link to="/events/create">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Create Event
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* Recent Notifications */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Notifications</CardTitle>
                  <Link to="/notifications">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 rounded-lg ${notification.isRead ? 'bg-muted' : 'bg-primary/5'}`}
                      >
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No notifications yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}