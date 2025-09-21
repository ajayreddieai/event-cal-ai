import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EventCard from '../components/EventCard';
import { EventData } from '../types/event';
import { eventService } from '../services/eventService';
import { authService } from '../services/authService';

const SavedScreen = () => {
  const [savedEvents, setSavedEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await authService.initialize();
      await eventService.initialize();
      // In a real app, you would fetch the full event details for saved events
      // For now, we'll show a placeholder
      setLoading(false);
    } catch (error) {
      console.error('Error initializing saved events:', error);
      setLoading(false);
    }
  };

  const handleEventPress = (event: EventData) => {
    // Navigate to event details screen
    console.log('Navigate to event details:', event.id);
  };

  const handleSaveEvent = async (event: EventData) => {
    try {
      await eventService.unsaveEvent(event.id);
      // Remove from saved events list
      setSavedEvents(savedEvents.filter(e => e.id !== event.id));
    } catch (error) {
      console.error('Error removing saved event:', error);
    }
  };

  const savedEventsCount = eventService.getSavedEventsCount();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Events</Text>
        <Text style={styles.subtitle}>Events you've bookmarked ({savedEventsCount})</Text>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : savedEventsCount === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No saved events yet</Text>
            <Text style={styles.emptyDescription}>
              Browse and save events you're interested in to see them here.
            </Text>
            <TouchableOpacity style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.savedEventsList}>
            <Text style={styles.sectionTitle}>Your Saved Events</Text>
            {savedEvents.map((event) => (
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
                isSaved={true}
                onPress={() => handleEventPress(event)}
                onSave={() => handleSaveEvent(event)}
              />
            ))}
          </View>
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
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 50,
  },
  savedEventsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
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
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SavedScreen;
