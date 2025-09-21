import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EventData } from '../types/event';
import { authService } from './authService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push notification permission for notifications');
        return;
      }

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  async scheduleEventReminder(event: EventData, minutesBefore: number = 60): Promise<string | null> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to schedule notifications');
      }

      const eventDate = new Date(event.startDate);
      const reminderDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);

      // Don't schedule if reminder is in the past
      if (reminderDate <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: `event_${event.id}`,
        content: {
          title: `Upcoming Event: ${event.title}`,
          body: `${event.description}\n📍 ${event.location.name}\n🕐 ${this.formatEventTime(event.startDate)}`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            eventId: event.id,
            eventTitle: event.title,
            eventLocation: event.location.name,
            eventDate: event.startDate,
          },
        },
        trigger: reminderDate,
      });

      console.log(`Event reminder scheduled for ${event.title} at ${reminderDate.toISOString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling event reminder:', error);
      throw error;
    }
  }

  async cancelEventReminder(eventId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(`event_${eventId}`);
      console.log(`Event reminder cancelled for event ${eventId}`);
    } catch (error) {
      console.error('Error cancelling event reminder:', error);
    }
  }

  async sendImmediateNotification(title: string, body: string, data?: any): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: data || {},
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      throw error;
    }
  }

  async sendEventSavedNotification(event: EventData): Promise<void> {
    await this.sendImmediateNotification(
      'Event Saved!',
      `"${event.title}" has been saved to your events.`,
      { eventId: event.id, type: 'event_saved' }
    );
  }

  async sendEventUnsavedNotification(event: EventData): Promise<void> {
    await this.sendImmediateNotification(
      'Event Removed',
      `"${event.title}" has been removed from your saved events.`,
      { eventId: event.id, type: 'event_unsaved' }
    );
  }

  async sendWeeklyDigestNotification(eventsCount: number): Promise<void> {
    await this.sendImmediateNotification(
      'Weekly Event Digest',
      `You have ${eventsCount} new events in your area this week!`,
      { type: 'weekly_digest' }
    );
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  private formatEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Handle notification tap
  async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const data = response.notification.request.content.data;

    if (data?.eventId) {
      // Navigate to event details or perform action based on notification data
      console.log(`Notification tapped for event: ${data.eventId}`);

      // You would typically navigate to the event details screen here
      // This would require integration with your navigation system
    }
  }
}

export const notificationService = NotificationService.getInstance();
