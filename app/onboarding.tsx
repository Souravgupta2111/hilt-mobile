import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Sparkles, ShieldCheck, Home } from 'lucide-react-native';
import { AuthModal } from '../components/AuthModal';
import { Colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  image: string;
  kicker: string;
  headlineLight: string;
  headlineBold: string;
  subtitle: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
    kicker: 'HIMALAYAN SLOW LIVING',
    headlineLight: 'Discover Your Mountain',
    headlineBold: 'Home Away From Home',
    subtitle: 'Handcrafted Kath-Kuni deodar homestays, pine villas, and secret valley trails across Himachal & Uttarakhand.',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    kicker: 'FAIR HILL ECONOMICS',
    headlineLight: 'Transparent 2% Model',
    headlineBold: 'Retain 98% Earnings',
    subtitle: 'Say goodbye to 18-22% OTA commissions. 100% Smart Escrow protection with automated landslide pass guarantees.',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    kicker: 'CURATED MOUNTAIN RETREATS',
    headlineLight: 'Find Pads at',
    headlineBold: 'Best Price',
    subtitle: 'Find your rental home with comfort Simplicity, location, Economy.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

  const handleNextSlide = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = e.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Horizontal Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item, index }) => (
          <ImageBackground
            source={{ uri: item.image }}
            style={styles.slideImage}
            resizeMode="cover"
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={{ flex: 1 }} />

              {/* Bottom Dark Frosted Glass Card (Ditto Mockup Exact) */}
              <View style={styles.frostedCardWrapper}>
                <BlurView
                  intensity={Platform.OS === 'ios' ? 65 : 95}
                  tint="dark"
                  style={styles.frostedCard}
                >
                  {/* Kicker */}
                  <View style={styles.kickerRow}>
                    <Sparkles size={12} color={Colors.textWhite} />
                    <Text style={styles.kickerText}>{item.kicker}</Text>
                  </View>

                  {/* Headline */}
                  <View style={styles.headlineContainer}>
                    <Text style={styles.headlineLight}>{item.headlineLight}</Text>
                    <Text style={styles.headlineBold}>{item.headlineBold}</Text>
                  </View>

                  {/* Subtitle */}
                  <Text style={styles.subtitle}>{item.subtitle}</Text>

                  {/* Pagination Dots */}
                  <View style={styles.dotsRow}>
                    {slides.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === currentIndex ? styles.dotActive : styles.dotInactive,
                        ]}
                      />
                    ))}
                  </View>

                  {/* Action Buttons */}
                  {index === slides.length - 1 ? (
                    <View style={styles.buttonStack}>
                      <TouchableOpacity
                        style={styles.getStartedButton}
                        onPress={handleGetStarted}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.getStartedText}>Get Started</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => setIsAuthOpen(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.loginText}>Login</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.slideNavRow}>
                      <TouchableOpacity
                        style={styles.skipButton}
                        onPress={handleGetStarted}
                      >
                        <Text style={styles.skipText}>Skip</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.nextButton}
                        onPress={handleNextSlide}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.nextButtonText}>Next</Text>
                        <ArrowRight size={16} color={Colors.primaryBlack} />
                      </TouchableOpacity>
                    </View>
                  )}
                </BlurView>
              </View>
            </SafeAreaView>
          </ImageBackground>
        )}
      />

      {/* Unified Identity Auth Modal */}
      <AuthModal
        visible={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  slideImage: {
    width,
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  frostedCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 32,
  },
  frostedCard: {
    borderRadius: 36,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(15, 20, 25, 0.72)',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kickerText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 1,
  },
  headlineContainer: {
    marginBottom: 10,
  },
  headlineLight: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.textWhite,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  headlineBold: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9CA3AF',
    marginBottom: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.textWhite,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  buttonStack: {
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: Colors.primaryBlack,
    paddingVertical: 18,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  getStartedText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '600',
  },
  slideNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: Colors.primaryBlack,
    fontSize: 14,
    fontWeight: '700',
  },
});
