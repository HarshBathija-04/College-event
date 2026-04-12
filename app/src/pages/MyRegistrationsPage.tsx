/**
 * My Registrations Page
 * Shows all user's event registrations
 */

import React, { useEffect, useState } from 'react';
import {   Link  } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { registrationApi } from '@/lib/api';
import type {  Registration   } from '@/types';
import { toast } from 'sonner';

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await registrationApi.getMyRegistrations();
      if (response.success && response.data) {
        setRegistrations(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const upcoming = registrations.filter(r => new Date(r.event.startDate) > new Date() && r.status !== 'CANCELLED');
  const past = registrations.filter(r => new Date(r.event.endDate) < new Date());
  const cancelled = registrations.filter(r => r.status === 'CANCELLED');

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
        <p className="text-muted-foreground">
          Manage your event registrations and track attendance
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
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length > 0 ? (
              upcoming.map((registration) => (
                <Link key={registration.id} to={`/events/${registration.event.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{registration.event.title}</h3>
                            <Badge variant={registration.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                              {getStatusIcon(registration.status)}
                              <span className="ml-1">{registration.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(registration.event.startDate).toLocaleDateString()}
                            </span>
                            <span>{registration.event.venue}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming registrations</p>
                <Link to="/events">
                  <Button variant="outline" className="mt-4">
                    Browse Events
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length > 0 ? (
              past.map((registration) => (
                <Link key={registration.id} to={`/events/${registration.event.id}`}>
                  <Card className="hover:shadow-md transition-shadow opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{registration.event.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{new Date(registration.event.startDate).toLocaleDateString()}</span>
                            {registration.attended && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Attended
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No past events</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelled.length > 0 ? (
              cancelled.map((registration) => (
                <Card key={registration.id} className="opacity-50">
                  <CardContent className="p-6">
                    <h3 className="font-semibold">{registration.event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Cancelled on {new Date(registration.updatedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No cancelled registrations</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}