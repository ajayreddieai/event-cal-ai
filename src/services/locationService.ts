import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  region?: string;
  country?: string;
}

export class LocationService {
  private static instance: LocationService;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address[0]) {
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: this.formatAddress(address[0]),
          city: address[0].city,
          region: address[0].region,
          country: address[0].country,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  async geocodeAddress(address: string): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const geocodedLocations = await Location.geocodeAsync(address);

      if (geocodedLocations.length > 0) {
        const { latitude, longitude } = geocodedLocations[0];

        const addressInfo = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addressInfo[0]) {
          return {
            latitude,
            longitude,
            address: this.formatAddress(addressInfo[0]),
            city: addressInfo[0].city,
            region: addressInfo[0].region,
            country: addressInfo[0].country,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  private formatAddress(addressComponent: Location.LocationGeocodedAddress): string {
    const parts = [
      addressComponent.streetNumber,
      addressComponent.street,
      addressComponent.city,
      addressComponent.region,
      addressComponent.postalCode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
      Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const locationService = LocationService.getInstance();
