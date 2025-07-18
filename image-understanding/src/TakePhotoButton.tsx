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
import {
  ImageSrcAtom,
  IsUploadedImageAtom,
  ShareStream,
  VideoRefAtom,
  IsCameraViewActiveAtom,
  BumpSessionAtom,
  CameraStreamAtom,
  CameraErrorAtom,
  VideoReadyAtom,
} from './atoms';
import { useResetState } from './hooks';

export function TakePhotoButton() {
  const [videoRef] = useAtom(VideoRefAtom);
  const [, setImageSrc] = useAtom(ImageSrcAtom);
  const [, setStream] = useAtom(ShareStream);
  const [, setIsUploadedImage] = useAtom(IsUploadedImageAtom);
  const [, setIsCameraViewActive] = useAtom(IsCameraViewActiveAtom);
  const [, setBumpSession] = useAtom(BumpSessionAtom);
  const [cameraStream, setCameraStream] = useAtom(CameraStreamAtom);
  const [, setCameraError] = useAtom(CameraErrorAtom);
  const [videoReady] = useAtom(VideoReadyAtom);
  const resetState = useResetState();

  const handleTakePhoto = () => {
    try {
      // Try to get video element from ref first, then fallback to DOM query
      let video = videoRef.current;
      
      if (!video || video.videoWidth === 0) {
        // Fallback: try to find video element in DOM
        const videoElements = document.querySelectorAll('video');
        for (const videoEl of videoElements) {
          if (videoEl.srcObject === cameraStream && videoEl.videoWidth > 0) {
            video = videoEl;
            break;
          }
        }
      }
      
      if (!video) {
        throw new Error('Video element not available');
      }
      
      // Debug logging
      console.log('Video debug info:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        paused: video.paused,
        ended: video.ended,
        srcObject: video.srcObject,
        currentTime: video.currentTime,
        videoReady: videoReady,
        cameraStream: cameraStream,
        videoRefCurrent: videoRef.current
      });
      
      // Check if video has valid dimensions and is playing
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error(`Video stream not ready or has invalid dimensions. Width: ${video.videoWidth}, Height: ${video.videoHeight}, ReadyState: ${video.readyState}`);
      }
      
      if (video.paused || video.ended) {
        throw new Error('Video is not currently playing');
      }
      
      // Additional readiness check
      if (video.readyState < 2) {
        throw new Error('Video metadata not loaded yet. Please wait a moment and try again.');
      }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas 2D context');
        }

        // Draw the current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Stop the video stream tracks
        const currentStream = video.srcObject as MediaStream;
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }

        // Reset state before setting new image
        resetState();

        // Set new image state
        setImageSrc(dataUrl);
        setIsUploadedImage(true);

        // Clean up stream and camera view state
        setStream(null);
        setCameraStream(null);
        setIsCameraViewActive(false);
        setCameraError(null);
    } catch (error) {
      console.error('Error taking photo:', error);
      setCameraError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  };

  return (
    <button
      className="button flex gap-3 justify-center items-center"
      onClick={handleTakePhoto}
    >
      <div className="text-lg">📸</div>
      <div>Take a Photo</div>
    </button>
  );
}