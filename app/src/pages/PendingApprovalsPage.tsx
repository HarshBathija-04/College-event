/**
 * Pending Approvals Page
 * Admin page for approving/rejecting events
 */

import React, { useEffect, useState } from 'react';
import {   Link  } from 'react-router-dom';
import { CheckSquare, XSquare, Calendar, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi, eventApi } from '@/lib/api';
import type {  Event   } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function PendingApprovalsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      const response = await adminApi.getPendingEvents();
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch pending events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedEvent) return;
    try {
      await eventApi.approveEvent(selectedEvent.id);
      toast.success('Event approved successfully');
      setShowApproveDialog(false);
      setSelectedEvent(null);
      fetchPendingEvents();
    } catch (error) {
      toast.error('Failed to approve event');
    }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;
    try {
      await eventApi.rejectEvent(selectedEvent.id, rejectionReason);
      toast.success('Event rejected');
      setShowRejectDialog(false);
      setSelectedEvent(null);
      setRejectionReason('');
      fetchPendingEvents();
    } catch (error) {
      toast.error('Failed to reject event');
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve events submitted by organizers
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div 
                    className="w-full lg:w-48 h-32 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{ 
                      backgroundImage: event.bannerImage 
                        ? `url(${event.bannerImage})` 
                        : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' 
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.shortDescription || event.description.substring(0, 100)}...
                        </p>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.startDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {event.organizer.firstName} {event.organizer.lastName}
                      </span>
                      <Badge style={{ backgroundColor: event.category.color }}>
                        {event.category.name}
                      </Badge>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Link to={`/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        className="gap-1"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowApproveDialog(true);
                        }}
                      >
                        <CheckSquare className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="gap-1 text-destructive"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XSquare className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
          <p className="text-muted-foreground">
            All events have been reviewed. Check back later for new submissions.
          </p>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve "{selectedEvent?.title}"? 
              It will be visible to all users.
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

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject "{selectedEvent?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason (optional)</label>
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}