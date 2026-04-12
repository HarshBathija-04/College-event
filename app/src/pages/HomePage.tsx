/**
 * Home Page
 * Landing page for the College Event Aggregator - Modern Redesign
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Bell, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Search,
  TrendingUp,
  Zap,
  Shield,
  Star,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { eventApi } from '@/lib/api';
import type { Event } from '@/types';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsResponse = await eventApi.getEvents({ isUpcoming: true, limit: 3 });
        if (eventsResponse.success && eventsResponse.data) {
          setFeaturedEvents(eventsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const features = [
    {
      icon: Search,
      title: 'Smart Discovery',
      description: 'Find events instantly with AI-powered search and intelligent filters tailored to your interests.',
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      icon: Sparkles,
      title: 'AI Recommendations',
      description: 'Get personalized event picks based on your history, interests, and engagement patterns.',
      color: 'from-fuchsia-500 to-pink-600',
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Never miss a deadline with intelligent alerts that learn how and when you prefer to be notified.',
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      icon: Users,
      title: 'Easy Registration',
      description: 'Register for events in one click. Track attendance, get QR passes, and manage your schedule.',
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
  ];

  const stats = [
    { label: 'Active Events', value: '500+', icon: Calendar },
    { label: 'Students', value: '10K+', icon: Users },
    { label: 'Registrations', value: '50K+', icon: TrendingUp },
    { label: 'Categories', value: '15+', icon: Zap },
  ];

  const typeColors: Record<string, string> = {
    ACADEMIC: 'from-blue-500 to-indigo-600',
    CULTURAL: 'from-fuchsia-500 to-pink-600',
    SPORTS: 'from-emerald-500 to-teal-600',
    TECHNICAL: 'from-violet-500 to-purple-600',
    WORKSHOP: 'from-orange-500 to-amber-600',
    SEMINAR: 'from-cyan-500 to-blue-600',
    COMPETITION: 'from-red-500 to-rose-600',
    SOCIAL: 'from-yellow-500 to-orange-500',
    OTHER: 'from-slate-500 to-gray-600',
  };

  return (
    <div className="flex flex-col overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background */}
        <div className="absolute inset-0 hero-gradient opacity-10 dark:opacity-20" />
        <div className="absolute inset-0 dot-pattern" />
        {/* Blobs */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-400/20 dark:bg-indigo-600/20 blur-3xl" />

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-pulse-glow">
                <Sparkles className="h-4 w-4" />
                AI-Powered Event Platform
              </div>

              <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight">
                One Platform
                <br />
                for All{' '}
                <span className="gradient-text">College</span>
                <br />
                Events
              </h1>

              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                Discover, register, and never miss an event again. 
                Powered by AI that learns your interests and delivers personalized recommendations.
              </p>

              <div className="flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link to="/events">
                    <Button size="lg" className="gap-2 rounded-xl px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                      <Search className="h-5 w-5" />
                      Browse Events
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" className="gap-2 rounded-xl px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                        Get Started Free
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/events">
                      <Button size="lg" variant="outline" className="gap-2 rounded-xl px-8 hover:-translate-y-0.5 transition-all">
                        Explore Events
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                {['Free Registration', 'AI Recommendations', 'Smart Notifications'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Floating Cards */}
            <div className="relative hidden lg:block h-[520px]">
              {/* Main card */}
              <div className="absolute top-0 right-0 w-80 glass rounded-2xl p-6 shadow-2xl animate-float">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Tech Symposium 2024</p>
                    <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full mb-2">
                  <div className="h-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full w-3/4" />
                </div>
                <p className="text-xs text-muted-foreground">74 of 100 seats filled</p>
                <Button size="sm" className="w-full mt-4 rounded-lg">Register Now</Button>
              </div>

              {/* AI badge */}
              <div className="absolute top-40 -left-4 glass rounded-2xl p-4 shadow-xl" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-fuchsia-500" />
                  <div>
                    <p className="text-xs font-semibold">AI Match</p>
                    <p className="text-lg font-bold gradient-text">94%</p>
                  </div>
                </div>
              </div>

              {/* Stats card */}
              <div className="absolute bottom-16 right-8 glass rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black">50K+</p>
                    <p className="text-xs text-muted-foreground">Registrations</p>
                  </div>
                </div>
              </div>

              {/* Notification */}
              <div className="absolute bottom-0 left-4 glass rounded-2xl p-4 shadow-xl w-64">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">New event recommended!</p>
                    <p className="text-xs text-muted-foreground">Cultural Fest deadline: 2 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-16 relative">
        <div className="absolute inset-0 hero-gradient opacity-5" />
        <div className="container relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors mx-auto">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-4xl font-black gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="mb-4" variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              Why EventHub?
            </Badge>
            <h2 className="text-4xl font-black mb-4 tracking-tight">
              Everything you need,{' '}
              <span className="gradient-text">nothing you don't</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              A modern platform built specifically for the college ecosystem with AI at its core.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`${feature.bg} rounded-2xl p-6 card-hover border border-border/50 group cursor-pointer`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                <div className="flex items-center gap-1 mt-4 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UPCOMING EVENTS ── */}
      <section className="py-24">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <Badge className="mb-3" variant="secondary">
                <Calendar className="h-3 w-3 mr-1" />
                Don't Miss Out
              </Badge>
              <h2 className="text-4xl font-black tracking-tight">Upcoming Events</h2>
            </div>
            <Link to="/events">
              <Button variant="outline" className="gap-2 rounded-xl">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl overflow-hidden border">
                  <div className="h-48 bg-muted" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-muted rounded-full w-1/3" />
                    <div className="h-5 bg-muted rounded-full w-3/4" />
                    <div className="h-4 bg-muted rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredEvents.map((event, idx) => {
                const gradient = typeColors[event.type] || 'from-violet-500 to-purple-600';
                return (
                  <Link key={event.id} to={`/events/${event.id}`}>
                    <div className="rounded-2xl overflow-hidden border card-hover bg-card group">
                      <div
                        className={`h-48 relative bg-gradient-to-br ${gradient}`}
                        style={event.bannerImage ? { backgroundImage: `url(${event.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                      >
                        <div className="absolute inset-0 bg-black/20" />
                        {idx === 0 && (
                          <div className="absolute top-3 right-3 bg-white/90 text-primary text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" /> Featured
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3">
                          <span className="bg-white/20 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded-full border border-white/30">
                            {event.category.name}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {event.shortDescription || event.description}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {event.currentParticipants} joined
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 rounded-2xl border bg-muted/30">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-6">Check back soon for upcoming events</p>
              {!isAuthenticated && (
                <Link to="/register">
                  <Button className="rounded-xl">Create an Account</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      {!isAuthenticated && (
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 dot-pattern opacity-20" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="container relative text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-sm font-medium mb-8">
              <Shield className="h-4 w-4" />
              Free for all students
            </div>
            <h2 className="text-4xl lg:text-6xl font-black mb-6 max-w-3xl mx-auto leading-tight">
              Ready to discover amazing college experiences?
            </h2>
            <p className="text-lg opacity-85 max-w-xl mx-auto mb-10">
              Join thousands of students already using EventHub to discover and participate in unforgettable college events.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="lg" variant="secondary" className="gap-2 rounded-xl px-10 font-bold shadow-2xl hover:-translate-y-1 transition-all">
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/events">
                <Button
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2 rounded-xl px-10 hover:-translate-y-1 transition-all"
                >
                  Browse Events
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}