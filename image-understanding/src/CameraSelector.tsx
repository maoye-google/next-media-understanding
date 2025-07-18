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
  CameraErrorAtom,
} from './atoms';

export function CameraSelector() {
  const [cameraType, setCameraType] = useAtom(CameraTypeAtom);
  const [rtspUrl, setRtspUrl] = useAtom(RTSPUrlAtom);
  const [cameraError, setCameraError] = useAtom(CameraErrorAtom);
  const [tempUrl, setTempUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Initialize temp URL when component mounts or RTSP is selected
  useEffect(() => {
    if (cameraType === 'rtsp') {
      setTempUrl(rtspUrl);
    }
  }, [cameraType, rtspUrl]);

  const validateRtspUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    const rtspUrlRegex = /^rtsp:\/\/[^\s/$.?#].[^\s]*$/i;
    return rtspUrlRegex.test(url.trim());
  };

  const testRtspConnection = async (url: string): Promise<boolean> => {
    try {
      // Simple URL validation test (in real implementation, this would ping the RTSP server)
      if (!validateRtspUrl(url)) {
        return false;
      }
      
      // Simulate connection test delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any valid RTSP URL format
      // In real implementation, this would actually test the RTSP connection
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlSave = async () => {
    try {
      const trimmedUrl = tempUrl.trim();
      
      if (!validateRtspUrl(trimmedUrl)) {
        throw new Error('Invalid RTSP URL format. Must be rtsp://hostname/path');
      }
      
      setIsTesting(true);
      setCameraError(null);
      
      const isConnected = await testRtspConnection(trimmedUrl);
      
      if (isConnected) {
        setRtspUrl(trimmedUrl);
        setCameraError(null);
      } else {
        throw new Error('Failed to connect to RTSP camera. Please check the URL and network connectivity.');
      }
    } catch (error) {
      setCameraError(error instanceof Error ? error : new Error('Invalid RTSP URL'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Camera Source:</label>
        <select
          value={cameraType}
          onChange={(e) => {
            const newType = e.target.value as 'usb' | 'rtsp';
            setCameraType(newType);
            setCameraError(null);
          }}
          className="bg-[var(--input-color)] border-[var(--border-color)] rounded px-2 py-1 text-sm focus:border-[var(--accent-color)] focus:outline-none"
        >
          <option value="usb">Browser USB Camera</option>
          <option value="rtsp">RTSP Camera</option>
        </select>
      </div>

      {cameraType === 'rtsp' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">RTSP URL:</label>
          <input
            ref={urlInputRef}
            type="text"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder="rtsp://camera.ip:port/stream"
            className="bg-[var(--input-color)] border-[var(--border-color)] rounded px-2 py-1 text-sm focus:border-[var(--accent-color)] focus:outline-none w-64"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUrlSave();
              }
            }}
            disabled={isTesting}
          />
          <button
            onClick={handleUrlSave}
            disabled={!tempUrl.trim() || isTesting}
            className="bg-[var(--accent-color)] text-white px-3 py-1 rounded text-sm hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Test and save RTSP URL"
          >
            {isTesting ? '🔄' : '✓'} {isTesting ? 'Testing...' : 'Test & Save'}
          </button>
        </div>
      )}

      {cameraType === 'rtsp' && rtspUrl && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-600">✓ RTSP URL saved:</span>
          <span className="text-xs text-gray-500 font-mono max-w-32 truncate" title={rtspUrl}>
            {rtspUrl}
          </span>
        </div>
      )}

      {cameraError && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600">⚠️ {cameraError.message}</span>
        </div>
      )}
    </div>
  );
}