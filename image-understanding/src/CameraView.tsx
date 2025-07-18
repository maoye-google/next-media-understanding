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
  IsCameraViewActiveAtom,
  VideoReadyAtom,
} from './atoms';

// Global type declaration for camera controls
declare global {
  interface Window {
    cameraControls?: {
      startCamera: () => Promise<void>;
      stopCamera: () => void;
    };
  }
}

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
  const [isCameraViewActive, setIsCameraViewActive] = useAtom(IsCameraViewActiveAtom);
  const [, setVideoReady] = useAtom(VideoReadyAtom);
  const [retryCounter, setRetryCounter] = useState(0);

  // Set video ref in atom for use by other components - update whenever video ref changes
  useEffect(() => {
    setVideoRefAtom({ current: videoRef.current });
  }, [setVideoRefAtom, videoRef.current]);

  // Ensure video element gets the stream when it changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      
      // Force load metadata
      video.load();
      
      // Play the video and wait for it to be ready
      video.play().then(() => {
        console.log('Video started playing successfully');
      }).catch(error => {
        console.error('Error playing video:', error);
        setCameraError(new Error('Failed to play video stream'));
      });
    }
  }, [cameraStream]);

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
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      setCameraStream(stream);
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(console.error);
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
      throw new Error('RTSP streaming requires a WebRTC/HLS proxy server to work in browsers. Direct RTSP connections are not supported by web browsers for security reasons. Consider using a streaming server like GStreamer, FFmpeg, or Node Media Server to convert RTSP to WebRTC/HLS format.');
      
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

  // Manual camera start functions (called by Start Camera button)
  const startCamera = async () => {
    if (cameraType === 'usb') {
      await startUSBCamera();
    } else if (cameraType === 'rtsp') {
      await startRTSPCamera();
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setVideoReady(false);
    setIsCameraViewActive(false);
  };

  // Auto-start camera when camera view becomes active
  useEffect(() => {
    if (isCameraViewActive && !cameraStream && !isConnecting && !cameraError) {
      setVideoReady(false); // Reset video ready state before starting
      startCamera();
    }
  }, [isCameraViewActive, cameraStream, isConnecting, cameraError]);

  // Expose start/stop functions to parent components
  useEffect(() => {
    window.cameraControls = { startCamera, stopCamera };
    return () => {
      delete window.cameraControls;
    };
  }, [cameraType, rtspUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Show camera preview area when camera view is not active
  if (!isCameraViewActive) {
    return (
      <div className="flex items-center justify-center h-full min-h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Camera Ready</h3>
          <p className="text-sm text-gray-600">
            {cameraType === 'usb' ? 'USB Camera selected' : 'RTSP Camera selected'}
            <br />
            Click "Start Camera" to begin streaming
          </p>
        </div>
      </div>
    );
  }

  // Handle video element loading
  const handleVideoLoad = () => {
    if (videoRef.current && cameraStream) {
      const video = videoRef.current;
      console.log('Video loadeddata event fired', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      
      video.play().catch(error => {
        console.error('Error playing video:', error);
        setCameraError(new Error('Failed to play video stream'));
      });
    }
  };

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    console.log('Video metadata loaded', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState
    });
    
    // Update video ref to ensure TakePhotoButton gets the correct reference
    setVideoRefAtom({ current: video });
    
    // Check if video has valid dimensions
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoReady(true);
    }
    
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
    <div className="flex items-center justify-center h-full min-h-96 w-full p-4">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleVideoLoadedMetadata}
        onLoadedData={handleVideoLoad}
        onCanPlay={() => console.log('Video can start playing')}
        onCanPlayThrough={() => console.log('Video can play through')}
        onPlaying={() => console.log('Video is playing')}
        onWaiting={() => console.log('Video is waiting for data')}
        onError={(e) => {
          console.error('Video error:', e);
          setCameraError(new Error('Video element error'));
        }}
        className="object-contain rounded-lg shadow-lg"
        style={{ 
          transform: cameraType === 'usb' ? 'scaleX(-1)' : 'none', // Mirror USB camera
          maxWidth: 'min(500px, 70vw)',
          maxHeight: 'min(375px, 50vh)',
          width: 'auto',
          height: 'auto',
          border: '2px solid #e5e7eb'
        }}
      />
    </div>
  );
}