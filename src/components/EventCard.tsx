import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EventCardProps {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  attendees?: number;
  isSaved?: boolean;
  onPress?: () => void;
  onSave?: () => void;
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  description,
  date,
  time,
  location,
  category,
  attendees,
  isSaved = false,
  onPress,
  onSave,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(category) }]}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <Text style={styles.date}>{date}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{time}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{location}</Text>
        </View>

        {attendees && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{attendees} attending</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSave}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isSaved ? "bookmark" : "bookmark-outline"}
          size={20}
          color={isSaved ? "#007AFF" : "#666"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    Technology: '#007AFF',
    Business: '#FF9500',
    Sports: '#FF3B30',
    Arts: '#AF52DE',
    Music: '#FF2D70',
    Networking: '#34C759',
    Startups: '#5856D6',
    Education: '#FFCC00',
    Health: '#FF3B30',
    Food: '#FF9500',
  };

  return colors[category] || '#666';
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  saveButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
});

export default EventCard;
