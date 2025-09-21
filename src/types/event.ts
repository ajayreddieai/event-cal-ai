export interface Location {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface Price {
  amount: number;
  currency: string;
}

export interface EventData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: Location;
  category: string;
  organizer: string;
  attendeeCount: number;
  price: Price;
  imageUrl?: string;
  registrationUrl?: string;
}

export interface EventFilters {
  categories?: string[];
  location?: {
    lat: number;
    lng: number;
    radius: number; // in miles
  };
  dateRange?: {
    start: string;
    end: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface UserProfile {
  id: string;
  interests: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  notificationPreferences: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    categories: string[];
  };
}

export interface SavedEvent {
  eventId: string;
  savedAt: string;
  notes?: string;
}
