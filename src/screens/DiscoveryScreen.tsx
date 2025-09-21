import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EventCard from '../components/EventCard';
import LocationPicker from '../components/LocationPicker';
import { EventData, EventFilters } from '../types/event';
import { apiService } from '../services/api';
import { locationService } from '../services/locationService';
import { eventService } from '../services/eventService';
import { authService } from '../services/authService';

const categories = [
  'Technology', 'Business', 'Sports', 'Arts', 'Music',
  'Networking', 'Startups', 'Education', 'Health', 'Food'
];

const DiscoveryScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [events, setEvents] = useState<EventData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchEvents();
    }
  }, [currentLocation, selectedCategory]);

  const initializeApp = async () => {
    try {
      await authService.initialize();
      await eventService.initialize();
      await locationService.requestPermissions();

      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation({
          lat: location.latitude,
          lng: location.longitude,
          address: location.address
        });
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const filters: EventFilters = {
        location: {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          radius: 25
        }
      };

      if (selectedCategory) {
        filters.categories = [selectedCategory];
      }

      const fetchedEvents = await apiService.fetchEvents(filters);
      setEvents(fetchedEvents);
      setFilteredEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setCurrentLocation(location);
    setShowLocationPicker(false);
  };

  const handleSaveEvent = async (event: EventData) => {
    try {
      if (eventService.isEventSaved(event.id)) {
        await eventService.unsaveEvent(event.id);
        setEvents(events.map(e => e.id === event.id ? { ...e, saved: false } : e));
      } else {
        await eventService.saveEvent(event);
        setEvents(events.map(e => e.id === event.id ? { ...e, saved: true } : e));
      }
    } catch (error) {
      console.error('Error toggling event save:', error);
    }
  };

  const handleEventPress = (event: EventData) => {
    // Navigate to event details screen
    console.log('Navigate to event details:', event.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Events</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowLocationPicker(true)}
        >
          <Ionicons name="location-outline" size={20} color="#007AFF" />
          <Text style={styles.locationText}>
            {currentLocation ? currentLocation.address.split(',')[0] : 'Select Location'}
          </Text>
        </TouchableOpacity>
      </View>

      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          currentLocation={currentLocation}
        />
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Categories</Text>

        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategory
              ]}
              onPress={() => setSelectedCategory(
                selectedCategory === category ? '' : category
              )}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {selectedCategory ? `${selectedCategory} Events` : 'Upcoming Events'}
          {filteredEvents.length > 0 && ` (${filteredEvents.length})`}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No events found</Text>
            <Text style={styles.emptyDescription}>
              Try adjusting your filters or location to discover more events.
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              description={event.description}
              date={new Date(event.startDate).toLocaleDateString()}
              time={`${new Date(event.startDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} - ${new Date(event.endDate).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}`}
              location={event.location.name}
              category={event.category}
              attendees={event.attendeeCount}
              isSaved={eventService.isEventSaved(event.id)}
              onPress={() => handleEventPress(event)}
              onSave={() => handleSaveEvent(event)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
  },
  locationText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#ffffff',
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
});

export default DiscoveryScreen;
