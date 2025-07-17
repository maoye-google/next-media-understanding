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

import { useAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import {
  CameraTypeAtom,
  RTSPUrlAtom,
  CameraStreamAtom,
  VideoRefAtom,
  IsCameraConnectingAtom,
  CameraErrorAtom,
  CameraPermissionAtom,
  IsRTSPAvailableAtom,
} from './atoms';

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setVideoRefAtom] = useAtom(VideoRefAtom);
  const [cameraType] = useAtom(CameraTypeAtom);
  const [rtspUrl] = useAtom(RTSPUrlAtom);
  const [cameraStream, setCameraStream] = useAtom(CameraStreamAtom);
  const [isConnecting, setIsConnecting] = useAtom(IsCameraConnectingAtom);
  const [cameraError, setCameraError] = useAtom(CameraErrorAtom);
  const [cameraPermission, setCameraPermission] = useAtom(CameraPermissionAtom);
  const [, setIsRtspAvailable] = useAtom(IsRTSPAvailableAtom);
  const [retryCounter, setRetryCounter] = useState(0);

  // Set video ref in atom for use by other components
  useEffect(() => {
    setVideoRefAtom({ current: videoRef.current });
  }, [setVideoRefAtom]);

  // Handle USB camera stream
  const startUSBCamera = async () => {
    try {
      setIsConnecting(true);
      setCameraError(null);

      // Check for camera permission
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(permission.state);

      if (permission.state === 'denied') {
        throw new Error('Camera permission denied. Please allow camera access and try again.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      setCameraStream(stream);
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error starting USB camera:', error);
      setCameraError(error instanceof Error ? error : new Error('Failed to start USB camera'));
      
      // Only set permission to denied for actual permission errors
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraPermission('denied');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle RTSP camera stream (placeholder implementation)
  const startRTSPCamera = async () => {
    try {
      setIsConnecting(true);
      setCameraError(null);

      if (!rtspUrl) {
        throw new Error('RTSP URL not configured. Please set an RTSP URL.');
      }

      // Check RTSP availability (simple ping test)
      const isAvailable = await checkRTSPAvailability(rtspUrl);
      setIsRtspAvailable(isAvailable);

      if (!isAvailable) {
        throw new Error('RTSP camera is not available. Please check the URL and network connection.');
      }

      // Note: Direct RTSP streaming in browsers requires a proxy server
      // This is a placeholder that would need integration with a WebRTC/HLS proxy
      throw new Error('RTSP streaming requires a proxy server. This feature is not yet implemented.');
      
    } catch (error) {
      console.error('Error starting RTSP camera:', error);
      setCameraError(error instanceof Error ? error : new Error('Failed to start RTSP camera'));
      setIsRtspAvailable(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Simple RTSP availability check
  const checkRTSPAvailability = async (url: string): Promise<boolean> => {
    try {
      // This is a simplified check. In a real implementation, you would
      // ping the RTSP server or check with your proxy server
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // For now, just validate the URL format
      return url.startsWith('rtsp://') && hostname.length > 0;
    } catch {
      return false;
    }
  };

  // Handle USB camera lifecycle
  useEffect(() => {
    if (cameraType === 'usb') {
      startUSBCamera();
      return () => {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
      };
    }
  }, [cameraType, retryCounter]);

  // Handle RTSP camera lifecycle  
  useEffect(() => {
    if (cameraType === 'rtsp') {
      startRTSPCamera();
      // No cleanup needed yet as RTSP is not fully implemented
    }
  }, [cameraType, rtspUrl, retryCounter]);

  // Handle video element loading
  const handleVideoLoad = () => {
    if (videoRef.current && cameraStream) {
      videoRef.current.play().catch(error => {
        console.error('Error playing video:', error);
        setCameraError(new Error('Failed to play video stream'));
      });
    }
  };

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    // Dispatch a custom event to notify Content component of video dimensions
    // This ensures activeMediaDimensions gets updated for overlay positioning
    const event = new CustomEvent('cameraVideoLoaded', {
      detail: {
        width: video.videoWidth,
        height: video.videoHeight,
      }
    });
    window.dispatchEvent(event);
  };

  if (cameraError) {
    return (
      <div className="flex items-center justify-center h-full min-h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Camera Error</h3>
          <p className="text-sm text-gray-600 max-w-md">{cameraError.message}</p>
          <button
            onClick={() => {
              setCameraError(null);
              setRetryCounter(prev => prev + 1);
            }}
            className="mt-4 px-4 py-2 bg-[var(--accent-color)] text-white rounded hover:opacity-80"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-full min-h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-6">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Connecting to {cameraType === 'usb' ? 'USB' : 'RTSP'} Camera
          </h3>
          <p className="text-sm text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full min-h-96">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleVideoLoadedMetadata}
        onLoadedData={handleVideoLoad}
        className="max-w-full max-h-full object-contain rounded-lg"
        style={{ transform: cameraType === 'usb' ? 'scaleX(-1)' : 'none' }} // Mirror USB camera
      />
    </div>
  );
}