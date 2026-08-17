import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

const coarse = matchMedia('(pointer: coarse)').matches;
const memory = Number(navigator.deviceMemory || 0);
const mobileCap = memory && memory <= 4 ? 1.0 : 1.2;

if (coarse) {
  const rendererProto = THREE.WebGLRenderer.prototype;
  if (!rendererProto.__aetherPixelRatioGuard) {
    const setPixelRatio = rendererProto.setPixelRatio;
    rendererProto.setPixelRatio = function (value) {
      return setPixelRatio.call(this, Math.min(value || 1, mobileCap));
    };
    rendererProto.__aetherPixelRatioGuard = true;
  }

  const composerProto = EffectComposer.prototype;
  if (!composerProto.__aetherPixelRatioGuard) {
    const setPixelRatio = composerProto.setPixelRatio;
    composerProto.setPixelRatio = function (value) {
      return setPixelRatio.call(this, Math.min(value || 1, mobileCap));
    };
    composerProto.__aetherPixelRatioGuard = true;
  }

  document.documentElement.dataset.aetherMobilePerf = '1';
}
