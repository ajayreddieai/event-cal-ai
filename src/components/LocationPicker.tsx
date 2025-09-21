import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  currentLocation?: { latitude: number; longitude: number; address: string };
}

const popularCities = [
  { name: 'San Francisco', country: 'CA, USA' },
  { name: 'New York', country: 'NY, USA' },
  { name: 'Los Angeles', country: 'CA, USA' },
  { name: 'Chicago', country: 'IL, USA' },
  { name: 'Austin', country: 'TX, USA' },
  { name: 'Seattle', country: 'WA, USA' },
  { name: 'Miami', country: 'FL, USA' },
  { name: 'Boston', country: 'MA, USA' },
];

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, currentLocation }) => {
  const [searchText, setSearchText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address[0]) {
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: `${address[0].city}, ${address[0].region}`,
        };
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Error getting current location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const filteredCities = popularCities.filter(city =>
    city.name.toLowerCase().includes(searchText.toLowerCase()) ||
    city.country.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a city..."
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            setShowResults(text.length > 0);
          }}
          onFocus={() => setShowResults(searchText.length > 0)}
        />
      </View>

      {showResults && searchText.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={filteredCities}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => {
                  onLocationSelect({
                    latitude: 0, // You would need to geocode this
                    longitude: 0,
                    address: `${item.name}, ${item.country}`,
                  });
                  setSearchText(`${item.name}, ${item.country}`);
                  setShowResults(false);
                }}
              >
                <Ionicons name="location-outline" size={20} color="#007AFF" />
                <View style={styles.resultText}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.countryName}>{item.country}</Text>
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.currentLocationButton, isLoadingLocation && styles.disabledButton]}
        onPress={getCurrentLocation}
        disabled={isLoadingLocation}
      >
        <Ionicons
          name={isLoadingLocation ? "sync" : "location"}
          size={20}
          color={isLoadingLocation ? "#666" : "#007AFF"}
        />
        <Text style={[styles.currentLocationText, isLoadingLocation && styles.disabledText]}>
          {isLoadingLocation ? 'Getting location...' : 'Use current location'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  resultsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    marginLeft: 12,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  countryName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  currentLocationText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
  },
  disabledText: {
    color: '#666',
  },
});

export default LocationPicker;
