/**
 * 404 Not Found Page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-9xl font-bold text-primary/20">404</div>
          <h1 className="text-3xl font-bold mt-4">Page Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/">
            <Button className="w-full gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
          
          <div className="flex gap-3">
            <Link to="/events" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Calendar className="h-4 w-4" />
                Browse Events
              </Button>
            </Link>
            <Link to="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Search className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}