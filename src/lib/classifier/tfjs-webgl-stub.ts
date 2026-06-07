// Replaces @tensorflow/tfjs-backend-webgl with a no-op stub.
// The CPU backend (bundled in @tensorflow/tfjs) handles all inference.
// Small text-classification models have no perceptible perf difference on CPU.

export const version_webgl = '0.0.0';
export const GPGPUContext = class {} as any;
export const MathBackendWebGL = class {} as any;
export const forceHalfFloat = () => {};
export const gpgpu_util = {} as any;
export const setWebGLContext = () => {};
export const webgl = {} as any;
export const webgl_util = {} as any;
