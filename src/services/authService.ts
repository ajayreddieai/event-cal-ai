import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/event';

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export class AuthService {
  private static instance: AuthService;
  private user: User | null = null;
  private userProfile: UserProfile | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        this.user = user;
        if (user) {
          await this.loadUserProfile();
        } else {
          this.userProfile = null;
        }
        unsubscribe();
        resolve();
      });
    });
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      this.user = result.user;
      await this.loadUserProfile();
      return result.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string, profileData: Partial<UserProfile>): Promise<User> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      this.user = result.user;

      // Create user profile
      const userProfile: UserProfile = {
        id: result.user.uid,
        interests: profileData.interests || [],
        location: profileData.location || {
          lat: 37.7749,
          lng: -122.4194,
          address: 'San Francisco, CA'
        },
        notificationPreferences: {
          pushNotifications: true,
          emailNotifications: true,
          categories: profileData.interests || []
        }
      };

      await this.saveUserProfile(userProfile);
      this.userProfile = userProfile;

      return result.user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
      this.user = null;
      this.userProfile = null;
      await AsyncStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      if (!this.user) throw new Error('No authenticated user');

      await setDoc(doc(db, 'users', this.user.uid), {
        ...profile,
        updatedAt: new Date().toISOString()
      });

      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async loadUserProfile(): Promise<UserProfile | null> {
    try {
      if (!this.user) return null;

      // Try to load from cache first
      const cached = await AsyncStorage.getItem('userProfile');
      if (cached) {
        this.userProfile = JSON.parse(cached);
        return this.userProfile;
      }

      // Load from Firestore
      const docRef = doc(db, 'users', this.user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.userProfile = docSnap.data() as UserProfile;
        await AsyncStorage.setItem('userProfile', JSON.stringify(this.userProfile));
        return this.userProfile;
      }

      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  async updateUserInterests(interests: string[]): Promise<void> {
    if (!this.userProfile) throw new Error('No user profile');

    const updatedProfile = {
      ...this.userProfile,
      interests,
      notificationPreferences: {
        ...this.userProfile.notificationPreferences,
        categories: interests
      }
    };

    await this.saveUserProfile(updatedProfile);
    this.userProfile = updatedProfile;
  }

  async updateUserLocation(location: { lat: number; lng: number; address: string }): Promise<void> {
    if (!this.userProfile) throw new Error('No user profile');

    const updatedProfile = {
      ...this.userProfile,
      location
    };

    await this.saveUserProfile(updatedProfile);
    this.userProfile = updatedProfile;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }
}

export const authService = AuthService.getInstance();
