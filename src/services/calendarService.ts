import * as Calendar from 'expo-calendar';
import { EventData } from '../types/event';
import { Platform } from 'react-native';

export class CalendarService {
  private static instance: CalendarService;
  private defaultCalendarId: string | null = null;

  static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Calendar permission denied');
      }

      await this.getOrCreateDefaultCalendar();
    } catch (error) {
      console.error('Error initializing calendar service:', error);
      throw error;
    }
  }

  async addEventToCalendar(event: EventData): Promise<string | null> {
    try {
      if (!this.defaultCalendarId) {
        await this.getOrCreateDefaultCalendar();
      }

      const eventDetails = {
        title: event.title,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location.address,
        notes: `Event: ${event.title}\n\n${event.description}\n\nOrganizer: ${event.organizer}\nPrice: $${event.price.amount}\n\nRegister: ${event.registrationUrl}`,
        timeZone: 'America/Los_Angeles', // You can make this dynamic
        alarms: [{
          relativeOffset: -60, // 1 hour before
          method: Calendar.AlarmMethod.ALERT
        }]
      };

      const eventId = await Calendar.createEventAsync(this.defaultCalendarId!, eventDetails);

      console.log(`Event "${event.title}" added to calendar with ID: ${eventId}`);
      return eventId;
    } catch (error) {
      console.error('Error adding event to calendar:', error);
      throw error;
    }
  }

  async removeEventFromCalendar(eventId: string): Promise<void> {
    try {
      await Calendar.deleteEventAsync(eventId);
      console.log(`Event ${eventId} removed from calendar`);
    } catch (error) {
      console.error('Error removing event from calendar:', error);
      throw error;
    }
  }

  async checkEventExistsInCalendar(event: EventData): Promise<boolean> {
    try {
      if (!this.defaultCalendarId) return false;

      const events = await Calendar.getEventsAsync(
        [this.defaultCalendarId],
        new Date(event.startDate),
        new Date(event.endDate)
      );

      return events.some(calEvent =>
        calEvent.title === event.title &&
        calEvent.location === event.location.address
      );
    } catch (error) {
      console.error('Error checking event existence in calendar:', error);
      return false;
    }
  }

  async getEventsFromCalendar(startDate: Date, endDate: Date): Promise<Calendar.Event[]> {
    try {
      if (!this.defaultCalendarId) {
        await this.getOrCreateDefaultCalendar();
      }

      return await Calendar.getEventsAsync(
        [this.defaultCalendarId],
        startDate,
        endDate
      );
    } catch (error) {
      console.error('Error getting events from calendar:', error);
      return [];
    }
  }

  private async getOrCreateDefaultCalendar(): Promise<void> {
    try {
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );

      // Look for existing calendar
      let defaultCalendar = calendars.find(
        cal => cal.title === 'Event Calendar' && cal.allowsModifications
      );

      if (!defaultCalendar) {
        // Create new calendar
        const newCalendarId = await Calendar.createCalendarAsync({
          title: 'Event Calendar',
          color: '#007AFF',
          entityType: Calendar.EntityTypes.EVENT,
          name: 'event-calendar',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
          ownerAccount: 'personal',
          source: {
            isLocalAccount: true,
            name: 'Event Calendar',
            type: 'LOCAL'
          }
        });

        defaultCalendar = await Calendar.getCalendarAsync(newCalendarId);
      }

      this.defaultCalendarId = defaultCalendar.id;
    } catch (error) {
      console.error('Error getting or creating default calendar:', error);
      throw error;
    }
  }

  async openCalendarApp(): Promise<void> {
    try {
      await Calendar.openCalendarAsync();
    } catch (error) {
      console.error('Error opening calendar app:', error);
      throw error;
    }
  }

  // Sync events from our app to native calendar
  async syncEventsToCalendar(events: EventData[]): Promise<void> {
    try {
      const existingCalendarEvents = await this.getEventsFromCalendar(
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      );

      // Add events that are in our list but not in calendar
      for (const event of events) {
        const exists = existingCalendarEvents.some(calEvent =>
          calEvent.title === event.title &&
          calEvent.location === event.location.address
        );

        if (!exists) {
          await this.addEventToCalendar(event);
        }
      }

      console.log(`Synced ${events.length} events to calendar`);
    } catch (error) {
      console.error('Error syncing events to calendar:', error);
      throw error;
    }
  }

  async getDefaultCalendarId(): Promise<string | null> {
    if (!this.defaultCalendarId) {
      await this.getOrCreateDefaultCalendar();
    }
    return this.defaultCalendarId;
  }

  async updateEventInCalendar(calendarEventId: string, event: EventData): Promise<void> {
    try {
      const eventDetails = {
        title: event.title,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location.address,
        notes: `Event: ${event.title}\n\n${event.description}\n\nOrganizer: ${event.organizer}\nPrice: $${event.price.amount}\n\nRegister: ${event.registrationUrl}`,
      };

      await Calendar.updateEventAsync(calendarEventId, eventDetails);
      console.log(`Event ${calendarEventId} updated in calendar`);
    } catch (error) {
      console.error('Error updating event in calendar:', error);
      throw error;
    }
  }
}

export const calendarService = CalendarService.getInstance();
