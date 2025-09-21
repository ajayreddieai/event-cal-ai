import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

const CalendarScreen = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
      </View>

      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          '2024-01-15': { marked: true, dotColor: '#007AFF' },
          '2024-01-20': { marked: true, dotColor: '#FF3B30' },
        }}
        style={styles.calendar}
        theme={{
          todayTextColor: '#007AFF',
          selectedDayBackgroundColor: '#007AFF',
          selectedDayTextColor: '#ffffff',
        }}
      />

      <ScrollView style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>
          {selectedDate ? `Events for ${selectedDate}` : 'Today\'s Events'}
        </Text>

        {/* Sample events - replace with real data later */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>Tech Meetup</Text>
          <Text style={styles.eventTime}>7:00 PM - 9:00 PM</Text>
          <Text style={styles.eventLocation}>Downtown Tech Hub</Text>
        </View>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>React Native Workshop</Text>
          <Text style={styles.eventTime}>2:00 PM - 5:00 PM</Text>
          <Text style={styles.eventLocation}>Innovation Center</Text>
        </View>
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
  },
  calendar: {
    margin: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  eventsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  eventLocation: {
    fontSize: 14,
    color: '#007AFF',
  },
});

export default CalendarScreen;
