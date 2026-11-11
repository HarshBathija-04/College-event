import { NotificationType, NotificationPriority } from '@prisma/client';
import cron from 'node-cron';
import { logger } from '../utils/logger';

import { prisma } from '../lib/prisma';

/**
 * Notification Service class
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    eventId?: string;
    actionLink?: string;
  }) {
    try {
      let priority = data.priority || 'MEDIUM';
      let aiPriorityScore = 0;

      // Simple rule-based priority scoring
      const priorityScores: Record<NotificationType, number> = {
        EVENT_REMINDER: 70,
        REGISTRATION_CONFIRMATION: 60,
        EVENT_APPROVAL: 80,
        EVENT_REJECTION: 75,
        EVENT_UPDATE: 65,
        EVENT_CANCELLED: 85,
        TRENDING_EVENT: 40,
        RECOMMENDATION: 30,
        SYSTEM: 50,
      };

      aiPriorityScore = priorityScores[data.type] || 50;

      // Adjust based on user engagement (simplified)
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId: data.userId },
      });

      if (userProfile) {
        // Boost priority for highly engaged users
        if (userProfile.engagementScore > 0.7) {
          aiPriorityScore += 10;
        }
      }

      if (aiPriorityScore >= 80) priority = 'URGENT';
      else if (aiPriorityScore >= 60) priority = 'HIGH';
      else if (aiPriorityScore >= 40) priority = 'MEDIUM';
      else priority = 'LOW';

      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          priority,
          aiPriorityScore,
          eventId: data.eventId,
          actionLink: data.actionLink,
        },
      });

      logger.info(`Notification created`, { 
        notificationId: notification.id, 
        userId: data.userId, 
        type: data.type,
        priority 
      });

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send event reminder notifications
   */
  static async sendEventReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcomingEvents = await prisma.event.findMany({
        where: {
          status: 'APPROVED',
          startDate: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        include: {
          registrations: {
            where: {
              status: 'CONFIRMED',
            },
            select: {
              userId: true,
            },
          },
        },
      });

      for (const event of upcomingEvents) {
        for (const registration of event.registrations) {
          await this.createNotification({
            userId: registration.userId,
            type: 'EVENT_REMINDER',
            title: `Reminder: ${event.title}`,
            message: `Your event "${event.title}" is starting tomorrow at ${event.venue}. Don't forget to attend!`,
            priority: 'HIGH',
            eventId: event.id,
            actionLink: `/events/${event.id}`,
          });
        }
      }

      logger.info(`Sent ${upcomingEvents.length} event reminders`);
    } catch (error) {
      logger.error('Error sending event reminders:', error);
    }
  }

  /**
   * Send registration deadline reminders
   */
  static async sendDeadlineReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const events = await prisma.event.findMany({
        where: {
          status: 'APPROVED',
          registrationDeadline: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      for (const event of events) {
        // Get users who haven't registered yet (simplified - in production, you'd target specific users)
        const registeredUserIds = await prisma.registration.findMany({
          where: { eventId: event.id },
          select: { userId: true },
        });

        const registeredIds = registeredUserIds.map(r => r.userId);

        // Notify interested users who haven't registered
        const interestedUsers = await prisma.userInterest.findMany({
          where: {
            categoryId: event.categoryId,
            userId: { notIn: registeredIds },
          },
          select: { userId: true },
        });

        for (const user of interestedUsers) {
          await this.createNotification({
            userId: user.userId,
            type: 'EVENT_REMINDER',
            title: `Registration Closing Soon: ${event.title}`,
            message: `Registration for "${event.title}" closes tomorrow. Register now to secure your spot!`,
            priority: 'HIGH',
            eventId: event.id,
            actionLink: `/events/${event.id}`,
          });
        }
      }

      logger.info(`Sent deadline reminders for ${events.length} events`);
    } catch (error) {
      logger.error('Error sending deadline reminders:', error);
    }
  }

  /**
   * Send trending events notifications
   */
  static async sendTrendingEvents() {
    try {
      // Find trending events (high registration rate in last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const trendingEvents = await prisma.event.findMany({
        where: {
          status: 'APPROVED',
          startDate: { gt: new Date() },
        },
        include: {
          registrations: {
            where: {
              createdAt: { gte: yesterday },
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
        take: 5,
      });

      // Sort by recent registration count
      const sortedEvents = trendingEvents
        .map(event => ({
          ...event,
          recentRegistrations: event.registrations.length,
        }))
        .sort((a, b) => b.recentRegistrations - a.recentRegistrations)
        .slice(0, 3);

      for (const event of sortedEvents) {
        if (event.recentRegistrations >= 5) {
          const interestedUsers = await prisma.userInterest.findMany({
            where: { categoryId: event.categoryId },
            select: { userId: true },
          });

          for (const user of interestedUsers) {
            const isRegistered = await prisma.registration.findUnique({
              where: {
                userId_eventId: {
                  userId: user.userId,
                  eventId: event.id,
                },
              },
            });

            if (!isRegistered) {
              await this.createNotification({
                userId: user.userId,
                type: 'TRENDING_EVENT',
                title: `Trending: ${event.title}`,
                message: `"${event.title}" is trending! ${event.recentRegistrations} people registered in the last 24 hours. Don't miss out!`,
                priority: 'MEDIUM',
                eventId: event.id,
                actionLink: `/events/${event.id}`,
              });
            }
          }
        }
      }

      logger.info(`Sent trending notifications for ${sortedEvents.length} events`);
    } catch (error) {
      logger.error('Error sending trending events:', error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Initialize cron jobs for scheduled notifications
   */
  static initializeCronJobs() {
    // Event reminders - daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      logger.info('Running daily event reminder job');
      this.sendEventReminders();
    });

    // Deadline reminders - daily at 10 AM
    cron.schedule('0 10 * * *', () => {
      logger.info('Running deadline reminder job');
      this.sendDeadlineReminders();
    });

    // Trending events - daily at 6 PM
    cron.schedule('0 18 * * *', () => {
      logger.info('Running trending events job');
      this.sendTrendingEvents();
    });

    logger.info('Notification cron jobs initialized');
  }
}

export default NotificationService;