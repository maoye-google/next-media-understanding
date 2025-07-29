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
import {DetectTypeAtom, HoverEnteredAtom} from './atoms';
import {DetectTypes} from './Types';

export function DetectTypeSelector() {
  const detectOptions = [
    { englishValue: '2D bounding boxes', label: '2D バウンディングボックス' },
    { englishValue: 'Segmentation masks', label: 'セグメンテーションマスク' },
    { englishValue: 'Points', label: 'ポイント' },
    { englishValue: '3D bounding boxes', label: '3D バウンディングボックス' },
  ];

  return (
    <div className="flex flex-col flex-shrink-0">
      <div className="mb-3 uppercase">処理目標:</div>
      <div className="flex flex-col gap-3">
        {detectOptions.map((option) => (
          <SelectOption 
            key={option.englishValue} 
            englishValue={option.englishValue as DetectTypes}
            label={option.label} 
          />
        ))}
      </div>
    </div>
  );
}

function SelectOption({englishValue, label}: {englishValue: DetectTypes; label: string}) {
  const [detectType, setDetectType] = useAtom(DetectTypeAtom);
  const [, setHoverEntered] = useAtom(HoverEnteredAtom);
  // const resetState = useResetState();

  return (
    <button
      className="py-6 items-center bg-transparent text-center gap-3"
      style={{
        borderColor: detectType === englishValue ? 'var(--accent-color)' : undefined,
        backgroundColor:
          detectType === englishValue ? 'var(--border-color)' : undefined,
      }}
      onClick={() => {
        setHoverEntered(false);
        setDetectType(englishValue);
      }}>
      {label}
    </button>
  );
}
