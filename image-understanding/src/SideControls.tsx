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

import {useAtom} from 'jotai';
import {
  BumpSessionAtom,
  DrawModeAtom,
  ImageSentAtom,
  ImageSrcAtom,
  IsUploadedImageAtom,
  IsCameraViewActiveAtom,
  CameraTypeAtom,
  CameraStreamAtom,
  IsCameraConnectingAtom,
  CameraErrorAtom,
  RTSPUrlAtom,
  VideoReadyAtom,
} from './atoms';
import {useResetState} from './hooks';
import {ScreenshareButton} from './ScreenshareButton';
import {TakePhotoButton} from './TakePhotoButton';

export function SideControls() {
  const [, setImageSrc] = useAtom(ImageSrcAtom);
  const [drawMode, setDrawMode] = useAtom(DrawModeAtom);
  const [, setIsUploadedImage] = useAtom(IsUploadedImageAtom);
  const [, setBumpSession] = useAtom(BumpSessionAtom);
  const [, setImageSent] = useAtom(ImageSentAtom);
  const [isCameraViewActive, setIsCameraViewActive] = useAtom(IsCameraViewActiveAtom);
  const [cameraType] = useAtom(CameraTypeAtom);
  const [cameraStream, setCameraStream] = useAtom(CameraStreamAtom);
  const [isConnecting] = useAtom(IsCameraConnectingAtom);
  const [cameraError] = useAtom(CameraErrorAtom);
  const [rtspUrl] = useAtom(RTSPUrlAtom);
  const [videoReady] = useAtom(VideoReadyAtom);
  const resetState = useResetState();

  const handleStartCamera = () => {
    // Check if RTSP is selected but no URL is configured
    if (cameraType === 'rtsp' && !rtspUrl.trim()) {
      alert('RTSP URL not configured. Please enter an RTSP URL above.');
      return;
    }
    
    resetState();
    // Set camera view active - CameraView will handle the actual camera start
    setIsCameraViewActive(true);
  };

  const handleStopCamera = () => {
    // Use the global camera controls
    if (window.cameraControls) {
      window.cameraControls.stopCamera();
    }
    // Also clean up local state
    setCameraStream(null);
    setIsCameraViewActive(false);
  };

  const canStartCamera = () => {
    if (cameraType === 'rtsp' && !rtspUrl.trim()) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col gap-3">
      {isCameraViewActive ? (
        <>
          {cameraStream && !isConnecting && videoReady ? (
            <TakePhotoButton />
          ) : (
            <div className="text-center p-2 text-sm text-gray-600">
              {isConnecting ? 'Connecting to camera...' : 
               cameraStream && !videoReady ? 'Loading video...' : 
               'Camera is starting...'}
            </div>
          )}
          <button
            className="button flex gap-3 justify-center items-center bg-red-500 !text-white !border-none"
            onClick={handleStopCamera}
            disabled={isConnecting}
          >
            <div className="text-lg">⏹️</div>
            <div>カメラを停止</div>
          </button>
        </>
      ) : (
        <>
          <label className="flex items-center button bg-[#3B68FF] px-12 !text-white !border-none">
            <input
              className="hidden"
              type="file"
              accept=".jpg, .jpeg, .png, .webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    resetState();
                    setImageSrc(e.target?.result as string);
                    setIsUploadedImage(true);
                    setImageSent(false);
                    setBumpSession((prev) => prev + 1);
                  };
                  reader.onerror = () => {
                    console.error('Error reading file:', reader.error);
                    alert('Failed to read the selected file. Please try again.');
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <div>イメージをアップロード</div>
          </label>
          
          <button
            className="button flex gap-3 justify-center items-center bg-[var(--accent-color)] !text-white !border-none"
            onClick={handleStartCamera}
            disabled={!canStartCamera() || isConnecting}
            title={!canStartCamera() ? 'Please configure RTSP URL first' : ''}
          >
            <div className="text-lg">📷</div>
            <div>カメラを利用</div>
          </button>
        </>
      )}
      
      <div className="hidden">
        <button
          className="button flex gap-3 justify-center items-center"
          onClick={() => {
            setDrawMode(!drawMode);
          }}>
          <div className="text-lg"> 🎨</div>
          <div>Draw on image</div>
        </button>
        <ScreenshareButton />
      </div>
    </div>
  );
}
