// Type shim for react-native-maps@1.21 (ships raw TS source as `main`,
// which our stricter tsc 6 rejects internally). Metro still uses the real
// library at runtime; this only affects `tsc --noEmit`.
declare module 'react-native-maps' {
  import type { Component, ReactNode } from 'react';
  import type { ViewProps } from 'react-native';

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface MarkerProps {
    coordinate: LatLng;
    title?: string;
    description?: string;
    onPress?: (e: any) => void;
    tracksViewChanges?: boolean;
    children?: ReactNode;
  }

  export class Marker<P extends MarkerProps = MarkerProps> extends Component<P> {}

  export interface MapViewProps extends ViewProps {
    initialRegion?: Region;
    region?: Region;
    provider?: string;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    rotateEnabled?: boolean;
    pitchEnabled?: boolean;
    onPress?: (e: any) => void;
    children?: ReactNode;
  }

  export default class MapView<P extends MapViewProps = MapViewProps> extends Component<P> {
    animateToRegion(region: Region, duration?: number): void;
  }

  export const PROVIDER_DEFAULT: string;
  export const PROVIDER_GOOGLE: string;
}
