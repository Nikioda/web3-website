/**
 * VKON AUTOMATION — 3D MOTOR PROTECTION SIMULATOR & DIGITAL TWIN
 * Built with Three.js, OrbitControls, GSAP & Web Audio API
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  class VkonAudioEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.motorOsc = null;
      this.motorGain = null;
      this.waterNoiseNode = null;
      this.waterGain = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.setupContinuousSounds();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setupContinuousSounds() {
      if (!this.ctx) return;

      // Motor Hum (50Hz fundamental + harmonics)
      this.motorOsc = this.ctx.createOscillator();
      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

      const motorFilter = this.ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.motorOsc.connect(motorFilter);
      motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);
      this.motorOsc.start();

      // Water Flow Noise (Filtered Pink Noise buffer)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.15;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = 'bandpass';
      waterFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      waterFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      this.waterGain = this.ctx.createGain();
      this.waterGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

      whiteNoise.connect(waterFilter);
      waterFilter.connect(this.waterGain);
      this.waterGain.connect(this.ctx.destination);
      whiteNoise.start();
    }

    setRunning(isRunning) {
      if (!this.ctx || !this.enabled) return;
      const now = this.ctx.currentTime;
      if (isRunning) {
        this.motorGain.gain.setTargetAtTime(0.04, now, 0.2);
        this.waterGain.gain.setTargetAtTime(0.05, now, 0.4);
      } else {
        this.motorGain.gain.setTargetAtTime(0.0001, now, 0.15);
        this.waterGain.gain.setTargetAtTime(0.0001, now, 0.25);
      }
    }

    playRelayClick(isEngaged) {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(isEngaged ? 320 : 180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    }

    playAlarm() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.1);
      osc.frequency.setValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    }

    playArcSpark() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const node = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }
      node.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);

      node.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      node.start(now);
    }

    toggle() {
      this.enabled = !this.enabled;
      if (!this.enabled && this.ctx) {
        if (this.motorGain) this.motorGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        if (this.waterGain) this.waterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      } else if (this.enabled) {
        this.init();
      }
      return this.enabled;
    }
  }

  const audio = new VkonAudioEngine();

  // --- STATE SYSTEM ---
  const state = {
    fault: 'normal', // 'normal', 'dry-run', 'single-phase', 'voltage-spike', 'phase-reversal', 'overload', 'rotary-lock'
    isRunning: true,
    viewMode: 'realistic', // 'realistic', 'xray', 'thermal'
    cameraPreset: 'dual',
    telemetry: {
      vR: 415,
      vY: 412,
      vB: 418,
      aR: 14.2,
      aY: 14.1,
      aB: 14.3,
      freq: 50.0,
      rpm: 2850,
      lpm: 310,
      tripSpeed: '< 0.6s'
    },
    doorOpen: false,
    waterLevelY: -3.5,
    impellerSpeed: 1.0,
    windingTemp: 0.0 // 0 to 1
  };

  // --- THREE.JS SCENE SETUP ---
  const canvas = document.getElementById('webgl-canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0d12, 0.025);

  const camera = new THREE.PerspectiveCamera(
    42,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 3, 14);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxDistance = 25;
  controls.minDistance = 3;
  controls.maxPolarAngle = Math.PI / 2 + 0.25; // Don't flip under
  controls.target.set(0, 0, 0);

  // --- LIGHTING ---
  const ambientLight = new THREE.AmbientLight(0xd0e0ff, 0.45);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(8, 14, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const cyanRimLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
  cyanRimLight.position.set(-10, 5, -8);
  scene.add(cyanRimLight);

  const amberFillLight = new THREE.PointLight(0xff7700, 1.2, 12);
  amberFillLight.position.set(-3.5, 2.5, 3);
  scene.add(amberFillLight);

  const borewellBlueLight = new THREE.PointLight(0x00aaff, 1.5, 14);
  borewellBlueLight.position.set(3.5, -3, 2);
  scene.add(borewellBlueLight);

  // --- PROCEDURAL TEXTURES ---
  function createMetalNormalTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      imgData.data[i] = 128 + n;
      imgData.data[i + 1] = 128 + n;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }
  const metalNormal = createMetalNormalTexture();

  // Create OLED Digital Display Texture for Vkon Panel
  let oledCanvas, oledCtx, oledTexture;
  function createOledDisplayTexture() {
    oledCanvas = document.createElement('canvas');
    oledCanvas.width = 512;
    oledCanvas.height = 256;
    oledCtx = oledCanvas.getContext('2d');
    oledTexture = new THREE.CanvasTexture(oledCanvas);
    updateOledTexture();
    return oledTexture;
  }

  function updateOledTexture() {
    if (!oledCtx) return;
    oledCtx.fillStyle = '#060a0f';
    oledCtx.fillRect(0, 0, 512, 256);

    // Screen border bevel
    oledCtx.strokeStyle = '#00f0ff';
    oledCtx.lineWidth = 4;
    oledCtx.strokeRect(6, 6, 500, 244);

    // Header bar
    oledCtx.fillStyle = '#0f1722';
    oledCtx.fillRect(10, 10, 492, 40);
    oledCtx.fillStyle = '#00f0ff';
    oledCtx.font = 'bold 20px "IBM Plex Mono", monospace';
    oledCtx.fillText('VKON INTELLISENSE • PRO-3P', 20, 38);

    // Status Pill
    if (state.fault === 'normal') {
      oledCtx.fillStyle = '#10b981';
      oledCtx.fillText('HEALTHY [AUTO]', 330, 38);
    } else {
      oledCtx.fillStyle = '#ff3355';
      oledCtx.fillText('TRIP / FAULT', 340, 38);
    }

    // Phase Voltages
    oledCtx.fillStyle = '#94a3b8';
    oledCtx.font = '16px "IBM Plex Mono", monospace';
    oledCtx.fillText('VOLTS', 20, 80);
    oledCtx.fillText('AMPS', 20, 140);

    // R Phase
    oledCtx.fillStyle = '#ff4444';
    oledCtx.font = 'bold 28px "IBM Plex Mono", monospace';
    oledCtx.fillText(`R: ${Math.round(state.telemetry.vR)}V`, 90, 80);
    oledCtx.fillText(`${state.telemetry.aR.toFixed(1)}A`, 90, 140);

    // Y Phase
    oledCtx.fillStyle = '#eab308';
    oledCtx.fillText(`Y: ${Math.round(state.telemetry.vY)}V`, 225, 80);
    oledCtx.fillText(`${state.telemetry.aY.toFixed(1)}A`, 225, 140);

    // B Phase
    oledCtx.fillStyle = '#38bdf8';
    oledCtx.fillText(`B: ${Math.round(state.telemetry.vB)}V`, 360, 80);
    oledCtx.fillText(`${state.telemetry.aB.toFixed(1)}A`, 360, 140);

    // Bottom telemetry line
    oledCtx.fillStyle = '#0f1722';
    oledCtx.fillRect(10, 175, 492, 70);
    oledCtx.fillStyle = '#38bdf8';
    oledCtx.font = '18px "IBM Plex Mono", monospace';

    if (state.fault === 'normal') {
      oledCtx.fillText(`FREQ: ${state.telemetry.freq.toFixed(1)}Hz   RPM: ${state.telemetry.rpm}   FLOW: ${state.telemetry.lpm}LPM`, 25, 215);
    } else if (state.fault === 'dry-run') {
      oledCtx.fillStyle = '#ff9900';
      oledCtx.fillText('ALARM: DRY RUN CAVITATION • WATER DEPLETED', 25, 215);
    } else if (state.fault === 'single-phase') {
      oledCtx.fillStyle = '#ff3355';
      oledCtx.fillText('TRIP: SINGLE PHASING DETECTED • CUTOUT 0.6s', 25, 215);
    } else if (state.fault === 'voltage-spike') {
      oledCtx.fillStyle = '#ff3355';
      oledCtx.fillText('TRIP: OUT OF SAFE BAND (340V - 460V)', 25, 215);
    } else if (state.fault === 'phase-reversal') {
      oledCtx.fillStyle = '#a855f7';
      oledCtx.fillText('ERR: PHASE SEQUENCE INVERTED • STARTER LOCKED', 25, 215);
    } else if (state.fault === 'overload') {
      oledCtx.fillStyle = '#f97316';
      oledCtx.fillText('TRIP: CT OVERLOAD CURRENT > 18.0A LIMIT', 25, 215);
    } else if (state.fault === 'rotary-lock') {
      oledCtx.fillStyle = '#ff3355';
      oledCtx.fillText('CRITICAL: ROTOR MECHANICALLY JAMMED (LOCKED)', 25, 215);
    }

    if (oledTexture) oledTexture.needsUpdate = true;
  }

  // --- 3D ROOT GROUPS ---
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const panelGroup = new THREE.Group();
  panelGroup.position.set(-3.6, 1.2, 0);
  worldGroup.add(panelGroup);

  const borewellGroup = new THREE.Group();
  borewellGroup.position.set(3.4, 0, 0);
  worldGroup.add(borewellGroup);

  // Materials Library
  const materials = {
    panelMetal: new THREE.MeshStandardMaterial({
      color: 0x181e26,
      roughness: 0.42,
      metalness: 0.85,
      normalMap: metalNormal,
      normalScale: new THREE.Vector2(0.15, 0.15)
    }),
    panelBezel: new THREE.MeshStandardMaterial({
      color: 0x0f1318,
      roughness: 0.6,
      metalness: 0.4
    }),
    glassWindow: new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      transmission: 0.75,
      opacity: 0.85,
      transparent: true,
      roughness: 0.15,
      ior: 1.5
    }),
    copperCoil: new THREE.MeshStandardMaterial({
      color: 0xd97736,
      metalness: 0.95,
      roughness: 0.25
    }),
    copperHot: new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff2200,
      emissiveIntensity: 0.85,
      roughness: 0.3
    }),
    steelStainless: new THREE.MeshStandardMaterial({
      color: 0xdde4ec,
      metalness: 0.92,
      roughness: 0.22,
      normalMap: metalNormal,
      normalScale: new THREE.Vector2(0.1, 0.1)
    }),
    pvcColumn: new THREE.MeshStandardMaterial({
      color: 0x1f4788,
      roughness: 0.65,
      metalness: 0.1
    }),
    boreholeRock: new THREE.MeshStandardMaterial({
      color: 0x222a33,
      roughness: 0.9,
      metalness: 0.1
    }),
    aquiferWater: new THREE.MeshPhysicalMaterial({
      color: 0x0099ff,
      transmission: 0.85,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      ior: 1.33
    }),
    cableR: new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.5 }),
    cableY: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }),
    cableB: new THREE.MeshStandardMaterial({ color: 0x0088ff, roughness: 0.5 }),
    cableJacket: new THREE.MeshStandardMaterial({ color: 0x1e2631, roughness: 0.7 }),
    ledGreen: new THREE.MeshBasicMaterial({ color: 0x10b981 }),
    ledRed: new THREE.MeshBasicMaterial({ color: 0xff3355 }),
    ledAmber: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
    ledBlue: new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  };

  // --- BUILD 3D VKON CONTROL STARTER PANEL ---
  const panelDoorGroup = new THREE.Group();
  let contactorBridgeMesh = null;
  let ctCoilMeshes = [];
  let panelLedMeshes = [];

  function buildVkonPanel() {
    // Wall mount plate
    const wallPlateGeo = new THREE.BoxGeometry(3.6, 4.6, 0.08);
    const wallPlate = new THREE.Mesh(wallPlateGeo, materials.panelMetal);
    wallPlate.position.set(0, 0, -0.6);
    wallPlate.castShadow = true;
    panelGroup.add(wallPlate);

    // Main steel enclosure box (back/sides)
    const boxGeo = new THREE.BoxGeometry(3.2, 4.2, 1.1);
    const boxMesh = new THREE.Mesh(boxGeo, materials.panelMetal);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    panelGroup.add(boxMesh);

    // Side cooling ventilation slits
    for (let i = -1.2; i <= 1.2; i += 0.35) {
      const ventGeo = new THREE.BoxGeometry(0.04, 0.06, 0.65);
      const ventL = new THREE.Mesh(ventGeo, materials.panelBezel);
      ventL.position.set(-1.62, i, 0);
      panelGroup.add(ventL);

      const ventR = new THREE.Mesh(ventGeo, materials.panelBezel);
      ventR.position.set(1.62, i, 0);
      panelGroup.add(ventR);
    }

    // Door Group (hinged at left side)
    panelDoorGroup.position.set(-1.6, 0, 0.56);
    panelGroup.add(panelDoorGroup);

    const doorLeafGeo = new THREE.BoxGeometry(3.2, 4.2, 0.12);
    const doorLeaf = new THREE.Mesh(doorLeafGeo, materials.panelMetal);
    doorLeaf.position.set(1.6, 0, 0);
    doorLeaf.castShadow = true;
    panelDoorGroup.add(doorLeaf);

    // Beveled frame for OLED Display Window
    const windowFrameGeo = new THREE.BoxGeometry(2.4, 1.4, 0.06);
    const windowFrame = new THREE.Mesh(windowFrameGeo, materials.panelBezel);
    windowFrame.position.set(1.6, 0.9, 0.08);
    panelDoorGroup.add(windowFrame);

    // OLED Display Canvas Screen
    const oledTex = createOledDisplayTexture();
    const screenGeo = new THREE.PlaneGeometry(2.2, 1.2);
    const screenMat = new THREE.MeshBasicMaterial({ map: oledTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(1.6, 0.9, 0.12);
    panelDoorGroup.add(screenMesh);

    // Status Indicator LEDs (Normal, Trip, Auto, Solar)
    const ledX = [0.8, 1.3, 1.8, 2.3];
    const ledMats = [materials.ledGreen, materials.ledRed, materials.ledAmber, materials.ledBlue];
    ledX.forEach((x, idx) => {
      const ledGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16);
      ledGeo.rotateX(Math.PI / 2);
      const ledMesh = new THREE.Mesh(ledGeo, ledMats[idx]);
      ledMesh.position.set(x, 0.05, 0.09);
      panelDoorGroup.add(ledMesh);
      panelLedMeshes.push(ledMesh);

      const ringGeo = new THREE.RingGeometry(0.07, 0.1, 16);
      const ring = new THREE.Mesh(ringGeo, materials.panelBezel);
      ring.position.set(x, 0.05, 0.1);
      panelDoorGroup.add(ring);
    });

    // Big Push Buttons: START (Green), STOP/RESET (Red)
    const startBtnGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.15, 24);
    startBtnGeo.rotateX(Math.PI / 2);
    const startBtnMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
    const startBtn = new THREE.Mesh(startBtnGeo, startBtnMat);
    startBtn.position.set(1.0, -0.65, 0.1);
    panelDoorGroup.add(startBtn);

    const stopBtnGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24);
    stopBtnGeo.rotateX(Math.PI / 2);
    const stopBtnMat = new THREE.MeshStandardMaterial({ color: 0xff2244, roughness: 0.3 });
    const stopBtn = new THREE.Mesh(stopBtnGeo, stopBtnMat);
    stopBtn.position.set(2.2, -0.65, 0.12);
    panelDoorGroup.add(stopBtn);

    // Rotary Bypass / Mode Selector Switch
    const rotaryBaseGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 24);
    rotaryBaseGeo.rotateX(Math.PI / 2);
    const rotaryBase = new THREE.Mesh(rotaryBaseGeo, materials.panelBezel);
    rotaryBase.position.set(1.6, -1.35, 0.08);
    panelDoorGroup.add(rotaryBase);

    const knobGeo = new THREE.BoxGeometry(0.08, 0.32, 0.15);
    const knob = new THREE.Mesh(knobGeo, materials.panelMetal);
    knob.position.set(1.6, -1.35, 0.15);
    panelDoorGroup.add(knob);

    // Brand badge plate on door
    const badgeGeo = new THREE.BoxGeometry(1.8, 0.25, 0.02);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8, roughness: 0.2 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(1.6, 1.8, 0.07);
    panelDoorGroup.add(badge);

    // --- INTERNAL HARDWARE (Visible inside or via X-Ray) ---
    const internalGroup = new THREE.Group();
    internalGroup.position.set(0, 0, 0);
    panelGroup.add(internalGroup);

    // Backplane PCB / Mounting Din Rail
    const dinRailGeo = new THREE.BoxGeometry(2.8, 0.2, 0.05);
    const dinRail1 = new THREE.Mesh(dinRailGeo, materials.steelStainless);
    dinRail1.position.set(0, 0.5, -0.3);
    internalGroup.add(dinRail1);

    const dinRail2 = new THREE.Mesh(dinRailGeo, materials.steelStainless);
    dinRail2.position.set(0, -0.7, -0.3);
    internalGroup.add(dinRail2);

    // 3-Phase Heavy Duty Magnetic Contactor
    const contactorBodyGeo = new THREE.BoxGeometry(1.8, 1.2, 0.6);
    const contactorBody = new THREE.Mesh(contactorBodyGeo, materials.panelBezel);
    contactorBody.position.set(0, 0.5, 0);
    internalGroup.add(contactorBody);

    // Contactor Solenoid Armature Bridge (Moves dynamically on trip!)
    const bridgeGeo = new THREE.BoxGeometry(1.5, 0.15, 0.2);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.3 });
    contactorBridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
    contactorBridgeMesh.position.set(0, 0.8, 0.15);
    internalGroup.add(contactorBridgeMesh);

    // 3 Toroid Current Transformers (CT coils for Phase R, Y, B)
    const ctX = [-0.65, 0, 0.65];
    ctX.forEach((x, i) => {
      const ctGeo = new THREE.TorusGeometry(0.22, 0.08, 16, 32);
      const ctMesh = new THREE.Mesh(ctGeo, materials.copperCoil);
      ctMesh.position.set(x, -0.7, 0.05);
      internalGroup.add(ctMesh);
      ctCoilMeshes.push(ctMesh);

      // Wire passing right through CT toroid hole
      const passWireGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12);
      const wireMat = i === 0 ? materials.cableR : (i === 1 ? materials.cableY : materials.cableB);
      const passWire = new THREE.Mesh(passWireGeo, wireMat);
      passWire.position.set(x, -0.7, 0.05);
      internalGroup.add(passWire);
    });

    // Microcontroller Solid-State Board with glowing traces
    const mcuBoardGeo = new THREE.BoxGeometry(2.4, 0.8, 0.04);
    const mcuBoardMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.4 });
    const mcuBoard = new THREE.Mesh(mcuBoardGeo, mcuBoardMat);
    mcuBoard.position.set(0, -1.5, -0.2);
    internalGroup.add(mcuBoard);

    const mcuChipGeo = new THREE.BoxGeometry(0.5, 0.5, 0.08);
    const mcuChipMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
    const mcuChip = new THREE.Mesh(mcuChipGeo, mcuChipMat);
    mcuChip.position.set(0, -1.5, -0.14);
    internalGroup.add(mcuChip);

    // Cable Glands at bottom of panel
    [-0.8, 0, 0.8].forEach((gx) => {
      const glandGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16);
      const gland = new THREE.Mesh(glandGeo, materials.panelBezel);
      gland.position.set(gx, -2.2, 0);
      panelGroup.add(gland);
    });
  }

  // --- BUILD 3D BOREWELL RIG & SUBMERSIBLE PUMP ---
  let impellerAssemblyGroup = new THREE.Group();
  let statorWindingMesh = null;
  let waterTableMesh = null;
  let columnPipeMesh = null;

  function buildBorewellRig() {
    // Geological Strata Cylinder Cutaway (Cross-section view into earth)
    const stratumGeo = new THREE.CylinderGeometry(2.8, 2.8, 9.5, 36, 1, false, 0, Math.PI * 1.5);
    const stratumMat = new THREE.MeshStandardMaterial({
      color: 0x1e2732,
      roughness: 0.85,
      side: THREE.DoubleSide
    });
    const stratum = new THREE.Mesh(stratumGeo, stratumMat);
    stratum.position.set(0, -2.5, 0);
    stratum.rotation.y = Math.PI * 0.75;
    stratum.receiveShadow = true;
    borewellGroup.add(stratum);

    // Steel Casing Pipe going down borehole
    const casingGeo = new THREE.CylinderGeometry(1.15, 1.15, 10, 32, 1, true);
    const casing = new THREE.Mesh(casingGeo, materials.steelStainless);
    casing.position.set(0, -2.5, 0);
    borewellGroup.add(casing);

    // Underground Aquifer Water Reservoir Volume
    const waterGeo = new THREE.CylinderGeometry(1.12, 1.12, 4.5, 32);
    waterTableMesh = new THREE.Mesh(waterGeo, materials.aquiferWater);
    waterTableMesh.position.set(0, state.waterLevelY, 0);
    borewellGroup.add(waterTableMesh);

    // Vertical Delivery Column Pipe (Water discharge conduit)
    const pipeGeo = new THREE.CylinderGeometry(0.24, 0.24, 8, 24);
    columnPipeMesh = new THREE.Mesh(pipeGeo, materials.pvcColumn);
    columnPipeMesh.position.set(0, -1.0, 0);
    borewellGroup.add(columnPipeMesh);

    // Discharge Elbow Nozzle at surface (Water gushing out into canal)
    const elbowGeo = new THREE.TorusGeometry(0.4, 0.22, 16, 24, Math.PI / 2);
    const elbow = new THREE.Mesh(elbowGeo, materials.pvcColumn);
    elbow.position.set(0.4, 3.0, 0);
    elbow.rotation.z = -Math.PI / 2;
    borewellGroup.add(elbow);

    const dischargePipeGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.8, 24);
    dischargePipeGeo.rotateZ(Math.PI / 2);
    const dischargePipe = new THREE.Mesh(dischargePipeGeo, materials.pvcColumn);
    dischargePipe.position.set(1.5, 3.4, 0);
    borewellGroup.add(dischargePipe);

    // --- MULTI-STAGE SUBMERSIBLE PUMP ASSEMBLY ---
    const pumpStageGroup = new THREE.Group();
    pumpStageGroup.position.set(0, -4.6, 0);
    borewellGroup.add(pumpStageGroup);

    // Stainless steel pump bowl body
    const pumpBodyGeo = new THREE.CylinderGeometry(0.55, 0.55, 2.6, 28);
    const pumpBody = new THREE.Mesh(pumpBodyGeo, materials.steelStainless);
    pumpStageGroup.add(pumpBody);

    // Impeller Stages Assembly (Rotating inside cutaway window)
    pumpStageGroup.add(impellerAssemblyGroup);

    for (let s = -0.9; s <= 0.9; s += 0.45) {
      const impDiscGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.08, 16);
      const impDisc = new THREE.Mesh(impDiscGeo, materials.steelStainless);
      impDisc.position.y = s;
      impellerAssemblyGroup.add(impDisc);

      // Curved impeller vanes
      for (let v = 0; v < 6; v++) {
        const vaneAngle = (v / 6) * Math.PI * 2;
        const vaneGeo = new THREE.BoxGeometry(0.26, 0.12, 0.04);
        const vane = new THREE.Mesh(vaneGeo, materials.panelBezel);
        vane.position.set(Math.cos(vaneAngle) * 0.25, s + 0.08, Math.sin(vaneAngle) * 0.25);
        vane.rotation.y = vaneAngle + 0.4;
        impellerAssemblyGroup.add(vane);
      }
    }

    // Suction Strainer (Inlet Screen where water enters)
    const strainerGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.5, 24, 4);
    const strainerMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      wireframe: true
    });
    const strainer = new THREE.Mesh(strainerGeo, strainerMat);
    strainer.position.set(0, -1.55, 0);
    pumpStageGroup.add(strainer);

    // --- ELECTRIC MOTOR SECTION (Submerged beneath pump) ---
    const motorHousingGeo = new THREE.CylinderGeometry(0.52, 0.52, 2.2, 28);
    const motorHousing = new THREE.Mesh(motorHousingGeo, materials.steelStainless);
    motorHousing.position.set(0, -2.9, 0);
    pumpStageGroup.add(motorHousing);

    // Copper Stator Windings (Visible inside motor cutaway)
    const statorGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 20, 1, true);
    statorWindingMesh = new THREE.Mesh(statorGeo, materials.copperCoil);
    statorWindingMesh.position.set(0, -2.9, 0);
    pumpStageGroup.add(statorWindingMesh);

    // 3-Core Submersible Flat Drop Cable running from Surface down to Motor
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.6, -1.0, 0),
      new THREE.Vector3(-1.0, -0.6, 0.6),
      new THREE.Vector3(2.8, 1.2, 0.4),
      new THREE.Vector3(3.4, -1.0, 0.35),
      new THREE.Vector3(3.4, -4.0, 0.35),
      new THREE.Vector3(3.4, -7.0, 0.35)
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 64, 0.08, 8, false);
    const cableMesh = new THREE.Mesh(cableGeo, materials.cableJacket);
    worldGroup.add(cableMesh);
  }

  // --- DYNAMIC PARTICLE EMITTERS ---
  // 1. Water Discharge Surge Particles
  let waterParticles, waterGeo, waterPos;
  const WATER_COUNT = 300;

  function initWaterParticles() {
    waterGeo = new THREE.BufferGeometry();
    waterPos = new Float32Array(WATER_COUNT * 3);
    const waterVel = new Float32Array(WATER_COUNT * 3);

    for (let i = 0; i < WATER_COUNT; i++) {
      resetWaterParticle(i, true);
    }

    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
    const waterMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    waterParticles = new THREE.Points(waterGeo, waterMat);
    worldGroup.add(waterParticles);
  }

  function resetWaterParticle(i, randomInit = false) {
    const idx = i * 3;
    // Emitter at discharge nozzle: (3.4 + 1.5, 3.4, 0) => (4.9, 3.4, 0)
    waterPos[idx] = 4.8 + (randomInit ? Math.random() * 2 : 0);
    waterPos[idx + 1] = 3.4 + (randomInit ? (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 0.1);
    waterPos[idx + 2] = (Math.random() - 0.5) * 0.2;
  }

  // 2. Electricity Current Spark Particles on Cable
  let sparkParticles, sparkGeo, sparkPos;
  const SPARK_COUNT = 150;

  function initSparkParticles() {
    sparkGeo = new THREE.BufferGeometry();
    sparkPos = new Float32Array(SPARK_COUNT * 3);
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkPos[i * 3] = -1000;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    worldGroup.add(sparkParticles);
  }

  // --- ASSEMBLE 3D SCENE ---
  buildVkonPanel();
  buildBorewellRig();
  initWaterParticles();
  initSparkParticles();

  // --- CAMERA DIRECTING LOGIC (GSAP TRANSITIONS) ---
  const cameraPresets = {
    dual: { pos: new THREE.Vector3(0, 1.5, 12), target: new THREE.Vector3(0, 0, 0) },
    panel: { pos: new THREE.Vector3(-3.6, 1.2, 4.2), target: new THREE.Vector3(-3.6, 1.2, 0) },
    internal: { pos: new THREE.Vector3(-3.6, 1.2, 2.2), target: new THREE.Vector3(-3.6, 1.2, 0) },
    pump: { pos: new THREE.Vector3(3.4, -4.5, 3.8), target: new THREE.Vector3(3.4, -4.5, 0) },
    borewell: { pos: new THREE.Vector3(3.4, -1.0, 9.5), target: new THREE.Vector3(3.4, -2.0, 0) }
  };

  function setCameraView(presetName) {
    state.cameraPreset = presetName;
    const targetConfig = cameraPresets[presetName] || cameraPresets.dual;

    // If switching to internal view, swing open the panel door!
    if (presetName === 'internal') {
      openPanelDoor(true);
    } else if (state.doorOpen && presetName !== 'panel') {
      openPanelDoor(false);
    }

    gsap.to(camera.position, {
      x: targetConfig.pos.x,
      y: targetConfig.pos.y,
      z: targetConfig.pos.z,
      duration: 1.2,
      ease: 'power2.inOut'
    });

    gsap.to(controls.target, {
      x: targetConfig.target.x,
      y: targetConfig.target.y,
      z: targetConfig.target.z,
      duration: 1.2,
      ease: 'power2.inOut'
    });

    // Update active UI button
    document.querySelectorAll('.cam-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cam === presetName);
    });
  }

  function openPanelDoor(shouldOpen) {
    state.doorOpen = shouldOpen;
    gsap.to(panelDoorGroup.rotation, {
      y: shouldOpen ? -Math.PI * 0.65 : 0,
      duration: 0.8,
      ease: 'power2.out'
    });
  }

  // --- FAULT SIMULATION ENGINE ---
  const terminalLog = document.getElementById('hudLogContainer');
  const hudStatus = document.getElementById('hudSystemStatus');
  const telemetryCard = document.getElementById('telemetryCard');
  const statusLed = document.getElementById('statusLed');
  const statusLabel = document.getElementById('statusLabel');

  function logHudMessage(msg, type = 'normal') {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const el = document.createElement('div');
    el.className = `log-entry ${type}`;
    el.textContent = `[${timeStr}] ${msg}`;
    terminalLog.appendChild(el);
    terminalLog.scrollTop = terminalLog.scrollHeight;
  }

  function triggerFault(faultType) {
    state.fault = faultType;
    audio.init();

    // Reset button states
    document.querySelectorAll('.fault-card-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.fault === faultType);
    });

    if (faultType === 'normal') {
      restoreHealthyState();
      return;
    }

    // Set Trip UI States
    telemetryCard.classList.add('fault');
    hudStatus.textContent = 'TRIPPED';
    hudStatus.classList.add('fault');
    statusLed.classList.add('fault');

    // Trip contactor armature (moves up/disconnects)
    if (contactorBridgeMesh) {
      gsap.to(contactorBridgeMesh.position, { y: 1.05, duration: 0.15, ease: 'back.out(2)' });
    }
    audio.playArcSpark();
    audio.playRelayClick(false);
    audio.playAlarm();

    switch (faultType) {
      case 'dry-run':
        // Aquifer water level drops below suction
        gsap.to(waterTableMesh.position, { y: -7.5, duration: 1.8, ease: 'power2.inOut' });
        state.telemetry.aR = 3.8;
        state.telemetry.aY = 3.9;
        state.telemetry.aB = 3.7;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.tripSpeed = '1.2s';
        state.isRunning = false;
        audio.setRunning(false);
        statusLabel.textContent = 'TRIP: DRY RUN CAVITATION';
        logHudMessage('UNDERLOAD DETECTED (<4.0A). Aquifer depleted. Contactor disengaged in 1.2s to prevent dry friction burnout.', 'fault');
        logHudMessage('Auto-start timer armed: Resuming when borewell recharges.', 'normal');
        break;

      case 'single-phase':
        // Y Phase lines cut!
        state.telemetry.vY = 0;
        state.telemetry.aY = 0;
        state.telemetry.aR = 28.5; // Current surges on remaining phases
        state.telemetry.aB = 29.1;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.tripSpeed = '0.58s';
        state.isRunning = false;
        audio.setRunning(false);
        statusLabel.textContent = 'TRIP: SINGLE PHASING (Y-PHASE 0V)';
        logHudMessage('PHASE DROP: Y-Phase collapsed to 0V. Severe unbalance detected.', 'fault');
        logHudMessage('Vkon Cutout: Contactor opened in 580ms. Winding saved from 2.5x current burnout.', 'fault');
        break;

      case 'voltage-spike':
        // Extreme voltage spike / surge
        state.telemetry.vR = 492;
        state.telemetry.vY = 488;
        state.telemetry.vB = 495;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.tripSpeed = '0.35s';
        state.isRunning = false;
        audio.setRunning(false);
        statusLabel.textContent = 'TRIP: OVER-VOLTAGE (>480V)';
        logHudMessage('VOLTAGE SURGE: 495V exceeds safe operating band (340V - 460V). Motor isolated.', 'fault');
        break;

      case 'phase-reversal':
        // Phase sequence inverted
        state.telemetry.freq = 49.8;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.tripSpeed = '0.10s';
        state.isRunning = false;
        audio.setRunning(false);
        statusLabel.textContent = 'LOCK: PHASE SEQUENCE REVERSED';
        logHudMessage('ROTATION CHECK FAILED: Line wires swapped at pole transformer (R-B-Y).', 'fault');
        logHudMessage('Preventive Lock: Starter disengaged before pump could rotate backward and strip shaft.', 'fault');
        break;

      case 'overload':
        // Silt head overload - windings overheat
        state.telemetry.aR = 27.8;
        state.telemetry.aY = 28.4;
        state.telemetry.aB = 27.9;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.tripSpeed = '2.4s';
        state.isRunning = false;
        audio.setRunning(false);
        statusLabel.textContent = 'TRIP: CT OVERLOAD (28.4A)';
        // Heat up motor windings & CT coils in 3D
        statorWindingMesh.material = materials.copperHot;
        ctCoilMeshes.forEach((c) => (c.material = materials.copperHot));
        logHudMessage('THERMAL OVERLOAD: True RMS current exceeded 18A threshold for > 2 seconds.', 'fault');
        logHudMessage('Digital CT Trip triggered. Preserving stator insulation integrity.', 'fault');
        break;

      case 'rotary-lock':
        // Rotor jammed by stone/grit
        state.telemetry.aR = 42.0; // Locked-rotor current spike
        state.telemetry.aY = 41.5;
        state.telemetry.aB = 42.8;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.tripSpeed = '0.22s';
        state.isRunning = false;
        audio.setRunning(false);
        statusLabel.textContent = 'TRIP: LOCKED ROTOR CURRENT';
        logHudMessage('EMERGENCY CUTOUT: Motor shaft stalled. Instantaneous trip in 220ms prevents winding meltdown.', 'fault');
        break;
    }

    updateHudDisplays();
    updateOledTexture();
  }

  function restoreHealthyState() {
    state.fault = 'normal';
    state.isRunning = true;
    state.waterLevelY = -3.5;

    // Reset water aquifer level
    gsap.to(waterTableMesh.position, { y: -3.5, duration: 1.2, ease: 'power2.out' });

    // Engage contactor bridge back down
    if (contactorBridgeMesh) {
      gsap.to(contactorBridgeMesh.position, { y: 0.8, duration: 0.2, ease: 'bounce.out' });
    }
    audio.playRelayClick(true);
    audio.setRunning(true);

    // Reset telemetry
    state.telemetry = {
      vR: 415,
      vY: 412,
      vB: 418,
      aR: 14.2,
      aY: 14.1,
      aB: 14.3,
      freq: 50.0,
      rpm: 2850,
      lpm: 310,
      tripSpeed: '< 0.6s'
    };

    // Restore copper coil colors
    if (statorWindingMesh) statorWindingMesh.material = materials.copperCoil;
    ctCoilMeshes.forEach((c) => (c.material = materials.copperCoil));

    // Reset UI Badges
    telemetryCard.classList.remove('fault');
    hudStatus.textContent = 'ONLINE';
    hudStatus.classList.remove('fault');
    statusLed.classList.remove('fault');
    statusLabel.textContent = '3-PHASE GRID NORMAL • 415V';

    document.querySelectorAll('.fault-card-btn').forEach((b) => b.classList.remove('active'));

    logHudMessage('HEALTHY STATE RESTORED: Contactor engaged. All 3 phases balanced at 415V.', 'recovered');
    updateHudDisplays();
    updateOledTexture();
  }

  function updateHudDisplays() {
    document.getElementById('valVR').textContent = Math.round(state.telemetry.vR);
    document.getElementById('valVY').textContent = Math.round(state.telemetry.vY);
    document.getElementById('valVB').textContent = Math.round(state.telemetry.vB);

    document.getElementById('valAR').textContent = state.telemetry.aR.toFixed(1);
    document.getElementById('valAY').textContent = state.telemetry.aY.toFixed(1);
    document.getElementById('valAB').textContent = state.telemetry.aB.toFixed(1);

    document.getElementById('valFreq').textContent = `${state.telemetry.freq.toFixed(1)} Hz`;
    document.getElementById('valRpm').textContent = `${state.telemetry.rpm} RPM`;
    document.getElementById('valWater').textContent = `${state.telemetry.lpm} LPM`;
    document.getElementById('valTripSpeed').textContent = state.telemetry.tripSpeed;
  }

  // --- RENDER MODES (Realistic, X-Ray, Thermal) ---
  function setRenderMode(mode) {
    state.viewMode = mode;
    document.querySelectorAll('.mode-pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.mode === mode);
    });

    if (mode === 'xray') {
      scene.overrideMaterial = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
    } else if (mode === 'thermal') {
      scene.overrideMaterial = new THREE.MeshNormalMaterial({ wireframe: false });
    } else {
      scene.overrideMaterial = null;
    }
  }

  // --- INTERACTIVE GSM MOBILE PHONE SIMULATOR ---
  const chatMessages = document.getElementById('phoneChatMessages');

  function sendGsmCommand(cmd) {
    audio.init();

    // 1. Add outgoing user SMS
    const userMsg = document.createElement('div');
    userMsg.className = 'message outgoing';
    userMsg.innerHTML = `
      <div class="msg-bubble">${cmd}</div>
      <span class="msg-time">Just now</span>
    `;
    chatMessages.appendChild(userMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 2. Generate automated Vkon GSM response after 600ms
    setTimeout(() => {
      let replyText = '';
      if (cmd === 'START') {
        restoreHealthyState();
        replyText = `VKON COMMAND OK: Motor STARTED successfully.\nR:415V Y:412V B:418V\nCurrent: 14.2A\nFlow: 310 LPM. Status: RUNNING.`;
      } else if (cmd === 'STOP') {
        state.isRunning = false;
        state.telemetry.rpm = 0;
        state.telemetry.lpm = 0;
        state.telemetry.aR = 0;
        state.telemetry.aY = 0;
        state.telemetry.aB = 0;
        audio.setRunning(false);
        updateHudDisplays();
        updateOledTexture();
        replyText = `VKON COMMAND OK: Motor STOPPED.\nGrid: 415V Safe Band.\nCurrent: 0.0A. Contactor open.`;
      } else if (cmd === 'STATUS') {
        replyText = `VKON TELEMETRY REPORT:\nState: ${state.isRunning ? 'RUNNING' : 'STANDBY'}\nR:${Math.round(state.telemetry.vR)}V Y:${Math.round(state.telemetry.vY)}V B:${Math.round(state.telemetry.vB)}V\nCurrent: ${state.telemetry.aR.toFixed(1)}A\nFaults: ${state.fault === 'normal' ? 'NONE (HEALTHY)' : state.fault.toUpperCase()}`;
      }

      const botMsg = document.createElement('div');
      botMsg.className = 'message incoming';
      botMsg.innerHTML = `
        <div class="msg-bubble" style="white-space: pre-line;">${replyText}</div>
        <span class="msg-time">Just now</span>
      `;
      chatMessages.appendChild(botMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 650);
  }

  // --- PANEL RECOMMENDATION CALCULATOR ---
  const motorHpSelect = document.getElementById('motorHpSelect');
  const powerSourceSelect = document.getElementById('powerSourceSelect');
  const recModelName = document.getElementById('recModelName');
  const recModelDesc = document.getElementById('recModelDesc');
  const recStartType = document.getElementById('recStartType');
  const recAmps = document.getElementById('recAmps');
  const recProtection = document.getElementById('recProtection');

  function updatePanelRecommendation() {
    const hp = parseFloat(motorHpSelect.value);
    const src = powerSourceSelect.value;

    let model = '';
    let startType = hp >= 12.5 ? 'Automatic Star-Delta' : 'Direct-On-Line (DOL)';
    let amps = `${(hp * 1.5).toFixed(1)}A – ${(hp * 1.8).toFixed(1)}A Full Load`;
    let desc = '';
    let prot = 'Dry Run, SPP, High/Low Voltage, Phase Reversal, CT Overload';

    if (src === 'solar') {
      model = `Vkon Solar-Pro ${hp}HP Hybrid VFD Controller`;
      startType = 'Variable Frequency Soft-Start (VFD)';
      desc = `Dual DC Solar array & 3-Phase Grid input with MPPT maximum power tracking and zero inrush current.`;
      prot += ', DC Reverse Polarity, Lightning Surge';
    } else if (src === 'gsm') {
      model = `Vkon Tele-Guard ${hp}HP GSM Smart Controller`;
      desc = `Integrated 4G/2G GSM module with multi-user missed call, SMS command execution, and real-time push alerts.`;
      prot += ', SMS Power Alert, GSM Relay Isolation';
    } else {
      model = `Vkon Pro-3P ${hp}HP Digital Submersible Starter`;
      desc = `Heavy-duty industrial starter equipped with solid-state microcontroller protection and true RMS CT sensing.`;
    }

    recModelName.textContent = model;
    recModelDesc.textContent = desc;
    recStartType.textContent = startType;
    recAmps.textContent = amps;
    recProtection.textContent = prot;
  }

  // --- EVENT LISTENERS ---
  // Camera buttons
  document.querySelectorAll('.cam-btn').forEach((btn) => {
    btn.addEventListener('click', () => setCameraView(btn.dataset.cam));
  });

  // Render mode buttons
  document.querySelectorAll('.mode-pill').forEach((btn) => {
    btn.addEventListener('click', () => setRenderMode(btn.dataset.mode));
  });

  // Fault simulation buttons
  document.querySelectorAll('.fault-card-btn').forEach((btn) => {
    btn.addEventListener('click', () => triggerFault(btn.dataset.fault));
  });

  // Reset simulation button
  document.getElementById('btnResetSimulation').addEventListener('click', () => {
    restoreHealthyState();
  });

  // Audio Toggle
  const audioBtn = document.getElementById('audioToggleBtn');
  const audioIconOn = audioBtn.querySelector('.audio-icon.on');
  const audioIconOff = audioBtn.querySelector('.audio-icon.off');

  audioBtn.addEventListener('click', () => {
    const isNowOn = audio.toggle();
    audioIconOn.classList.toggle('hidden', !isNowOn);
    audioIconOff.classList.toggle('hidden', isNowOn);
  });

  // GSM Phone SMS buttons
  document.querySelectorAll('.sms-quick-btn').forEach((btn) => {
    btn.addEventListener('click', () => sendGsmCommand(btn.dataset.cmd));
  });

  // Panel Finder Selects
  motorHpSelect.addEventListener('change', updatePanelRecommendation);
  powerSourceSelect.addEventListener('change', updatePanelRecommendation);

  // Resize handling
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  // Initialize Audio upon first user interaction
  document.addEventListener(
    'pointerdown',
    () => {
      audio.init();
    },
    { once: true }
  );

  // --- ANIMATION RENDER LOOP ---
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    controls.update();

    // 1. Rotate Submersible Impellers
    if (state.isRunning && impellerAssemblyGroup) {
      impellerAssemblyGroup.rotation.y += delta * 25.0;
    }

    // 2. Animate Water Discharge Particles
    if (waterPos && waterParticles) {
      const positions = waterGeo.attributes.position.array;
      for (let i = 0; i < WATER_COUNT; i++) {
        const idx = i * 3;
        if (state.isRunning) {
          positions[idx] += delta * 3.5; // Shoot rightwards
          positions[idx + 1] -= delta * 1.8; // Gravity fall
          if (positions[idx + 1] < 1.0 || positions[idx] > 8.0) {
            resetWaterParticle(i);
          }
        } else {
          // Fade away or stop
          positions[idx + 1] -= delta * 3.0;
        }
      }
      waterGeo.attributes.position.needsUpdate = true;
    }

    // 3. Subtle floating & wire particle simulation
    if (sparkPos && sparkParticles && state.isRunning) {
      const sp = sparkGeo.attributes.position.array;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const t = (elapsedTime * 0.4 + i / SPARK_COUNT) % 1;
        // Travel down vertical drop pipe from 1.0 down to -5.0
        sp[i * 3] = 3.4 + Math.sin(t * 15 + i) * 0.04;
        sp[i * 3 + 1] = 1.0 - t * 6.0;
        sp[i * 3 + 2] = 0.35 + Math.cos(t * 15 + i) * 0.04;
      }
      sparkGeo.attributes.position.needsUpdate = true;
    }

    // 4. Update OLED texture periodically (every 10 frames)
    if (Math.floor(elapsedTime * 10) % 2 === 0) {
      // Add subtle realistic micro-fluctuation to healthy voltage
      if (state.fault === 'normal') {
        state.telemetry.vR = 415 + (Math.sin(elapsedTime * 2.5) * 1.5);
        state.telemetry.vY = 412 + (Math.cos(elapsedTime * 2.8) * 1.8);
        state.telemetry.vB = 418 + (Math.sin(elapsedTime * 2.1) * 1.4);
        state.telemetry.aR = 14.2 + (Math.sin(elapsedTime * 3) * 0.15);
        state.telemetry.aY = 14.1 + (Math.cos(elapsedTime * 3.2) * 0.15);
        state.telemetry.aB = 14.3 + (Math.sin(elapsedTime * 2.7) * 0.15);
        updateHudDisplays();
      }
      updateOledTexture();
    }

    renderer.render(scene, camera);
  }

  animate();
  updatePanelRecommendation();
})();
