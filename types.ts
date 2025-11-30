import React from 'react';

export enum GameState {
  MENU = 'MENU',
  RACING = 'RACING',
  FINISHED = 'FINISHED',
}

export type ThemeType = 'NEON' | 'DESERT' | 'SNOW' | 'FOREST' | 'CIRCUIT';

export interface RaceStats {
  time: number;
  maxSpeed: number;
  collisions: number;
  distance: number;
  rank?: number; // 1 for 1st place, 2 for 2nd place, etc.
  speedHistory: { time: number; speed: number }[];
}

export interface CarControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

export interface TrackObstacle {
  id: number;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

// Global augmentation for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Core
      group: any;
      mesh: any;
      line: any;
      primitive: any;
      
      // Lights
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      spotLight: any;
      hemisphereLight: any;
      
      // Geometries
      boxGeometry: any;
      cylinderGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      circleGeometry: any;
      capsuleGeometry: any;
      coneGeometry: any;
      dodecahedronGeometry: any;
      torusGeometry: any;
      ringGeometry: any;
      icosahedronGeometry: any;
      octahedronGeometry: any;
      tetrahedronGeometry: any;
      
      // Materials
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshPhongMaterial: any;
      meshPhysicalMaterial: any;
      
      // Helpers / Others
      fog: any;
      gridHelper: any;
      axesHelper: any;
    }
  }
}
