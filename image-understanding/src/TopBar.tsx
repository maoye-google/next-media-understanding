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
import {DetectTypeAtom, HoverEnteredAtom, RevealOnHoverModeAtom, SelectedModelAtom} from './atoms';
import {modelOptions} from './consts';
import {useResetState} from './hooks';
import {CameraSelector} from './CameraSelector';

export function TopBar() {
  const resetState = useResetState();
  const [revealOnHover, setRevealOnHoverMode] = useAtom(RevealOnHoverModeAtom);
  const [detectType] = useAtom(DetectTypeAtom);
  const [, setHoverEntered] = useAtom(HoverEnteredAtom);
  const [selectedModel, setSelectedModel] = useAtom(SelectedModelAtom);

  return (
    <div className="flex w-full items-center px-3 py-2 border-b justify-between">
      <div className="flex gap-3 items-center">
        <button
          onClick={() => {
            resetState();
          }}
          className="!p-0 !border-none underline bg-transparent"
          style={{
            minHeight: '0',
          }}>
          <div>Reset session</div>
        </button>
      </div>
      <div className="flex gap-3 items-center">
        <CameraSelector />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Model:</label>
          <select
            value={selectedModel.modelId}
            onChange={(e) => {
              const model = modelOptions.find(m => m.modelId === e.target.value);
              if (model) {
                setSelectedModel(model);
              }
            }}
            className="bg-[var(--input-color)] border-[var(--border-color)] rounded px-2 py-1 text-sm focus:border-[var(--accent-color)] focus:outline-none"
          >
            {modelOptions.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>
        {detectType === '2D bounding boxes' ||
        detectType === 'Segmentation masks' ? (
          <div>
            <label className="flex items-center gap-2 px-3 select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={revealOnHover}
                onChange={(e) => {
                  if (e.target.checked) {
                    setHoverEntered(false);
                  }
                  setRevealOnHoverMode(e.target.checked);
                }}
              />
              <div>reveal on hover</div>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
