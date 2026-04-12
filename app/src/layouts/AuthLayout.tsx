/**
 * Auth Layout Component
 * Minimal layout for authentication pages
 */

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-primary p-2 rounded-lg">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">EventHub</span>
        </Link>

        {/* Content */}
        <div className="bg-card rounded-xl shadow-lg border p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          &copy; {new Date().getFullYear()} EventHub - College Event Aggregator
        </p>
      </div>
    </div>
  );
}