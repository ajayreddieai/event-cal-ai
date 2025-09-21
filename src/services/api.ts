import axios from 'axios';
import { EventData, EventFilters } from '../types/event';
import { locationService } from './locationService';

export class ApiService {
  private static instance: ApiService;
  private eventbriteApiKey: string = 'YOUR_EVENTBRITE_API_KEY'; // Replace with actual key

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  async fetchEvents(filters: EventFilters): Promise<EventData[]> {
    try {
      const events: EventData[] = [];

      // Fetch from Eventbrite
      if (filters.location) {
        const eventbriteEvents = await this.fetchEventbriteEvents(filters);
        events.push(...eventbriteEvents);
      }

      // Fetch from Meetup (mock for now)
      const meetupEvents = await this.fetchMeetupEvents(filters);
      events.push(...meetupEvents);

      // Apply additional filtering
      return this.applyFilters(events, filters);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  async searchEvents(query: string, location: { lat: number; lng: number }): Promise<EventData[]> {
    try {
      const filters: EventFilters = {
        location: {
          lat: location.lat,
          lng: location.lng,
          radius: 25
        }
      };

      const events = await this.fetchEvents(filters);
      return events.filter(event =>
        event.title.toLowerCase().includes(query.toLowerCase()) ||
        event.description.toLowerCase().includes(query.toLowerCase()) ||
        event.category.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching events:', error);
      throw new Error('Failed to search events');
    }
  }

  private async fetchEventbriteEvents(filters: EventFilters): Promise<EventData[]> {
    try {
      if (!this.eventbriteApiKey || this.eventbriteApiKey === 'YOUR_EVENTBRITE_API_KEY') {
        console.warn('Eventbrite API key not configured, returning sample data');
        return this.getSampleEvents();
      }

      const location = await locationService.getCurrentLocation();
      if (!location) throw new Error('Cannot get location for Eventbrite API');

      const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
        headers: {
          'Authorization': `Bearer ${this.eventbriteApiKey}`
        },
        params: {
          'location.address': location.address,
          'location.within': `${filters.location?.radius || 25}mi`,
          'start_date.range_start': new Date().toISOString(),
          'start_date.range_end': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          'expand': 'venue,organizer',
          'page_size': 50
        }
      });

      return this.transformEventbriteEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching Eventbrite events:', error);
      return this.getSampleEvents();
    }
  }

  private async fetchMeetupEvents(filters: EventFilters): Promise<EventData[]> {
    // Mock Meetup API integration - replace with actual API calls
    try {
      // This would integrate with Meetup API
      // For now, return additional sample events
      return this.getSampleMeetupEvents();
    } catch (error) {
      console.error('Error fetching Meetup events:', error);
      return [];
    }
  }

  private transformEventbriteEvents(events: any[]): EventData[] {
    return events.map(event => ({
      id: event.id,
      title: event.name.text,
      description: event.description.text || 'No description available',
      startDate: event.start.local,
      endDate: event.end.local,
      location: {
        name: event.venue?.name || 'TBD',
        address: event.venue?.address?.localized_address_display || 'TBD',
        coordinates: {
          lat: event.venue?.latitude || 0,
          lng: event.venue?.longitude || 0
        }
      },
      category: this.categorizeEvent(event.category?.name || 'General'),
      organizer: event.organizer?.name || 'Unknown Organizer',
      attendeeCount: event.capacity || event.ticket_availability?.quantity_total || 0,
      price: {
        amount: event.ticket_availability?.minimum_ticket_price?.major_value || 0,
        currency: event.ticket_availability?.minimum_ticket_price?.currency || 'USD'
      },
      imageUrl: event.logo?.original || undefined,
      registrationUrl: event.url
    }));
  }

  private categorizeEvent(eventbriteCategory: string): string {
    const categoryMap: { [key: string]: string } = {
      'Business & Professional': 'Business',
      'Science & Technology': 'Technology',
      'Music': 'Music',
      'Film, Media & Entertainment': 'Arts',
      'Sports & Fitness': 'Sports',
      'Health & Wellness': 'Health',
      'Community & Culture': 'Arts',
      'Arts': 'Arts',
      'Food & Drink': 'Food',
      'Education': 'Education',
      'Fashion & Beauty': 'Arts',
      'Home & Lifestyle': 'Arts',
      'Auto, Boat & Air': 'Sports',
      'Charity & Causes': 'Networking',
      'Family & Education': 'Education',
      'Government & Politics': 'Business',
      'Religion & Spirituality': 'Arts',
      'Seasonal & Holiday': 'Arts',
      'Travel & Outdoor': 'Sports',
      'Other': 'General'
    };

    return categoryMap[eventbriteCategory] || 'General';
  }

  private applyFilters(events: EventData[], filters: EventFilters): EventData[] {
    let filteredEvents = [...events];

    // Filter by categories
    if (filters.categories && filters.categories.length > 0) {
      filteredEvents = filteredEvents.filter(event =>
        filters.categories!.includes(event.category)
      );
    }

    // Filter by location radius
    if (filters.location) {
      filteredEvents = filteredEvents.filter(event => {
        const distance = locationService.calculateDistance(
          { lat: filters.location!.lat, lng: filters.location!.lng },
          event.location.coordinates
        );
        return distance <= (filters.location!.radius || 25);
      });
    }

    // Filter by price range
    if (filters.priceRange) {
      filteredEvents = filteredEvents.filter(event =>
        event.price.amount >= filters.priceRange!.min &&
        event.price.amount <= filters.priceRange!.max
      );
    }

    return filteredEvents;
  }

  private getSampleEvents(): EventData[] {
    return [
      {
        id: '1',
        title: 'React Native Developer Meetup',
        description: 'Join us for an evening of React Native talks, networking, and pizza! We\'ll be discussing the latest in mobile development.',
        startDate: '2024-01-15T19:00:00Z',
        endDate: '2024-01-15T21:00:00Z',
        location: {
          name: 'Tech Hub Downtown',
          address: '123 Tech Street, San Francisco, CA',
          coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        category: 'Technology',
        organizer: 'SF React Community',
        attendeeCount: 45,
        price: { amount: 0, currency: 'USD' },
        imageUrl: 'https://example.com/event1.jpg',
        registrationUrl: 'https://example.com/register1'
      },
      {
        id: '2',
        title: 'Startup Pitch Night',
        description: 'Watch 10 innovative startups pitch their ideas to a panel of investors and entrepreneurs. Network with the startup community.',
        startDate: '2024-01-20T18:30:00Z',
        endDate: '2024-01-20T21:30:00Z',
        location: {
          name: 'Innovation Center',
          address: '456 Innovation Ave, San Francisco, CA',
          coordinates: { lat: 37.7849, lng: -122.4094 }
        },
        category: 'Business',
        organizer: 'Bay Area Startups',
        attendeeCount: 120,
        price: { amount: 15, currency: 'USD' },
        imageUrl: 'https://example.com/event2.jpg',
        registrationUrl: 'https://example.com/register2'
      },
      {
        id: '3',
        title: 'AI & Machine Learning Workshop',
        description: 'Hands-on workshop covering the basics of AI and ML. Bring your laptop and get ready to build your first neural network!',
        startDate: '2024-01-22T14:00:00Z',
        endDate: '2024-01-22T17:00:00Z',
        location: {
          name: 'University Campus',
          address: '789 College Blvd, Berkeley, CA',
          coordinates: { lat: 37.8715, lng: -122.2730 }
        },
        category: 'Education',
        organizer: 'UC Berkeley AI Club',
        attendeeCount: 30,
        price: { amount: 25, currency: 'USD' },
        imageUrl: 'https://example.com/event3.jpg',
        registrationUrl: 'https://example.com/register3'
      }
    ];
  }

  private getSampleMeetupEvents(): EventData[] {
    return [
      {
        id: 'meetup_1',
        title: 'Tech Entrepreneurs Networking',
        description: 'Monthly networking event for tech entrepreneurs and investors in the Bay Area.',
        startDate: '2024-01-18T18:00:00Z',
        endDate: '2024-01-18T20:00:00Z',
        location: {
          name: 'Startup Cafe',
          address: '321 Startup Lane, San Francisco, CA',
          coordinates: { lat: 37.7849, lng: -122.4094 }
        },
        category: 'Networking',
        organizer: 'Tech Entrepreneurs Meetup',
        attendeeCount: 85,
        price: { amount: 0, currency: 'USD' },
        imageUrl: 'https://example.com/meetup1.jpg',
        registrationUrl: 'https://example.com/meetup1'
      }
    ];
  }
}

export const apiService = ApiService.getInstance();
