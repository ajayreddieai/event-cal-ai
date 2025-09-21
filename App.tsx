import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [currentScreen, setCurrentScreen] = React.useState('Calendar');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Calendar':
        return (
          <View style={styles.screen}>
            <Text style={styles.title}>📅 Calendar</Text>
            <Text style={styles.subtitle}>Event Discovery Calendar App</Text>
            <Text style={styles.description}>
              This is your calendar view where you'll see all your events organized by date.
            </Text>
          </View>
        );
      case 'Discover':
        return (
          <View style={styles.screen}>
            <Text style={styles.title}>🔍 Discover Events</Text>
            <Text style={styles.subtitle}>Location-Based Event Discovery</Text>
            <Text style={styles.description}>
              Find events near you based on your interests and location. Browse by categories like Technology, Business, Arts, Music, and more.
            </Text>
          </View>
        );
      case 'Saved':
        return (
          <View style={styles.screen}>
            <Text style={styles.title}>⭐ Saved Events</Text>
            <Text style={styles.subtitle}>Your Bookmarked Events</Text>
            <Text style={styles.description}>
              All the events you've saved for later. Quick access to your favorite events and activities.
            </Text>
          </View>
        );
      case 'Profile':
        return (
          <View style={styles.screen}>
            <Text style={styles.title}>👤 Profile</Text>
            <Text style={styles.subtitle}>Settings & Preferences</Text>
            <Text style={styles.description}>
              Manage your interests, location preferences, and notification settings.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <Text style={styles.appTitle}>Event Discovery Calendar</Text>
      </View>

      <View style={styles.content}>
        {renderScreen()}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, currentScreen === 'Calendar' && styles.activeTab]}
          onPress={() => setCurrentScreen('Calendar')}
        >
          <Text style={[styles.tabText, currentScreen === 'Calendar' && styles.activeTabText]}>
            📅 Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === 'Discover' && styles.activeTab]}
          onPress={() => setCurrentScreen('Discover')}
        >
          <Text style={[styles.tabText, currentScreen === 'Discover' && styles.activeTabText]}>
            🔍 Discover
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === 'Saved' && styles.activeTab]}
          onPress={() => setCurrentScreen('Saved')}
        >
          <Text style={[styles.tabText, currentScreen === 'Saved' && styles.activeTabText]}>
            ⭐ Saved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, currentScreen === 'Profile' && styles.activeTab]}
          onPress={() => setCurrentScreen('Profile')}
        >
          <Text style={[styles.tabText, currentScreen === 'Profile' && styles.activeTabText]}>
            👤 Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  screen: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 60,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
