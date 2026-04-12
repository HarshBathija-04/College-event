/**
 * Event Detail Page
 * Shows full event information and registration
 */

import React, { useEffect, useState } from 'react';
import {   useParams, Link, useNavigate  } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ArrowLeft, 
  Share2, 
  CheckCircle2,
  Edit,
  Trash2,
  CheckSquare,
  XSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { eventApi, registrationApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type {  Event   } from '@/types';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    setIsLoading(true);
    try {
      const response = await eventApi.getEvent(id!);
      if (response.success && response.data) {
        setEvent(response.data.event);
      }
    } catch (error) {
      toast.error('Failed to fetch event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to register');
      navigate('/login');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await registrationApi.register(id!);
      if (response.success) {
        toast.success('Successfully registered for the event!');
        fetchEvent();
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async () => {
    try {
      await eventApi.deleteEvent(id!);
      toast.success('Event deleted successfully');
      navigate('/events');
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const handleApprove = async () => {
    try {
      await eventApi.approveEvent(id!);
      toast.success('Event approved successfully');
      setShowApproveDialog(false);
      fetchEvent();
    } catch (error) {
      toast.error('Failed to approve event');
    }
  };

  const handleReject = async () => {
    try {
      await eventApi.rejectEvent(id!, 'Event does not meet guidelines');
      toast.success('Event rejected');
      fetchEvent();
    } catch (error) {
      toast.error('Failed to reject event');
    }
  };

  const isOrganizer = user?.id === event?.organizer.id;
  const isAdmin = user?.role === 'ADMIN';
  const isFaculty = user?.role === 'FACULTY';
  const canManage = isOrganizer || isAdmin;
  const canApprove = isAdmin || isFaculty;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/events">
          <Button>Browse Events</Button>
        </Link>
      </div>
    );
  }

  const isPast = new Date(event.endDate) < new Date();
  const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;
  const canRegister = isAuthenticated && 
    event.status === 'APPROVED' && 
    !isPast && 
    !isFull && 
    !event.isRegistered;

  return (
    <div className="container py-8">
      {/* Back Button */}
      <Link to="/events">
        <Button variant="ghost" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
      </Link>

      {/* Banner */}
      <div 
        className="h-64 lg:h-96 rounded-xl bg-cover bg-center relative mb-8"
        style={{ 
          backgroundImage: event.bannerImage 
            ? `url(${event.bannerImage})` 
            : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge 
              style={{ backgroundColor: event.category.color }}
              className="text-white"
            >
              {event.category.name}
            </Badge>
            <Badge variant="secondary">{event.type}</Badge>
            {event.isOnline && <Badge variant="secondary">Online</Badge>}
            <Badge 
              variant={event.status === 'APPROVED' ? 'default' : 'secondary'}
            >
              {event.status.replace('_', ' ')}
            </Badge>
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2">
            {event.title}
          </h1>
          <p className="text-white/80 max-w-2xl">
            {event.shortDescription}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{event.description}</p>
            </CardContent>
          </Card>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Organizer */}
          <Card>
            <CardHeader>
              <CardTitle>Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={event.organizer.avatar} />
                  <AvatarFallback>
                    {event.organizer.firstName[0]}{event.organizer.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {event.organizer.firstName} {event.organizer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">Event Organizer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.startDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.startDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' - '}
                    {new Date(event.endDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{event.venue}</p>
                  {event.isOnline && event.onlineLink && (
                    <a 
                      href={event.onlineLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Join Online
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Participants</p>
                  <p className="text-sm text-muted-foreground">
                    {event.currentParticipants}
                    {event.maxParticipants && ` / ${event.maxParticipants}`} registered
                  </p>
                </div>
              </div>

              <Separator />

              {/* Registration Button */}
              {canRegister ? (
                <Button 
                  className="w-full gap-2"
                  onClick={handleRegister}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Register Now
                    </>
                  )}
                </Button>
              ) : event.isRegistered ? (
                <Button className="w-full gap-2" variant="outline" disabled>
                  <CheckCircle2 className="h-4 w-4" />
                  Already Registered
                </Button>
              ) : isFull ? (
                <Button className="w-full" variant="outline" disabled>
                  Event Full
                </Button>
              ) : isPast ? (
                <Button className="w-full" variant="outline" disabled>
                  Event Ended
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Login to Register
                </Button>
              )}

              {/* Share Button */}
              <Button variant="outline" className="w-full gap-2">
                <Share2 className="h-4 w-4" />
                Share Event
              </Button>
            </CardContent>
          </Card>

          {/* Organizer/Admin Actions */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={`/events/${event.id}/edit`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Event
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval Actions */}
          {canApprove && event.status === 'PENDING_APPROVAL' && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full gap-2"
                  onClick={() => setShowApproveDialog(true)}
                >
                  <CheckSquare className="h-4 w-4" />
                  Approve Event
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 text-destructive"
                  onClick={handleReject}
                >
                  <XSquare className="h-4 w-4" />
                  Reject Event
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this event? It will be visible to all users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}