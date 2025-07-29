/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CameraDevice } from './atoms';

export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet'];
  return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
         ('ontouchstart' in window) ||
         (window.innerWidth <= 768);
};

export const enumerateCameras = async (): Promise<CameraDevice[]> => {
  try {
    // First, request permission to get device labels
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (permissionError) {
      console.log('Permission not granted yet, continuing with limited device info');
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras: CameraDevice[] = [];
    
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log('Found video devices:', videoDevices.length, videoDevices);
    
    for (let i = 0; i < videoDevices.length; i++) {
      const device = videoDevices[i];
      const camera: CameraDevice = {
        deviceId: device.deviceId,
        label: device.label || `Camera ${cameras.length + 1}`,
      };
      
      // Try to determine facing mode
      const mobile = isMobileDevice();
      if (mobile || device.label) {
        camera.facingMode = await determineFacingMode(device.deviceId, camera.label);
        
        // If we couldn't determine from label and we're on mobile, use position heuristic
        if (!camera.facingMode && mobile) {
          // On mobile, typically first camera is front (user), others are back (environment)
          camera.facingMode = i === 0 ? 'user' : 'environment';
        }
      }
      
      console.log('Adding camera:', camera);
      cameras.push(camera);
    }
    
    console.log('Total cameras found:', cameras.length);
    return cameras;
  } catch (error) {
    console.error('Error enumerating cameras:', error);
    return [];
  }
};

const determineFacingMode = async (deviceId: string, label: string): Promise<'user' | 'environment' | undefined> => {
  try {
    // First, try to determine from label since it's more reliable
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('front') || lowerLabel.includes('user') || lowerLabel.includes('facetime')) {
      return 'user';
    }
    if (lowerLabel.includes('back') || lowerLabel.includes('rear') || lowerLabel.includes('environment')) {
      return 'environment';
    }
    
    // If label doesn't help, try testing the device with different facing modes
    // But this approach is problematic, so we'll use a simpler heuristic:
    // On mobile, assume first camera is front (user), second is back (environment)
    return undefined; // Let the calling function handle the assignment based on order
  } catch {
    return undefined;
  }
};

export const getFriendlyCameraName = (camera: CameraDevice, isMobile: boolean): string => {
  if (!isMobile) {
    return camera.label || 'Browser Camera';
  }
  
  // For mobile devices, use facing mode to determine friendly names
  if (camera.facingMode === 'user') {
    return 'Browser Front Camera';
  } else if (camera.facingMode === 'environment') {
    return 'Browser Back Camera';
  } else {
    // Fallback to label-based detection for devices where facingMode couldn't be determined
    const label = camera.label.toLowerCase();
    if (label.includes('front') || label.includes('user')) {
      return 'Browser Front Camera';
    } else if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
      return 'Browser Back Camera';
    } else {
      return camera.label || 'Browser Camera';
    }
  }
};

export const getConstraintsForCamera = (camera: CameraDevice) => {
  const constraints: MediaTrackConstraints = {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
  };
  
  if (camera.deviceId) {
    constraints.deviceId = { exact: camera.deviceId };
  }
  
  if (camera.facingMode) {
    constraints.facingMode = camera.facingMode;
  }
  
  return constraints;
};