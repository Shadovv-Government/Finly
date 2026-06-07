// Replaces @tensorflow/tfjs-backend-webgl with a no-op stub.
// The CPU backend (bundled in @tensorflow/tfjs) handles all inference.
// Small text-classification models have no perceptible perf difference on CPU.

export const version_webgl = '0.0.0';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GPGPUContext = class {} as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MathBackendWebGL = class {} as any;
export const forceHalfFloat = () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gpgpu_util = {} as any;
export const setWebGLContext = () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webgl = {} as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webgl_util = {} as any;
