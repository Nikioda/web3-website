/**
 * VKON MOTOR STARTER PANEL — HIGH-FIDELITY 3D DIGITAL TWIN
 * Faithfully engineered from 8 reference photos of the actual physical product:
 *   - Enclosure: Powder-coated CRCA steel (420mm W × 300mm H × 140mm D)
 *   - Front: Yellow recessed faceplate, Vkon logo, 4 switches, rotary pot knob,
 *            LCD display, R-Y-B LEDs, ammeter cutout, embossed lower recess
 *   - Bottom: 3 black rubber cable glands with diaphragms
 *   - Back: 2 corner mounting bosses, 1 bottom boss, self-tapping screw pattern
 *   - Top/Left: 2 steel hinges with mounting screws
 *   - Inside: 3 Citation Line 40A contactors with aux contact blocks,
 *             transformer, horizontal grey cable trunking,
 *             3 terminal blocks with [R-Y-B MOTOR], [B-Y-R MAINS], [R-Y-B MOTOR] labels,
 *             wiring harness and door controller PCB enclosure box
 */

(function () {
  'use strict';

  // ================================================================
  //  SCENE, CAMERA, RENDERER
  // ================================================================
  const canvas = document.getElementById('canvas3d');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1117);

  // Studio environment gradient background
  const bgTexture = createStudioBackdropTexture();
  scene.background = bgTexture;

  const camera = new THREE.PerspectiveCamera(
    36,
    window.innerWidth / window.innerHeight,
    0.05,
    50
  );
  camera.position.set(0, 0.05, 0.78);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.25;
  controls.maxDistance = 2.5;
  controls.target.set(0, 0, 0);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.8;

  // ================================================================
  //  LIGHTING SETUP — 3-point Industrial Studio
  // ================================================================
  const hemiLight = new THREE.HemisphereLight(0xdce5f2, 0x1a202c, 0.6);
  scene.add(hemiLight);

  // Key light (soft warm white from upper-right-front)
  const keyLight = new THREE.DirectionalLight(0xfffaed, 1.4);
  keyLight.position.set(1.2, 2.0, 1.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 6;
  keyLight.shadow.camera.left = -0.8;
  keyLight.shadow.camera.right = 0.8;
  keyLight.shadow.camera.top = 0.8;
  keyLight.shadow.camera.bottom = -0.8;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);

  // Fill light (cool white from left)
  const fillLight = new THREE.DirectionalLight(0xcde0ff, 0.65);
  fillLight.position.set(-1.8, 1.0, 1.2);
  scene.add(fillLight);

  // Rim light (highlight top & side steel edges)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
  rimLight.position.set(0, 1.8, -2.0);
  scene.add(rimLight);

  // Floor bounce
  const floorBounce = new THREE.PointLight(0x406080, 0.35, 3);
  floorBounce.position.set(0, -0.4, 0.3);
  scene.add(floorBounce);

  // Ground shadow catcher & pedestal
  const groundGeo = new THREE.PlaneGeometry(5, 5);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  scene.add(ground);

  const pedestalGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.02, 64);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x161b22,
    roughness: 0.8,
    metalness: 0.15,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -0.24;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  // Ring highlight on pedestal
  const ringGeo = new THREE.RingGeometry(0.53, 0.54, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf5a623, opacity: 0.3, transparent: true, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.229;
  scene.add(ring);

  // ================================================================
  //  STATE MANAGEMENT
  // ================================================================
  const state = {
    isDoorOpen: false,
    isMotorRunning: true,
    voltage: 415,
    current: 18.2,
    autoPhase2: false,
    autoPhase3: true,
    potAngle: 0.3,
  };

  // ================================================================
  //  DYNAMIC TEXTURES (Canvas-Generated High Resolution)
  // ================================================================

  function createStudioBackdropTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 320);
    grad.addColorStop(0, '#1a2230');
    grad.addColorStop(0.6, '#0f141c');
    grad.addColorStop(1, '#080a0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(c);
  }

  let faceplateCanvas, faceplateCtx, faceplateTexture;

  function initFaceplateTexture() {
    faceplateCanvas = document.createElement('canvas');
    faceplateCanvas.width = 1024;
    faceplateCanvas.height = 2048;
    faceplateCtx = faceplateCanvas.getContext('2d');
    faceplateTexture = new THREE.CanvasTexture(faceplateCanvas);
    faceplateTexture.encoding = THREE.sRGBEncoding;
    faceplateTexture.anisotropy = 8;
    updateFaceplateCanvas();
    return faceplateTexture;
  }

  function updateFaceplateCanvas() {
    const ctx = faceplateCtx;
    const w = 1024;
    const h = 2048;

    ctx.clearRect(0, 0, w, h);

    // Outer metal border & background
    ctx.fillStyle = '#dcd8cf';
    ctx.fillRect(0, 0, w, h);

    // Outer dark bezel line
    ctx.strokeStyle = '#2d323c';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Inner silver frame line
    ctx.strokeStyle = '#e8ecf2';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // ================================================================
    //  SECTION 1: TOP DARK HEADER (LEDs + LCD Meter Display)
    // ================================================================
    const topH = 560;
    ctx.fillStyle = '#161920';
    ctx.fillRect(28, 28, w - 56, topH);

    // Inner dark border
    ctx.strokeStyle = '#323a48';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, w - 72, topH - 16);

    // ——— 3 Top Phase LEDs: Red (R), Yellow (Y), Blue (B) ———
    const ledY = 95;
    const ledConfigs = [
      { x: 180, label: 'R', color: state.isMotorRunning ? '#e74c3c' : '#7f1d1d', ring: '#c0392b' },
      { x: 380, label: 'Y', color: state.isMotorRunning ? '#f1c40f' : '#785b04', ring: '#d4ac0d' },
      { x: 580, label: 'B', color: state.isMotorRunning ? '#3498db' : '#103e63', ring: '#2980b9' },
    ];

    ledConfigs.forEach((l) => {
      // Outer colored label badge ring
      ctx.beginPath();
      ctx.arc(l.x, ledY, 44, 0, Math.PI * 2);
      ctx.fillStyle = l.ring;
      ctx.fill();

      // Black inner cavity
      ctx.beginPath();
      ctx.arc(l.x, ledY, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0d14';
      ctx.fill();

      // Glowing LED jewel lens
      ctx.beginPath();
      ctx.arc(l.x, ledY, 26, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.fill();

      // Gloss reflection
      ctx.beginPath();
      ctx.arc(l.x - 7, ledY - 7, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();

      // Letter label (R, Y, B) in white
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(l.label, l.x, ledY + 12);
    });

    // ——— LCD Digital Voltmeter / Ammeter Display ———
    const lcdX = 140;
    const lcdY = 175;
    const lcdW = w - lcdX - 60;
    const lcdH = 260;

    // Display labels on left side
    ctx.fillStyle = '#f5a623';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('AMPS', lcdX - 18, lcdY + 95);
    ctx.fillText('VOLT', lcdX - 18, lcdY + 185);

    // LCD Frame
    ctx.fillStyle = '#0a0d12';
    roundRect(ctx, lcdX, lcdY, lcdW, lcdH, 12);
    ctx.fill();
    ctx.strokeStyle = '#485460';
    ctx.lineWidth = 4;
    ctx.stroke();

    // LCD Screen Glass
    const lcdGrad = ctx.createLinearGradient(lcdX, lcdY, lcdX, lcdY + lcdH);
    lcdGrad.addColorStop(0, state.isMotorRunning ? '#162b1b' : '#0d1610');
    lcdGrad.addColorStop(1, state.isMotorRunning ? '#0e1c12' : '#080d09');
    ctx.fillStyle = lcdGrad;
    roundRect(ctx, lcdX + 8, lcdY + 8, lcdW - 16, lcdH - 16, 8);
    ctx.fill();

    // Digital readout text
    ctx.fillStyle = state.isMotorRunning ? '#39e75f' : '#1e522a';
    ctx.font = 'bold 88px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    // Volts row
    ctx.fillText(state.isMotorRunning ? `${state.voltage}` : '---', lcdX + 30, lcdY + 110);
    ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = state.isMotorRunning ? '#2ecc71' : '#1c4a26';
    ctx.fillText('V AC', lcdX + 220, lcdY + 105);

    // Amps row
    ctx.font = 'bold 82px "JetBrains Mono", monospace';
    ctx.fillStyle = state.isMotorRunning ? '#39e75f' : '#1e522a';
    ctx.fillText(state.isMotorRunning ? `${state.current.toFixed(1)}` : '0.0', lcdX + 30, lcdY + 215);
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = state.isMotorRunning ? '#2ecc71' : '#1c4a26';
    ctx.fillText('AMPS', lcdX + 245, lcdY + 210);

    // Status Mode in LCD corner
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = state.isMotorRunning ? '#ffd32a' : '#555';
    ctx.textAlign = 'right';
    ctx.fillText(state.isMotorRunning ? '3PH RUN' : 'STANDBY', lcdX + lcdW - 25, lcdY + 160);

    // Phase Status labels under LCD
    const underY = lcdY + lcdH + 50;
    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RY', 190, underY);
    ctx.fillText('YB', 380, underY);
    ctx.fillText('RB', 580, underY);
    ctx.fillText('STATUS', 790, underY);

    // ================================================================
    //  SECTION 2: MIDDLE YELLOW FIELD (Knob, Vkon Logo, Model, Bullets)
    // ================================================================
    const midY = topH + 28;
    const midH = 1060;

    // Rich yellow gradient
    const yGrad = ctx.createLinearGradient(0, midY, 0, midY + midH);
    yGrad.addColorStop(0, '#f9be18');
    yGrad.addColorStop(1, '#e59d0b');
    ctx.fillStyle = yGrad;
    ctx.fillRect(28, midY, w - 56, midH);

    // Red accent line dividing top dark from yellow
    ctx.fillStyle = '#d63031';
    ctx.fillRect(28, midY, w - 56, 10);

    // Thin inner border around yellow area
    ctx.strokeStyle = '#c48208';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, midY + 12, w - 72, midH - 24);

    // Side horizontal decorative red/orange pinstripes (seen in Photo 1 & Image 2)
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    for (let py = midY + 450; py <= midY + midH - 80; py += 18) {
      // Left stripes
      ctx.beginPath();
      ctx.moveTo(42, py);
      ctx.lineTo(130, py);
      ctx.stroke();

      // Right stripes
      ctx.beginPath();
      ctx.moveTo(w - 130, py);
      ctx.lineTo(w - 42, py);
      ctx.stroke();
    }

    // ——— Potentiometer Knob Area (Circular Dial Marking) ———
    const potY = midY + 165;
    const potX = w / 2;

    // Dial scale ticks around knob
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;
    for (let a = -Math.PI * 0.75; a <= Math.PI * 0.75; a += Math.PI * 0.15) {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(potX + cos * 80, potY + sin * 80);
      ctx.lineTo(potX + cos * 94, potY + sin * 94);
      ctx.stroke();
    }

    // Dial base shadow circle
    ctx.beginPath();
    ctx.arc(potX, potY, 74, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();

    // ——— Brand & Model Row (Below Knob) ———
    const brandY = midY + 360;

    // Left: Vkon AUTOMATION Logo
    ctx.fillStyle = '#0f141c';
    ctx.font = '900 76px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Vkon', 80, brandY);

    // Cyan dot on the 'o'
    ctx.beginPath();
    ctx.arc(80 + 120, brandY - 52, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#00a8ff';
    ctx.fill();

    // Red AUTOMATION text below Vkon
    ctx.fillStyle = '#d63031';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('AUTOMATION', 80, brandY + 36);
    ctx.letterSpacing = '0px';

    // Right: Red Oval MODEL Badge
    const modelBadgeX = w - 240;
    const modelBadgeY = brandY - 45;

    ctx.fillStyle = '#c0392b';
    roundRect(ctx, modelBadgeX - 140, modelBadgeY, 280, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MODEL', modelBadgeX, modelBadgeY + 39);

    // Model Details Text under badge
    ctx.fillStyle = '#0f141c';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VKON - SASD 1/2/3', modelBadgeX, modelBadgeY + 98);

    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('• Fully Automatic', modelBadgeX, modelBadgeY + 132);
    ctx.fillText('Digital Control Panel', modelBadgeX, modelBadgeY + 162);

    ctx.fillStyle = '#b71540';
    ctx.font = 'bold 25px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('HP 3 TO 40 HP', modelBadgeX, modelBadgeY + 205);

    // ——— Feature Bullet List (Center / Left) ———
    const listY = midY + 630;
    ctx.fillStyle = '#1a1f2c';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AUTO START, DRY RUN PROTECT,', w / 2, listY);
    ctx.fillText('SINGLE PHASE PROTECTOR', w / 2, listY + 44);
    ctx.fillText('AUTO RE START, OVER LOAD,', w / 2, listY + 88);
    ctx.fillText('TIMER, FOGGING TIMER', w / 2, listY + 132);
    ctx.fillText('GSM CONTROLLER 2G, 4G, JIO.', w / 2, listY + 176);

    // ================================================================
    //  SECTION 3: BOTTOM SWITCH BAR (4 Horizontal Switch Positions)
    // ================================================================
    const botY = midY + midH + 16;
    const botH = h - botY - 28;

    // Dark background for switch row
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(28, botY, w - 56, botH);

    // 4 Column cards
    const colW = (w - 72) / 4;
    const swCards = [
      { top: 'MOTOR', bot: 'ON', color: '#00a854', border: '#2980b9' },
      { top: 'MOTOR', bot: 'OFF', color: '#e74c3c', border: '#2980b9' },
      { top: '2PHASE', bot: 'AUTO', color: '#0984e3', border: '#2980b9' },
      { top: '3 PHASE', bot: 'AUTO', color: '#d63031', border: '#2980b9' },
    ];

    swCards.forEach((c, i) => {
      const cx = 36 + i * colW;
      const cy = botY + 8;
      const cw = colW - 8;
      const ch = botH - 16;

      // Card background
      ctx.fillStyle = '#1e2430';
      roundRect(ctx, cx, cy, cw, ch, 8);
      ctx.fill();

      // Blue border
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Top label header banner (blue filled)
      ctx.fillStyle = '#1e549f';
      ctx.fillRect(cx + 4, cy + 4, cw - 8, 54);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.top, cx + cw / 2, cy + 40);

      // Bottom label header banner
      ctx.fillStyle = '#1e549f';
      ctx.fillRect(cx + 4, cy + ch - 58, cw - 8, 54);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(c.bot, cx + cw / 2, cy + ch - 22);
    });

    if (faceplateTexture) faceplateTexture.needsUpdate = true;
  }


  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Contactor Label Texture
  function createContactorTexture(labelPrefix, hpRating) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, 512, 256);

    // Red header bar
    ctx.fillStyle = '#cc2020';
    ctx.fillRect(0, 0, 512, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CITATION LINE 40AMPS', 256, 34);

    // Brand
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('Vkon', 140, 110);
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.arc(172, 80, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#444';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('GN TECHNOLOGIES', 140, 136);
    ctx.fillText('MADE IN INDIA', 140, 160);

    // Ratings box on right
    ctx.fillStyle = '#222';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Ith: 40A', 280, 85);
    ctx.fillText('AC1: 40A', 280, 110);
    ctx.fillText('AC3: 25A', 280, 135);
    ctx.fillText('Ui: 660V 50Hz', 280, 160);
    ctx.fillText(hpRating || 'HP: 15 / 20', 280, 185);

    // Bottom warning
    ctx.fillStyle = '#cc2020';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('415V AC COIL · HEAVY DUTY STARTER', 256, 230);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // Terminal block RYB label strip texture
  function createTerminalLabelTexture(isMains) {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 128;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 384, 128);

    const colors = isMains ? ['#0055ff', '#ffcc00', '#ff2222'] : ['#ff2222', '#ffcc00', '#0055ff'];
    const letters = isMains ? ['B', 'Y', 'R'] : ['R', 'Y', 'B'];

    const colW = 120;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(12 + i * colW, 10, colW - 8, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(letters[i], 12 + i * colW + (colW - 8) / 2, 54);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isMains ? 'MAINS' : 'MOTOR', 192, 110);

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // ================================================================
  //  MATERIALS
  // ================================================================

  // Real powder-coated off-white / light cream steel body
  const steelPaintMat = new THREE.MeshStandardMaterial({
    color: 0xdedad2,
    roughness: 0.36,
    metalness: 0.08,
  });

  const steelInteriorMat = new THREE.MeshStandardMaterial({
    color: 0xc8c3ba,
    roughness: 0.52,
    metalness: 0.06,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe6e9ef,
    roughness: 0.18,
    metalness: 0.92,
  });

  const darkRubberMat = new THREE.MeshStandardMaterial({
    color: 0x181818,
    roughness: 0.88,
    metalness: 0.0,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc8a442,
    roughness: 0.28,
    metalness: 0.86,
  });

  const contactorBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1f2124,
    roughness: 0.58,
    metalness: 0.05,
  });

  const contactorRedMat = new THREE.MeshStandardMaterial({
    color: 0xb51c1c,
    roughness: 0.4,
    metalness: 0.08,
  });

  const acrylicClearMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.88,
    opacity: 0.35,
    transparent: true,
    roughness: 0.1,
    ior: 1.49,
    reflectivity: 0.5,
  });

  const trunkingGreyMat = new THREE.MeshStandardMaterial({
    color: 0x8a929e,
    roughness: 0.65,
    metalness: 0.05,
  });

  const transformerCoreMat = new THREE.MeshStandardMaterial({
    color: 0x988242,
    roughness: 0.45,
    metalness: 0.65,
  });

  const copperWireMat = new THREE.MeshStandardMaterial({
    color: 0xb85824,
    roughness: 0.3,
    metalness: 0.75,
  });

  const wireBlackMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.7,
  });

  const pcbBoxMat = new THREE.MeshStandardMaterial({
    color: 0xdfd9cc,
    roughness: 0.48,
    metalness: 0.04,
  });

  // Switch physical buttons
  const switchGreenMat = new THREE.MeshStandardMaterial({ color: 0x10ac84, roughness: 0.35 });
  const switchRedMat = new THREE.MeshStandardMaterial({ color: 0xee5253, roughness: 0.35 });
  const switchBlueMat = new THREE.MeshStandardMaterial({ color: 0x2e86de, roughness: 0.35 });

  // ================================================================
  //  PANEL DIMENSIONS (Matching Actual Physical Spec)
  // ================================================================
  // W: ~420mm (landscape), H: ~300mm, D: ~140mm
  const W = 0.42;
  const H = 0.30;
  const D = 0.14;
  const WALL = 0.012;
  const DOOR_D = 0.035; // Deep hinged clamshell lid (35mm)
  const BASE_D = D - DOOR_D; // 105mm base enclosure

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Slight tilt forward so top controls are beautifully framed
  rootGroup.rotation.x = -0.08;

  // ================================================================
  //  1. MAIN ENCLOSURE BASE (Back, Sides, Bottom Glands)
  // ================================================================
  function buildEnclosureBase() {
    const baseGroup = new THREE.Group();

    // Back mounting plate
    const backGeo = new THREE.BoxGeometry(W, H, WALL);
    const backMesh = new THREE.Mesh(backGeo, steelPaintMat);
    backMesh.position.set(0, 0, -D / 2 + WALL / 2);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    baseGroup.add(backMesh);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL, H, BASE_D),
      steelPaintMat
    );
    leftWall.position.set(-W / 2 + WALL / 2, 0, -D / 2 + BASE_D / 2);
    leftWall.castShadow = true;
    baseGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL, H, BASE_D),
      steelPaintMat
    );
    rightWall.position.set(W / 2 - WALL / 2, 0, -D / 2 + BASE_D / 2);
    rightWall.castShadow = true;
    baseGroup.add(rightWall);

    // Top wall
    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(W, WALL, BASE_D),
      steelPaintMat
    );
    topWall.position.set(0, H / 2 - WALL / 2, -D / 2 + BASE_D / 2);
    topWall.castShadow = true;
    baseGroup.add(topWall);

    // Bottom wall
    const bottomWall = new THREE.Mesh(
      new THREE.BoxGeometry(W, WALL, BASE_D),
      steelPaintMat
    );
    bottomWall.position.set(0, -H / 2 + WALL / 2, -D / 2 + BASE_D / 2);
    bottomWall.castShadow = true;
    baseGroup.add(bottomWall);

    // Interior grey liner floor
    const liner = new THREE.Mesh(
      new THREE.PlaneGeometry(W - WALL * 2, H - WALL * 2),
      steelInteriorMat
    );
    liner.position.set(0, 0, -D / 2 + WALL + 0.001);
    liner.receiveShadow = true;
    baseGroup.add(liner);

    // ——— 3 CABLE GLANDS ON BOTTOM WALL ———
    // Seen clearly in photo 3: 3 rubber grommets with recessed diaphragms
    const glandPositions = [-0.11, 0, 0.11];
    glandPositions.forEach((gx) => {
      // Main rubber flange body
      const glandBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.02, 0.024, 24),
        darkRubberMat
      );
      glandBody.position.set(gx, -H / 2 - 0.008, -D / 2 + BASE_D / 2);
      glandBody.castShadow = true;
      baseGroup.add(glandBody);

      // Outer lip ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.018, 0.003, 12, 24),
        darkRubberMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(gx, -H / 2 - 0.016, -D / 2 + BASE_D / 2);
      baseGroup.add(ring);

      // Inner diaphragm hole
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.011, 16),
        new THREE.MeshBasicMaterial({ color: 0x050505 })
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(gx, -H / 2 - 0.0205, -D / 2 + BASE_D / 2);
      baseGroup.add(hole);
    });

    // ——— REAR WALL MOUNTING BOSSES & SCREWS (Matching Photo 5) ———
    // Top two mounting bosses
    [-1, 1].forEach((dir) => {
      const boss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.02, 0.008, 20),
        steelPaintMat
      );
      boss.rotation.x = Math.PI / 2;
      boss.position.set(dir * (W / 2 - 0.038), H / 2 - 0.032, -D / 2 - 0.003);
      baseGroup.add(boss);

      const bossHole = new THREE.Mesh(
        new THREE.CircleGeometry(0.006, 16),
        new THREE.MeshBasicMaterial({ color: 0x080808 })
      );
      bossHole.position.set(dir * (W / 2 - 0.038), H / 2 - 0.032, -D / 2 - 0.0075);
      baseGroup.add(bossHole);
    });

    // Bottom center boss
    const botBoss = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.02, 0.008, 20),
      steelPaintMat
    );
    botBoss.rotation.x = Math.PI / 2;
    botBoss.position.set(0, -H / 2 + 0.028, -D / 2 - 0.003);
    baseGroup.add(botBoss);

    const botHole = new THREE.Mesh(
      new THREE.CircleGeometry(0.006, 16),
      new THREE.MeshBasicMaterial({ color: 0x080808 })
    );
    botHole.position.set(0, -H / 2 + 0.028, -D / 2 - 0.0075);
    baseGroup.add(botHole);

    // Rear self-tapping screws grid from Photo 5
    const rearScrews = [
      [-0.15, 0.08], [-0.14, 0.08], [-0.08, 0.08], [-0.04, 0.08], [0.03, 0.08], [0.07, 0.08], [0.08, 0.08], [0.14, 0.08],
      [-0.11, 0.0], [-0.01, 0.0], [0.0, 0.0], [0.09, 0.0], [0.10, 0.0],
      [-0.17, -0.06], [-0.10, -0.06], [0.0, -0.06], [0.10, -0.06],
      [-0.16, -0.12], [-0.10, -0.12], [-0.05, -0.12], [0.0, -0.12], [0.05, -0.12], [0.10, -0.12], [0.15, -0.12],
    ];

    const screwHeadGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 8);
    const screwSlotGeo = new THREE.BoxGeometry(0.006, 0.001, 0.001);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

    rearScrews.forEach(([sx, sy]) => {
      const scr = new THREE.Mesh(screwHeadGeo, chromeMat);
      scr.rotation.x = Math.PI / 2;
      scr.position.set(sx, sy, -D / 2 - 0.001);
      baseGroup.add(scr);

      const slt = new THREE.Mesh(screwSlotGeo, slotMat);
      slt.position.set(sx, sy, -D / 2 - 0.0026);
      baseGroup.add(slt);
    });

    return baseGroup;
  }

  // ================================================================
  //  2. INTERNAL COMPONENTS (Contactors, Transformer, Duct, Terminals)
  // ================================================================
  function buildInternals() {
    const intGroup = new THREE.Group();
    const baseFloorZ = -D / 2 + WALL + 0.002;

    // ——— A. STEP-DOWN CONTROL TRANSFORMER (Left Side) ———
    const tfGroup = new THREE.Group();
    tfGroup.position.set(-0.15, 0.05, baseFloorZ + 0.025);

    // Lamination stack core
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.05, 0.035),
      transformerCoreMat
    );
    tfGroup.add(core);

    // Copper winding bobbin in center
    const bobbin = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.038, 0.042),
      copperWireMat
    );
    tfGroup.add(bobbin);

    // Yellow insulation tape wrap
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.025, 0.043),
      new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 })
    );
    tfGroup.add(tape);

    // Mounting brackets (top/bottom)
    [-0.028, 0.028].forEach((my) => {
      const bkt = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.006, 0.01),
        chromeMat
      );
      bkt.position.set(0, my, -0.015);
      tfGroup.add(bkt);
    });

    intGroup.add(tfGroup);

    // ——— B. 3 CITATION LINE 40A CONTACTORS (Row across Upper Right) ———
    // Observed in Photo 8: 3 red-trimmed contactors side-by-side
    const cPositions = [
      { x: -0.065, hasAux: false, hp: 'HP: 15 / 20' },
      { x: 0.035, hasAux: true, hp: 'HP: 20 / 25' },
      { x: 0.135, hasAux: true, hp: 'HP: 30 / 40' },
    ];

    const cW = 0.075;
    const cH = 0.085;
    const cD = 0.06;
    const cY = 0.05;

    cPositions.forEach((pos) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(pos.x, cY, baseFloorZ + cD / 2);

      // Black molded body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(cW, cH, cD),
        contactorBodyMat
      );
      body.castShadow = true;
      cGroup.add(body);

      // Red outer bezel / frame band
      const redBand = new THREE.Mesh(
        new THREE.BoxGeometry(cW + 0.002, cH + 0.002, 0.015),
        contactorRedMat
      );
      redBand.position.z = cD / 2 - 0.008;
      cGroup.add(redBand);

      // Front white label face
      const labelMat = new THREE.MeshStandardMaterial({
        map: createContactorTexture('CITATION LINE', pos.hp),
        roughness: 0.6,
      });
      const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(cW - 0.006, cH - 0.01),
        labelMat
      );
      labelMesh.position.z = cD / 2 + 0.001;
      cGroup.add(labelMesh);

      // Terminal screws (3 on top, 3 on bottom)
      [-1, 1].forEach((row) => {
        [-0.024, 0, 0.024].forEach((tx) => {
          const screw = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0035, 0.0035, 0.005, 8),
            brassMat
          );
          screw.rotation.x = Math.PI / 2;
          screw.position.set(tx, row * (cH / 2 - 0.008), cD / 2 + 0.003);
          cGroup.add(screw);

          // Terminal wire lug
          const lug = new THREE.Mesh(
            new THREE.BoxGeometry(0.008, 0.008, 0.003),
            chromeMat
          );
          lug.position.set(tx, row * (cH / 2 - 0.008), cD / 2 + 0.001);
          cGroup.add(lug);
        });
      });

      // Transparent Auxiliary Contact Block on top (Contactor 2 and 3)
      if (pos.hasAux) {
        const auxW = 0.042;
        const auxH = 0.048;
        const auxD = 0.025;

        const auxBlock = new THREE.Mesh(
          new THREE.BoxGeometry(auxW, auxH, auxD),
          acrylicClearMat
        );
        auxBlock.position.set(0, 0.008, cD / 2 + auxD / 2 + 0.001);
        cGroup.add(auxBlock);

        // Internal brass contacts visible inside clear block
        for (let ai = -0.012; ai <= 0.012; ai += 0.024) {
          const contact = new THREE.Mesh(
            new THREE.CylinderGeometry(0.003, 0.003, 0.015, 8),
            brassMat
          );
          contact.rotation.x = Math.PI / 2;
          contact.position.set(ai, 0.008, cD / 2 + auxD / 2);
          cGroup.add(contact);
        }
      }

      intGroup.add(cGroup);
    });

    // Inter-contactor heavy busbar wire jumpers (Photo 8)
    for (let bi = 0; bi < 3; bi++) {
      const yOff = 0.075 - bi * 0.025;
      const jumper = makeWireSegment(
        -0.065 + 0.024, yOff, baseFloorZ + cD - 0.01,
        0.035 - 0.024, yOff, baseFloorZ + cD - 0.01,
        0.003, wireBlackMat
      );
      intGroup.add(jumper);

      const jumper2 = makeWireSegment(
        0.035 + 0.024, yOff, baseFloorZ + cD - 0.01,
        0.135 - 0.024, yOff, baseFloorZ + cD - 0.01,
        0.003, wireBlackMat
      );
      intGroup.add(jumper2);
    }

    // ——— C. HORIZONTAL GREY SLOTTED WIRE DUCT / RACEWAY ———
    // Runs horizontally below contactors (Photo 8)
    const ductY = -0.035;
    const ductW = 0.38;
    const ductH = 0.035;
    const ductD = 0.038;

    const ductBody = new THREE.Mesh(
      new THREE.BoxGeometry(ductW, ductH, ductD),
      trunkingGreyMat
    );
    ductBody.position.set(0, ductY, baseFloorZ + ductD / 2);
    intGroup.add(ductBody);

    // Slotted finger vents on duct cover
    for (let dx = -ductW / 2 + 0.015; dx <= ductW / 2 - 0.015; dx += 0.016) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, ductH - 0.006, 0.001),
        new THREE.MeshBasicMaterial({ color: 0x22262e })
      );
      slot.position.set(dx, ductY, baseFloorZ + ductD + 0.001);
      intGroup.add(slot);
    }

    // ——— D. 3 HEAVY-DUTY TERMINAL BLOCKS (Bottom Row) ———
    // Photo 8 labels: [R Y B MOTOR], [B Y R MAINS], [R Y B MOTOR]
    const tbConfigs = [
      { x: -0.11, isMains: false, labelText: 'MOTOR' },
      { x: 0.0, isMains: true, labelText: 'MAINS' },
      { x: 0.11, isMains: false, labelText: 'MOTOR' },
    ];

    const tbY = -0.095;
    const tbW = 0.072;
    const tbH = 0.045;
    const tbD = 0.026;

    tbConfigs.forEach((tb) => {
      const tbGroup = new THREE.Group();
      tbGroup.position.set(tb.x, tbY, baseFloorZ + tbD / 2);

      // Black Bakelite block
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(tbW, tbH, tbD),
        contactorBodyMat
      );
      tbGroup.add(block);

      // 6 brass screw terminal posts (3 upper, 3 lower)
      [-0.022, 0, 0.022].forEach((tx) => {
        [-0.012, 0.012].forEach((ty) => {
          const screw = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0035, 0.0035, 0.005, 8),
            brassMat
          );
          screw.rotation.x = Math.PI / 2;
          screw.position.set(tx, ty, tbD / 2 + 0.002);
          tbGroup.add(screw);

          // Connecting wire running from terminal into the duct above
          if (ty > 0) {
            const wire = makeWireSegment(
              tb.x + tx, tbY + ty, baseFloorZ + tbD / 2,
              tb.x + tx, ductY - ductH / 2, baseFloorZ + tbD / 2,
              0.0025, wireBlackMat
            );
            intGroup.add(wire);
          }
        });
      });

      // RYB color label strip below the block
      const labelMat = new THREE.MeshBasicMaterial({
        map: createTerminalLabelTexture(tb.isMains),
      });
      const labelStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(tbW - 0.004, 0.018),
        labelMat
      );
      labelStrip.position.set(0, -tbH / 2 - 0.012, tbD / 2);
      tbGroup.add(labelStrip);

      intGroup.add(tbGroup);
    });

    return intGroup;
  }

  function makeWireSegment(x1, y1, z1, x2, y2, z2, radius, mat) {
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2)
    );
    const geom = new THREE.TubeGeometry(curve, 2, radius, 6, false);
    return new THREE.Mesh(geom, mat);
  }

  // ================================================================
  //  3. PANEL DOOR (Front faceplate, switches, cutouts, inside PCB box)
  // ================================================================
  let doorPivot;
  let potKnobMesh;

  function buildHingedDoor() {
    // Pivot along LEFT long side (Photo 8 shows door hinged on left swinging out)
    doorPivot = new THREE.Group();
    doorPivot.position.set(-W / 2 + WALL, 0, D / 2);
    rootGroup.add(doorPivot);

    const doorMeshGroup = new THREE.Group();
    // Offset door mesh so pivot is at the hinge line
    doorMeshGroup.position.set(W / 2 - WALL, 0, 0);
    doorPivot.add(doorMeshGroup);

    // Deep clamshell door perimeter walls (35mm deep cover)
    // Front face plate
    const frontFace = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, 0.003),
      steelPaintMat
    );
    frontFace.position.set(0, 0, DOOR_D / 2);
    frontFace.castShadow = true;
    doorMeshGroup.add(frontFace);

    // Door return flanges (top, bottom, right, left)
    const flangeMat = steelPaintMat;

    // Top flange
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(W, 0.003, DOOR_D), flangeMat);
    topFlange.position.set(0, H / 2, 0);
    doorMeshGroup.add(topFlange);

    // Bottom flange
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(W, 0.003, DOOR_D), flangeMat);
    botFlange.position.set(0, -H / 2, 0);
    doorMeshGroup.add(botFlange);

    // Right flange (latch side)
    const rightFlange = new THREE.Mesh(new THREE.BoxGeometry(0.003, H, DOOR_D), flangeMat);
    rightFlange.position.set(W / 2, 0, 0);
    doorMeshGroup.add(rightFlange);

    // Left flange (hinge side)
    const leftFlange = new THREE.Mesh(new THREE.BoxGeometry(0.003, H, DOOR_D), flangeMat);
    leftFlange.position.set(-W / 2, 0, 0);
    doorMeshGroup.add(leftFlange);


    // ——— A. MAIN CONTROL FACEPLATE (Vertical Portrait on the Left — Image 2) ———
    // High-resolution canvas texture mapping all graphics, LCD, text, and LED indicators
    const faceplateMat = new THREE.MeshStandardMaterial({
      map: initFaceplateTexture(),
      roughness: 0.32,
      metalness: 0.05,
    });

    const fpW = 0.104;  // ~104mm wide
    const fpH = 0.218;  // ~218mm tall (vertical portrait)
    const fpX = -0.134; // placed on the left side of the panel door
    const fpY = 0.008;  // centered vertically
    const fpZ = DOOR_D / 2 + 0.002;

    const faceplateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(fpW, fpH),
      faceplateMat
    );
    faceplateMesh.position.set(fpX, fpY, fpZ);
    faceplateMesh.receiveShadow = true;
    doorMeshGroup.add(faceplateMesh);

    // Chrome outer bezel frame surrounding faceplate
    const frameT = 0.0035;
    const frameD = 0.005;
    // Top
    doorMeshGroup.add(makeFrameBar(fpW + frameT * 2, frameT, frameD, fpX, fpY + fpH / 2 + frameT / 2, fpZ + frameD / 2));
    // Bottom
    doorMeshGroup.add(makeFrameBar(fpW + frameT * 2, frameT, frameD, fpX, fpY - fpH / 2 - frameT / 2, fpZ + frameD / 2));
    // Left
    doorMeshGroup.add(makeFrameBar(frameT, fpH, frameD, fpX - fpW / 2 - frameT / 2, fpY, fpZ + frameD / 2));
    // Right
    doorMeshGroup.add(makeFrameBar(frameT, fpH, frameD, fpX + fpW / 2 + frameT / 2, fpY, fpZ + frameD / 2));

    // ——— B. PHYSICAL 3D SWITCHES (Horizontal Row at Bottom of Faceplate — Image 2) ———
    const swY = fpY - fpH / 2 + 0.021;
    const swW = 0.015;
    const swH = 0.021;
    const swD = 0.007;
    const colStep = fpW / 4;

    const btnOnMat = new THREE.MeshStandardMaterial({ color: 0x009944, roughness: 0.35, metalness: 0.05 });
    const btnOffMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.35, metalness: 0.05 });
    const btnBlueMat = new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.35, metalness: 0.05 });

    // 1. Green ON Push Button (Left)
    const btnOn = createSwitch(swW, swH, swD, btnOnMat, fpX - colStep * 1.5, swY, fpZ);
    btnOn.name = 'btn_motor_on';
    doorMeshGroup.add(btnOn);

    // 2. Red OFF Push Button
    const btnOff = createSwitch(swW, swH, swD, btnOffMat, fpX - colStep * 0.5, swY, fpZ);
    btnOff.name = 'btn_motor_off';
    doorMeshGroup.add(btnOff);

    // 3. Blue AUTO / 2-PHASE Switch
    const btnPhase2 = createSwitch(swW, swH, swD, btnBlueMat, fpX + colStep * 0.5, swY, fpZ);
    btnPhase2.name = 'btn_phase2';
    doorMeshGroup.add(btnPhase2);

    // 4. Red AUTO / 3-PHASE Rocker Switch (Right, with O / I marking)
    const btnPhase3 = createSwitch(swW, swH, swD, btnOffMat, fpX + colStep * 1.5, swY, fpZ);
    btnPhase3.name = 'btn_phase3';
    // Rocker circle/line graphic
    const rockerO = new THREE.Mesh(
      new THREE.RingGeometry(0.0018, 0.0026, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    rockerO.position.set(0, 0.004, swD / 2 + 0.0025);
    btnPhase3.add(rockerO);

    const rockerI = new THREE.Mesh(
      new THREE.PlaneGeometry(0.0012, 0.0045),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    rockerI.position.set(0, -0.004, swD / 2 + 0.0025);
    btnPhase3.add(rockerI);

    doorMeshGroup.add(btnPhase3);

    // ——— C. CENTER BLACK POTENTIOMETER KNOB (Above Vkon Logo in Yellow Area) ———
    const knobX = fpX;
    const knobY = fpY + 0.016;
    const knobGeo = new THREE.CylinderGeometry(0.010, 0.012, 0.009, 24);
    potKnobMesh = new THREE.Mesh(knobGeo, darkRubberMat);
    potKnobMesh.rotation.x = Math.PI / 2;
    potKnobMesh.position.set(knobX, knobY, fpZ + 0.005);
    potKnobMesh.castShadow = true;

    // Recessed cross (+) screwdriver slot on knob
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const slotH = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.008, 0.010), slotMat);
    const slotV = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0018, 0.010), slotMat);
    potKnobMesh.add(slotH);
    potKnobMesh.add(slotV);

    doorMeshGroup.add(potKnobMesh);

    // ——— D. SQUARE AMMETER KNOCKOUT WITH 4 TABS (In Center of Door — Image 2) ———
    // In Image 2, this is a stamped sheet metal knockout plate surrounded by a slit groove and held by 4 tabs
    const ammeterGroup = new THREE.Group();
    const ammeterX = -0.012;
    const ammeterY = -0.040;
    ammeterGroup.position.set(ammeterX, ammeterY, fpZ);

    const cutW = 0.064;
    const cutH = 0.064;
    const slitT = 0.0018;

    // Slit groove segments (Top, Bottom, Left segments, Right segments with tab gaps)
    const slitMat = new THREE.MeshBasicMaterial({ color: 0x111317 });

    // Top slit
    const slitTop = new THREE.Mesh(new THREE.PlaneGeometry(cutW, slitT), slitMat);
    slitTop.position.set(0, cutH / 2, 0.0006);
    ammeterGroup.add(slitTop);

    // Bottom slit
    const slitBot = new THREE.Mesh(new THREE.PlaneGeometry(cutW, slitT), slitMat);
    slitBot.position.set(0, -cutH / 2, 0.0006);
    ammeterGroup.add(slitBot);

    // Left and Right edge slits (with 2 tabs on each side as seen in Image 2)
    [-1, 1].forEach((side) => {
      // Top segment
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(slitT, cutH * 0.28), slitMat);
      s1.position.set(side * cutH / 2, cutH * 0.35, 0.0006);
      ammeterGroup.add(s1);

      // Middle segment between the two tabs
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(slitT, cutH * 0.28), slitMat);
      s2.position.set(side * cutH / 2, 0, 0.0006);
      ammeterGroup.add(s2);

      // Bottom segment
      const s3 = new THREE.Mesh(new THREE.PlaneGeometry(slitT, cutH * 0.28), slitMat);
      s3.position.set(side * cutH / 2, -cutH * 0.35, 0.0006);
      ammeterGroup.add(s3);

      // The 4 stamped tab notch marks extending slightly outward (Image 2)
      [-0.020, 0.020].forEach((ty) => {
        const tabNotch = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.005), slitMat);
        tabNotch.position.set(side * (cutH / 2 + 0.002), ty, 0.0006);
        ammeterGroup.add(tabNotch);
      });
    });

    doorMeshGroup.add(ammeterGroup);

    // ——— E. EMBOSSED SQUARE RECESS (On the Right Side of Door — Image 2) ———
    // In Image 2, there is an embossed stamped square plate on the right side
    const embossW = 0.076;
    const embossH = 0.076;
    const embossGroup = new THREE.Group();
    const embossX = 0.128;
    const embossY = -0.040;
    embossGroup.position.set(embossX, embossY, fpZ - 0.0005);

    // Recessed plate (slightly darker shadow tone)
    const embossMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(embossW, embossH),
      new THREE.MeshStandardMaterial({
        color: 0xc4c0b6,
        roughness: 0.52,
        metalness: 0.06,
      })
    );
    embossGroup.add(embossMesh);

    // Top & Left shadow edges (embossed inward)
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x99948a });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xeeeae2 });

    const topShadow = new THREE.Mesh(new THREE.PlaneGeometry(embossW, 0.0016), shadowMat);
    topShadow.position.set(0, embossH / 2, 0.001);
    embossGroup.add(topShadow);

    const leftShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.0016, embossH), shadowMat);
    leftShadow.position.set(-embossW / 2, 0, 0.001);
    embossGroup.add(leftShadow);

    // Bottom & Right highlight edges
    const botHighlight = new THREE.Mesh(new THREE.PlaneGeometry(embossW, 0.0016), highlightMat);
    botHighlight.position.set(0, -embossH / 2, 0.001);
    embossGroup.add(botHighlight);

    const rightHighlight = new THREE.Mesh(new THREE.PlaneGeometry(0.0016, embossH), highlightMat);
    rightHighlight.position.set(embossW / 2, 0, 0.001);
    embossGroup.add(rightHighlight);

    doorMeshGroup.add(embossGroup);

    // ——— F. INSIDE OF DOOR: CONTROLLER PCB ENCLOSURE BOX (Photo 7) ———
    // Beige plastic rectangular box mounted directly on inner face of door behind faceplate
    const pcbGroup = new THREE.Group();
    const pcbW = 0.102;
    const pcbH = 0.208;
    const pcbD = 0.030;
    pcbGroup.position.set(fpX, fpY, -DOOR_D / 2 + pcbD / 2 + 0.002);

    const pcbBody = new THREE.Mesh(
      new THREE.BoxGeometry(pcbW, pcbH, pcbD),
      pcbBoxMat
    );
    pcbGroup.add(pcbBody);

    // Ventilation cooling ribs
    for (let ry = -pcbH / 2 + 0.02; ry <= pcbH / 2 - 0.02; ry += 0.012) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(pcbW - 0.016, 0.003, 0.002),
        new THREE.MeshBasicMaterial({ color: 0x444038 })
      );
      rib.position.set(0, ry, -pcbD / 2 - 0.001);
      pcbGroup.add(rib);
    }

    // 6 corner mounting screws
    [[-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1]].forEach(([sx, sy]) => {
      const scr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.003, 8),
        chromeMat
      );
      scr.rotation.x = Math.PI / 2;
      scr.position.set(
        sx * (pcbW / 2 - 0.012),
        sy * (pcbH / 2 - 0.012),
        -pcbD / 2 - 0.001
      );
      pcbGroup.add(scr);
    });

    // Flexible black cable harness bridging from door PCB box to base enclosure
    const harnessCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(fpX, fpY - pcbH / 2, -DOOR_D / 2),
      new THREE.Vector3(fpX - 0.05, fpY - pcbH / 2 - 0.04, -0.02),
      new THREE.Vector3(-0.12, -0.02, -D / 2 + BASE_D / 2),
    ]);
    const harnessMesh = new THREE.Mesh(
      new THREE.TubeGeometry(harnessCurve, 16, 0.006, 8, false),
      wireBlackMat
    );
    doorMeshGroup.add(harnessMesh);

    doorMeshGroup.add(pcbGroup);

    // ——— G. TWO EXTERNAL STEEL BUTT HINGES (Photo 4) ———
    // Mounted on the left edge connecting door to body
    [-0.08, 0.08].forEach((hy) => {
      const hinge = buildHingeMesh();
      hinge.position.set(-W / 2, hy, 0);
      rootGroup.add(hinge);
    });

    return doorMeshGroup;
  }

  function createSwitch(w, h, d, colorMat, x, y, z) {
    const swGroup = new THREE.Group();
    swGroup.position.set(x, y, z);

    // Black plastic base frame
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.004, h + 0.004, 0.004),
      new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.7 })
    );
    base.position.z = 0.002;
    swGroup.add(base);

    // Beveled rocker / toggle button
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      colorMat
    );
    btn.position.z = d / 2 + 0.002;
    btn.castShadow = true;
    swGroup.add(btn);

    return swGroup;
  }

  function makeFrameBar(w, h, d, x, y, z) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      chromeMat
    );
    bar.position.set(x, y, z);
    return bar;
  }

  function buildHingeMesh() {
    const hGroup = new THREE.Group();

    // Hinge cylinder pin
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.042, 16),
      chromeMat
    );
    pin.position.set(0, 0, D / 2);
    hGroup.add(pin);

    // Door leaf plate
    const leafDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.038, 0.003),
      chromeMat
    );
    leafDoor.position.set(0.01, 0, D / 2);
    hGroup.add(leafDoor);

    // Body leaf plate
    const leafBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.038, 0.02),
      chromeMat
    );
    leafBody.position.set(-0.001, 0, D / 2 - 0.01);
    hGroup.add(leafBody);

    // 4 Hinge screws
    [-0.012, 0.012].forEach((sy) => {
      const scr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0025, 0.0025, 0.003, 8),
        chromeMat
      );
      scr.rotation.x = Math.PI / 2;
      scr.position.set(0.012, sy, D / 2 + 0.002);
      hGroup.add(scr);
    });

    return hGroup;
  }

  // ================================================================
  //  BUILD SCENE
  // ================================================================
  const baseMesh = buildEnclosureBase();
  rootGroup.add(baseMesh);

  const internalsMesh = buildInternals();
  rootGroup.add(internalsMesh);

  const doorGroup = buildHingedDoor();

  // ================================================================
  //  CAMERA PRESETS & ANIMATIONS (GSAP)
  // ================================================================

  function animateCameraTo(targetPos, targetLookAt, duration = 1.1) {
    gsap.to(camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration,
      ease: 'power3.inOut',
    });

    gsap.to(controls.target, {
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      duration,
      ease: 'power3.inOut',
    });
  }

  function setDoorState(open) {
    state.isDoorOpen = open;
    const targetAngle = open ? -Math.PI * 0.58 : 0; // Swing open 105 degrees

    gsap.to(doorPivot.rotation, {
      y: targetAngle,
      duration: 1.0,
      ease: 'power2.inOut',
    });

    // Update UI button label
    const label = document.getElementById('doorBtnLabel');
    if (label) label.textContent = open ? 'Close Door' : 'Open Door';
  }

  function toggleMotorPower(on) {
    state.isMotorRunning = (on !== undefined) ? on : !state.isMotorRunning;

    const btn = document.getElementById('btnPowerToggle');
    const label = document.getElementById('powerBtnLabel');
    const statusPill = document.getElementById('systemStatusPill');

    if (state.isMotorRunning) {
      state.voltage = 415;
      state.current = 17.8 + Math.random() * 0.8;
      if (btn) {
        btn.classList.remove('is-off');
        if (label) label.textContent = 'Motor ON';
      }
      if (statusPill) {
        statusPill.innerHTML = '<span class="status-dot green"></span><span class="status-text">MOTOR RUNNING · 415V · 18.2A</span>';
      }
    } else {
      state.voltage = 0;
      state.current = 0;
      if (btn) {
        btn.classList.add('is-off');
        if (label) label.textContent = 'Motor OFF';
      }
      if (statusPill) {
        statusPill.innerHTML = '<span class="status-dot red"></span><span class="status-text">MOTOR STOPPED · STANDBY</span>';
      }
    }

    updateFaceplateCanvas();
  }

  // Periodic subtle voltage / current fluctuation when running for realism
  setInterval(() => {
    if (state.isMotorRunning) {
      state.voltage = 414 + Math.floor(Math.random() * 3);
      state.current = 18.0 + (Math.random() - 0.5) * 0.6;
      updateFaceplateCanvas();
    }
  }, 2200);

  // ================================================================
  //  UI INTERACTION EVENT HANDLERS
  // ================================================================

  const btnFront = document.getElementById('btnFront');
  const btnToggleDoor = document.getElementById('btnToggleDoor');
  const btnInside = document.getElementById('btnInside');
  const btnBack = document.getElementById('btnBack');
  const btnRotate = document.getElementById('btnRotate');
  const btnPowerToggle = document.getElementById('btnPowerToggle');

  function setActiveDockBtn(activeBtn) {
    [btnFront, btnInside, btnBack].forEach((b) => b && b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Front View
  if (btnFront) {
    btnFront.addEventListener('click', () => {
      setActiveDockBtn(btnFront);
      setDoorState(false);
      animateCameraTo({ x: 0, y: 0.04, z: 0.72 }, { x: 0, y: 0, z: 0 });
    });
  }

  // Toggle Door Open / Close
  if (btnToggleDoor) {
    btnToggleDoor.addEventListener('click', () => {
      setDoorState(!state.isDoorOpen);
      if (state.isDoorOpen) {
        setActiveDockBtn(btnInside);
      }
    });
  }

  // Inside View
  if (btnInside) {
    btnInside.addEventListener('click', () => {
      setActiveDockBtn(btnInside);
      setDoorState(true);
      // Zoom into internal contactors & terminals
      animateCameraTo({ x: 0.04, y: 0.02, z: 0.46 }, { x: 0.02, y: -0.02, z: -0.02 });
    });
  }

  // Rear Wall Mount View
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      setActiveDockBtn(btnBack);
      setDoorState(false);
      animateCameraTo({ x: 0, y: 0.05, z: -0.76 }, { x: 0, y: 0, z: 0 });
    });
  }

  // Toggle Auto-Rotation
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      btnRotate.classList.toggle('active', controls.autoRotate);
    });
  }

  // Toggle Motor Power
  if (btnPowerToggle) {
    btnPowerToggle.addEventListener('click', () => {
      toggleMotorPower();
    });
  }

  // Double click canvas to toggle door
  canvas.addEventListener('dblclick', () => {
    setDoorState(!state.isDoorOpen);
  });

  // Raycasting for physical switch clicks
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(doorGroup.children, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj.parent && !obj.name && obj !== doorGroup) {
        obj = obj.parent;
      }

      if (obj && obj.name) {
        if (obj.name === 'btn_motor_on') {
          // Push button animation
          gsap.to(obj.position, { z: obj.position.z - 0.003, duration: 0.1, yoyo: true, repeat: 1 });
          toggleMotorPower(true);
        } else if (obj.name === 'btn_motor_off') {
          gsap.to(obj.position, { z: obj.position.z - 0.003, duration: 0.1, yoyo: true, repeat: 1 });
          toggleMotorPower(false);
        } else if (obj.name === 'btn_phase2' || obj.name === 'btn_phase3') {
          gsap.to(obj.rotation, { x: obj.rotation.x + 0.2, duration: 0.15, yoyo: true, repeat: 1 });
        }
      }
    }
  });

  // Potentiometer knob rotation on hover/wheel
  canvas.addEventListener('wheel', (e) => {
    if (e.shiftKey && potKnobMesh) {
      state.potAngle += e.deltaY * 0.002;
      potKnobMesh.rotation.z = state.potAngle;
    }
  }, { passive: true });

  // ================================================================
  //  WINDOW RESIZE
  // ================================================================
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ================================================================
  //  ANIMATION RENDER LOOP
  // ================================================================
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
})();
