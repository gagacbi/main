import {
  ArcRotateCamera, Color4, DefaultRenderingPipeline, Engine, Scene, Vector3,
} from '@babylonjs/core';
import { FOG_COLOR } from './toon';

export type Quality = 'high' | 'medium' | 'low';

export class GameScene {
  engine: Engine; scene: Scene; camera: ArcRotateCamera; pipeline: DefaultRenderingPipeline | null = null; quality: Quality = 'high';
  constructor(public canvas: HTMLCanvasElement, quality: Quality = 'high') {
    this.engine = new Engine(canvas, false, { preserveDrawingBuffer: true, stencil: false, powerPreference: 'high-performance', antialias: false }, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(FOG_COLOR.r, FOG_COLOR.g, FOG_COLOR.b, 1);
    this.scene.skipPointerMovePicking = true; this.scene.autoClear = true;
    this.camera = new ArcRotateCamera('cam', -Math.PI / 2, 1.0, 22, new Vector3(0, 1.6, 0), this.scene);
    this.camera.minZ = 0.4; this.camera.maxZ = 900; this.camera.fov = 0.82;
    this.camera.inputs.clear(); this.camera.lowerBetaLimit = 0.35; this.camera.upperBetaLimit = 1.42; this.camera.lowerRadiusLimit = 8; this.camera.upperRadiusLimit = 40;
    this.setQuality(quality);
    window.addEventListener('resize', () => this.engine.resize());
  }
  setQuality(q: Quality) {
    this.quality = q;
    this.pipeline?.dispose(); this.pipeline = null;
    this.engine.setHardwareScalingLevel(q === 'low' ? 1.4 : 1);
    if (q === 'low') return;
    const p = new DefaultRenderingPipeline('pipe', false, this.scene, [this.camera]);
    p.samples = q === 'high' ? 4 : 1; p.fxaaEnabled = q !== 'high';
    p.bloomEnabled = q === 'high'; p.bloomThreshold = 0.93; p.bloomWeight = 0.3; p.bloomKernel = 48; p.bloomScale = 0.5;
    p.imageProcessingEnabled = true; p.imageProcessing.contrast = 1.14; p.imageProcessing.exposure = 1.03;
    p.imageProcessing.vignetteEnabled = true; p.imageProcessing.vignetteWeight = 1.7; p.imageProcessing.vignetteStretch = 0.2; p.imageProcessing.vignetteCameraFov = 0.8;
    p.imageProcessing.vignetteColor = new Color4(0.08, 0.04, 0.2, 0);
    this.pipeline = p;
  }
}
