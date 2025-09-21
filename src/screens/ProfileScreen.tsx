import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  const interests = [
    'Technology', 'Business', 'Sports', 'Arts', 'Music',
    'Networking', 'Startups', 'Education'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsGrid}>
            {interests.map((interest) => (
              <TouchableOpacity key={interest} style={styles.interestButton}>
                <Text style={styles.interestText}>{interest}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
              <Text style={styles.preferenceText}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={notifications ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="location-outline" size={24} color="#333" />
              <Text style={styles.preferenceText}>Location Services</Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={setLocationServices}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={locationServices ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color="#333" />
            <Text style={styles.menuText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutButton]}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  interestText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    marginTop: 10,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

export default ProfileScreen;
