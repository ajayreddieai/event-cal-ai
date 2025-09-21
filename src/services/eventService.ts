import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventData, SavedEvent } from '../types/event';
import { authService } from './authService';

export class EventService {
  private static instance: EventService;
  private savedEvents: { [eventId: string]: SavedEvent } = {};

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadSavedEvents();
  }

  async saveEvent(event: EventData, notes?: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to save events');
      }

      const savedEvent: SavedEvent = {
        eventId: event.id,
        savedAt: new Date().toISOString(),
        notes
      };

      this.savedEvents[event.id] = savedEvent;

      // Save to AsyncStorage
      await AsyncStorage.setItem(`savedEvents_${user.uid}`, JSON.stringify(this.savedEvents));

      console.log(`Event ${event.id} saved successfully`);
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  }

  async unsaveEvent(eventId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to unsave events');
      }

      delete this.savedEvents[eventId];

      // Save to AsyncStorage
      await AsyncStorage.setItem(`savedEvents_${user.uid}`, JSON.stringify(this.savedEvents));

      console.log(`Event ${eventId} unsaved successfully`);
    } catch (error) {
      console.error('Error unsaving event:', error);
      throw error;
    }
  }

  isEventSaved(eventId: string): boolean {
    return !!this.savedEvents[eventId];
  }

  getSavedEvents(): SavedEvent[] {
    return Object.values(this.savedEvents);
  }

  getSavedEvent(eventId: string): SavedEvent | null {
    return this.savedEvents[eventId] || null;
  }

  async getEventWithSaveStatus(eventId: string): Promise<{ event: EventData; isSaved: boolean; savedEvent?: SavedEvent }> {
    // This would typically fetch the event from the API
    // For now, we'll assume the event is passed in
    const isSaved = this.isEventSaved(eventId);
    const savedEvent = this.getSavedEvent(eventId);

    return {
      event: {} as EventData, // This would be the actual event data
      isSaved,
      savedEvent
    };
  }

  private async loadSavedEvents(): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const saved = await AsyncStorage.getItem(`savedEvents_${user.uid}`);
      if (saved) {
        this.savedEvents = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading saved events:', error);
      this.savedEvents = {};
    }
  }

  async clearAllSavedEvents(): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      this.savedEvents = {};
      await AsyncStorage.removeItem(`savedEvents_${user.uid}`);

      console.log('All saved events cleared');
    } catch (error) {
      console.error('Error clearing saved events:', error);
      throw error;
    }
  }

  // Get saved events count for UI display
  getSavedEventsCount(): number {
    return Object.keys(this.savedEvents).length;
  }
}

export const eventService = EventService.getInstance();
