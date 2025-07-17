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
import { useState, useRef, useEffect } from 'react';
import {
  CameraTypeAtom,
  RTSPUrlAtom,
  IsRTSPAvailableAtom,
  CameraErrorAtom,
} from './atoms';

export function CameraSelector() {
  const [cameraType, setCameraType] = useAtom(CameraTypeAtom);
  const [rtspUrl, setRtspUrl] = useAtom(RTSPUrlAtom);
  const [isRtspAvailable] = useAtom(IsRTSPAvailableAtom);
  const [, setCameraError] = useAtom(CameraErrorAtom);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditingUrl && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [isEditingUrl]);

  // Auto-switch to USB camera if RTSP becomes unavailable
  useEffect(() => {
    if (cameraType === 'rtsp' && !isRtspAvailable) {
      setCameraType('usb');
      setCameraError(new Error('RTSP camera became unavailable, switched to USB camera'));
    }
  }, [cameraType, isRtspAvailable, setCameraType, setCameraError]);

  const validateRtspUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty URL is valid (will use default)
    
    // Improved RTSP URL validation
    const rtspUrlRegex = /^rtsp:\/\/[^\s/$.?#].[^\s]*$/i;
    return rtspUrlRegex.test(url.trim());
  };

  const handleUrlSave = () => {
    try {
      const trimmedUrl = tempUrl.trim();
      
      if (!validateRtspUrl(trimmedUrl)) {
        throw new Error('Invalid RTSP URL format. Must be rtsp://hostname/path');
      }
      
      setRtspUrl(trimmedUrl || 'rtsp://default.url/stream');
      setIsEditingUrl(false);
      setCameraError(null);
    } catch (error) {
      setCameraError(error instanceof Error ? error : new Error('Invalid RTSP URL'));
    }
  };

  const handleUrlCancel = () => {
    setTempUrl(rtspUrl);
    setIsEditingUrl(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Camera:</label>
        <select
          value={cameraType}
          onChange={(e) => {
            setCameraType(e.target.value as 'usb' | 'rtsp');
            setCameraError(null);
          }}
          className="bg-[var(--input-color)] border-[var(--border-color)] rounded px-2 py-1 text-sm focus:border-[var(--accent-color)] focus:outline-none"
        >
          <option value="usb">Browser USB Camera</option>
          <option value="rtsp">
            RTSP Camera
          </option>
        </select>
      </div>

      {cameraType === 'rtsp' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">URL:</label>
            {isEditingUrl ? (
              <div className="flex items-center gap-2">
                <input
                  ref={urlInputRef}
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="rtsp://camera.url/stream"
                  className="bg-[var(--input-color)] border-[var(--border-color)] rounded px-2 py-1 text-sm focus:border-[var(--accent-color)] focus:outline-none w-48"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlSave();
                    } else if (e.key === 'Escape') {
                      handleUrlCancel();
                    }
                  }}
                />
                <button
                  onClick={handleUrlSave}
                  className="bg-[var(--accent-color)] text-white px-2 py-1 rounded text-sm hover:opacity-80"
                  aria-label="Save RTSP URL"
                >
                  ✓
                </button>
                <button
                  onClick={handleUrlCancel}
                  className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:opacity-80"
                  aria-label="Cancel URL edit"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 max-w-32 truncate font-mono bg-gray-100 px-2 py-1 rounded" title={rtspUrl || 'Not configured'}>
                  {rtspUrl || 'Not configured'}
                </span>
              </div>
            )}
          </div>
          
          {!isEditingUrl && (
            <button
              onClick={() => {
                setTempUrl(rtspUrl);
                setIsEditingUrl(true);
              }}
              className="button flex items-center gap-1 px-3 py-1 text-sm bg-[var(--accent-color)] text-white rounded hover:opacity-80"
              aria-label="Configure RTSP URL"
            >
              <span>⚙️</span>
              <span>Configure URL</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}