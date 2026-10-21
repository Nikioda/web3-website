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

    // 1. Off-white outer sticker base
    ctx.fillStyle = '#f5f2eb';
    ctx.fillRect(0, 0, w, h);

    // 2. Dark teal-green perimeter border line (Photo)
    ctx.strokeStyle = '#005f60';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // ================================================================
    //  SECTION 1: TOP DARK HEADER (LEDs + LCD Meter Display)
    // ================================================================
    const topY = 22;
    const topH = 460;
    ctx.fillStyle = '#111620'; // Deep blue-black
    ctx.fillRect(22, topY, w - 44, topH);

    // ——— 3 Top Phase Hanging Tabs: Red (R), Yellow (Y), Blue (B) (Photo) ———
    const tabConfigs = [
      { x: 220, label: 'R', bg: '#c62828', activeCol: '#ff4d4d', isActive: state.isMotorRunning },
      { x: 512, label: 'Y', bg: '#c2d200', activeCol: '#ffee55', isActive: state.isMotorRunning },
      { x: 804, label: 'B', bg: '#0084c8', activeCol: '#29b6f6', isActive: state.isMotorRunning },
    ];

    const tabW = 110;
    const tabH = 120;
    const tabR = tabW / 2;

    tabConfigs.forEach((t) => {
      // Arched tab body hanging down from top edge
      ctx.beginPath();
      ctx.moveTo(t.x - tabR, topY);
      ctx.lineTo(t.x + tabR, topY);
      ctx.lineTo(t.x + tabR, topY + tabH - tabR);
      ctx.arc(t.x, topY + tabH - tabR, tabR, 0, Math.PI, false);
      ctx.closePath();
      ctx.fillStyle = t.bg;
      ctx.fill();

      // Letter (R, Y, B) in bold black
      ctx.fillStyle = '#11141a';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.label, t.x, topY + 40);

      // Circular indicator jewel / lens
      const lensY = topY + tabH - tabR + 2;
      const lensR = 23;

      // Dark bezel ring around lens
      ctx.beginPath();
      ctx.arc(t.x, lensY, lensR + 3, 0, Math.PI * 2);
      ctx.fillStyle = '#11141a';
      ctx.fill();
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Lens interior
      ctx.beginPath();
      ctx.arc(t.x, lensY, lensR, 0, Math.PI * 2);
      if (t.isActive) {
        const radGrad = ctx.createRadialGradient(t.x - 5, lensY - 5, 2, t.x, lensY, lensR);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.35, t.activeCol);
        radGrad.addColorStop(0.85, t.bg);
        radGrad.addColorStop(1, '#11141a');
        ctx.fillStyle = radGrad;
      } else {
        const radGrad = ctx.createRadialGradient(t.x - 5, lensY - 5, 2, t.x, lensY, lensR);
        radGrad.addColorStop(0, '#58606c');
        radGrad.addColorStop(0.7, '#2a3038');
        radGrad.addColorStop(1, '#11141a');
        ctx.fillStyle = radGrad;
      }
      ctx.fill();

      // Specular gloss reflection
      ctx.beginPath();
      ctx.ellipse(t.x - 6, lensY - 6, 6, 3.5, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
    });

    // ——— LCD Display Window (Photo: wide aspect ratio) ———
    const lcdX = 180;
    const lcdY = 175;
    const lcdW = w - lcdX - 76; // = 768
    const lcdH = 172;

    // Labels to the LEFT of the LCD window: AMPS (top) and VOLT (bottom) in crisp WHITE
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('AMPS', lcdX - 20, lcdY + 54);
    ctx.fillText('VOLT', lcdX - 20, lcdY + 138);

    // Labels BELOW the LCD window: RY, YB, RB, STATUS in crisp WHITE
    const underY = lcdY + lcdH + 42;
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RY', 220, underY);
    ctx.fillText('YB', 425, underY);
    ctx.fillText('RB', 630, underY);
    ctx.fillText('STATUS', 835, underY);

    // Molded outer bezel frame around LCD cutout
    ctx.fillStyle = '#1e232c';
    roundRect(ctx, lcdX, lcdY, lcdW, lcdH, 8);
    ctx.fill();
    ctx.strokeStyle = '#475161';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Recessed dark border
    ctx.strokeStyle = '#0d1015';
    ctx.lineWidth = 3;
    roundRect(ctx, lcdX + 4, lcdY + 4, lcdW - 8, lcdH - 8, 5);
    ctx.stroke();

    // LCD Screen Glass
    const glassX = lcdX + 6;
    const glassY = lcdY + 6;
    const glassW = lcdW - 12;
    const glassH = lcdH - 12;

    const lcdGrad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
    if (state.isMotorRunning) {
      lcdGrad.addColorStop(0, '#152b1b');
      lcdGrad.addColorStop(1, '#0e1d13');
    } else {
      lcdGrad.addColorStop(0, '#222b2f');
      lcdGrad.addColorStop(1, '#171e22');
    }
    ctx.fillStyle = lcdGrad;
    roundRect(ctx, glassX, glassY, glassW, glassH, 4);
    ctx.fill();

    // Digital readout text on LCD screen
    if (state.isMotorRunning) {
      ctx.fillStyle = '#39e75f';
      ctx.font = 'bold 68px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      // Volts row
      ctx.fillText(`${state.voltage}`, glassX + 24, glassY + 70);
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('V AC', glassX + 165, glassY + 66);

      // Amps row
      ctx.font = 'bold 64px "JetBrains Mono", monospace';
      ctx.fillStyle = '#39e75f';
      ctx.fillText(`${state.current.toFixed(1)}`, glassX + 24, glassY + 140);
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText('AMPS', glassX + 180, glassY + 136);

      // Status text
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffd32a';
      ctx.textAlign = 'right';
      ctx.fillText('3PH RUN', glassX + glassW - 18, glassY + 105);
    } else {
      ctx.fillStyle = '#334038';
      ctx.font = 'bold 64px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('---', glassX + 24, glassY + 70);
      ctx.fillText('0.0', glassX + 24, glassY + 140);
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('STANDBY', glassX + glassW - 18, glassY + 105);
    }

    // ================================================================
    //  SECTION 2: MIDDLE YELLOW FIELD (Knob, Vkon Logo, Maroon Badge & Pinstripes)
    // ================================================================
    const midY = topY + topH; // = 482
    const midH = 1098;

    // Dividing teal accent stripe
    ctx.fillStyle = '#005f60';
    ctx.fillRect(22, midY, w - 44, 8);

    // Warm vibrant industrial yellow (Photo)
    ctx.fillStyle = '#f7c02b';
    ctx.fillRect(22, midY + 8, w - 44, midH - 8);

    // Side inner accent lines
    ctx.strokeStyle = '#005f60';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, midY + 14, w - 60, midH - 20);

    // ——— Potentiometer Knob Base Contact Shadow (Photo: NO dial ticks! Clean yellow) ———
    const potX = w / 2;
    const potY = midY + 175; // = 657

    ctx.beginPath();
    ctx.arc(potX, potY + 2, 36, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fill();

    // ——— Vkon AUTOMATION Logo (Photo) ———
    const logoX = 110;
    const logoY = midY + 365; // = 847

    // 'V'
    ctx.fillStyle = '#11141a';
    ctx.font = 'bold 82px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('V', logoX, logoY);

    // 'k'
    ctx.fillText('k', logoX + 56, logoY);

    // 'o' in RED with cyan/grey accent dot above it (Photo)
    ctx.fillStyle = '#d32f2f';
    ctx.fillText('o', logoX + 104, logoY);

    // Cyan/grey circular dot above 'o'
    ctx.beginPath();
    ctx.arc(logoX + 128, logoY - 58, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0084c8';
    ctx.fill();

    // 'n'
    ctx.fillStyle = '#11141a';
    ctx.fillText('n', logoX + 152, logoY);

    // Silver-grey swoosh arching around Vkon logo (Photo)
    ctx.strokeStyle = '#8fa0ad';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(logoX + 12, logoY - 10);
    ctx.quadraticCurveTo(logoX + 130, logoY - 75, logoX + 235, logoY - 8);
    ctx.stroke();

    // AUTOMATION text below Vkon
    ctx.fillStyle = '#11141a';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('AUTOMATION', logoX + 4, logoY + 32);
    ctx.letterSpacing = '0px';

    // ——— Combined Maroon Ribbon + Oval Medallion (Photo) ———
    const ox = 740; // center of oval medallion
    const oy = midY + 540; // = 1022

    // 1. Left Feature Ribbon Capsule (seamlessly overlapping the oval)
    ctx.fillStyle = '#761116'; // Deep maroon / burgundy
    ctx.beginPath();
    ctx.moveTo(160, oy - 95);
    ctx.lineTo(ox - 20, oy - 95);
    ctx.lineTo(ox - 20, oy + 95);
    ctx.lineTo(160, oy + 95);
    ctx.arc(160, oy, 95, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fill();

    // 2. Right Oval Medallion
    ctx.beginPath();
    ctx.ellipse(ox, oy, 165, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Concentric gold & orange hairline rings on the oval medallion (Photo)
    ctx.strokeStyle = '#f5a623';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(ox, oy, 158, 114, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ox, oy, 150, 106, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Feature Bullet Text inside Maroon Ribbon (Printed in crisp WHITE)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const bulletCX = 295;
    const bY = oy - 48;
    ctx.fillText('AUTO START, DRY RUN PROTECT,', bulletCX, bY);
    ctx.fillText('SINGLE PHASE PROTECTOR', bulletCX, bY + 25);
    ctx.fillText('AUTO RE START, OVER LOAD,', bulletCX, bY + 50);
    ctx.fillText('TIMER, FOGGING TIMER', bulletCX, bY + 75);
    ctx.fillText('GSM CONTROLLER 2G, 4G, JIO.', bulletCX, bY + 100);

    // 4. Medallion Text Details (Right side, Photo)
    // "MODEL" header in white
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MODEL', ox, oy - 54);

    // "VKON - SASD 1/2/3"
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VKON - SASD 1/2/3', ox, oy - 16);

    // "• Fully Automatic"
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('• Fully Automatic', ox, oy + 12);

    // "Digital Control Pael" (faithful to physical unit!)
    ctx.fillText('Digital Control Pael', ox, oy + 36);

    // "HP 3 TO 40 HP" in golden yellow
    ctx.fillStyle = '#fbc531';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('HP 3 TO 40 HP', ox, oy + 72);

    // ——— Horizontal Orange/Red Pinstripes (Photo: Below the maroon badge) ———
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2;
    for (let py = midY + 680; py <= midY + midH - 24; py += 15) {
      ctx.beginPath();
      ctx.moveTo(34, py);
      ctx.lineTo(w - 34, py);
      ctx.stroke();
    }

    // ================================================================
    //  SECTION 3: BOTTOM SWITCH ROW (4 Distinct Colored Columns — Photo)
    // ================================================================
    const botY = midY + midH; // = 1580
    const botH = h - botY - 26; // = 442

    // 4 Columns: Teal, Red, Medium Blue, Deep Blue
    const colGap = 16;
    const cardW = (w - 60 - colGap * 3) / 4; // = 229

    const cardConfigs = [
      {
        cx: 30 + 0 * (cardW + colGap),
        bg: '#00a4b8', // Teal
        topLabel: 'MOTER',
        botLabel: 'ON',
        isBlank: false,
      },
      {
        cx: 30 + 1 * (cardW + colGap),
        bg: '#d32f2f', // Red
        topLabel: 'MOTER',
        botLabel: 'OFF',
        isBlank: false,
      },
      {
        cx: 30 + 2 * (cardW + colGap),
        bg: '#2196f3', // Sky/Medium Blue
        topLabel: '2PHASE',
        botLabel: 'AUTO',
        isBlank: true, // BLANK KNOCKOUT in Photo!
      },
      {
        cx: 30 + 3 * (cardW + colGap),
        bg: '#1254a6', // Dark/Cobalt Blue
        topLabel: '3 PHASE',
        botLabel: 'AUTO',
        isBlank: false,
      },
    ];

    cardConfigs.forEach((c) => {
      // Card background
      ctx.fillStyle = c.bg;
      roundRect(ctx, c.cx, botY, cardW, botH, 6);
      ctx.fill();

      // Black perimeter border
      ctx.strokeStyle = '#11141a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Top label in black (Photo: "MOTER", "MOTER", "2PHASE", "3 PHASE")
      ctx.fillStyle = '#11141a';
      ctx.font = 'bold 29px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.topLabel, c.cx + cardW / 2, botY + 44);

      // Bottom label in black (Photo: "ON", "OFF", "AUTO", "AUTO")
      ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(c.botLabel, c.cx + cardW / 2, botY + botH - 22);

      // If this is the blank knockout slot (Card 3 in Photo):
      if (c.isBlank) {
        const slotX = c.cx + 24;
        const slotY = botY + 68;
        const slotW = cardW - 48;
        const slotH = botH - 138;

        ctx.fillStyle = '#1976d2';
        roundRect(ctx, slotX, slotY, slotW, slotH, 4);
        ctx.fill();

        ctx.strokeStyle = '#0d47a1';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
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

  // ================================================================
  //  CITATION LINE CONTACTOR NAMEPLATE TEXTURES (Photos 4 & 8)
  // ================================================================

  // Master Canvas Generator for Citation Line Contactor Red Cap Nameplate
  // Faithfully drawn from user reference photographs (media_1792571138602.png & contactor1_crop.png)
  function renderCitationLineNameplateCanvas(is40A) {
    const W = 1280;
    const H = 512;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    // 1. Deep glossy industrial red background (Photo 4)
    ctx.fillStyle = '#cc1c24';
    ctx.fillRect(0, 0, W, H);

    // Beveled molded plastic rim
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 4;
    roundRect(ctx, 4, 4, W - 8, H - 8, 12);
    ctx.stroke();

    // 2. White Vinyl Nameplate Sticker (Photos 4 & 8)
    const stickerX = 94;
    const stickerY = 16;
    const stickerW = W - 188;
    const stickerH = H - 32;

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, stickerX, stickerY, stickerW, stickerH, 8);
    ctx.fill();

    // 3. Mounting Screw Pockets (Left & Right Ends in horizontal layout)
    const sx1 = 52;
    const sx2 = W - 52;
    const sy = H / 2;

    [sx1, sx2].forEach((sx) => {
      // Recessed red pocket
      ctx.beginPath();
      ctx.arc(sx, sy, 38, 0, Math.PI * 2);
      ctx.fillStyle = '#a01018';
      ctx.fill();

      // Outer silver washer
      ctx.beginPath();
      ctx.arc(sx, sy, 32, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e7ec';
      ctx.fill();
      ctx.strokeStyle = '#9aa3ad';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pan head screw
      const grad = ctx.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, 22);
      grad.addColorStop(0, '#f5f7fa');
      grad.addColorStop(0.7, '#cfd6de');
      grad.addColorStop(1, '#9aa3ad');
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#7b8590';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Philips cross slot
      ctx.strokeStyle = '#3a4048';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx - 14, sy);
      ctx.lineTo(sx + 14, sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, sy - 14);
      ctx.lineTo(sx, sy + 14);
      ctx.stroke();
    });

    // 4. Waist Brass Threaded Inserts (Top & Bottom center notches in horizontal layout)
    const tx = W / 2;
    [20, H - 20].forEach((ty) => {
      // Recessed semi-circle in sticker
      ctx.beginPath();
      ctx.arc(tx, ty, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#cc1c24';
      ctx.fill();

      // Brass threaded ring
      ctx.beginPath();
      ctx.arc(tx, ty, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#c8a442';
      ctx.fill();
      ctx.strokeStyle = '#997520';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Threaded center hole
      ctx.beginPath();
      ctx.arc(tx, ty, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#181818';
      ctx.fill();
    });

    // 5. Two Center Plunger Windows (Photos 4 & 8)
    // Perfectly centered around W / 2 (640)
    const winW = 100;
    const winH = 160;
    const winY = 175;
    const winX1 = 500;
    const winX2 = 680;

    [winX1, winX2].forEach((wx) => {
      // Dark red/black recess frame
      ctx.fillStyle = '#180406';
      roundRect(ctx, wx, winY, winW, winH, 6);
      ctx.fill();
      ctx.strokeStyle = '#8c1018';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Protruding cream/white moving core tab
      const tabGrad = ctx.createLinearGradient(wx, winY, wx + winW, winY + winH);
      tabGrad.addColorStop(0, '#faf8f2');
      tabGrad.addColorStop(0.5, '#eae5d8');
      tabGrad.addColorStop(1, '#d5cfbe');
      ctx.fillStyle = tabGrad;
      roundRect(ctx, wx + 8, winY + 8, winW - 16, winH - 16, 4);
      ctx.fill();

      // Molded bevel lines on core tab
      ctx.strokeStyle = '#bab4a2';
      ctx.lineWidth = 1.5;
      roundRect(ctx, wx + 14, winY + 14, winW - 28, winH - 28, 2);
      ctx.stroke();
    });

    // 6. LEFT SECTION: Model Title & Vkon Logo (Photo 4)
    // "CITATION LINE 40AMPS" (or 16AMPS) - clean bold condensed font without colliding with center
    const ampStr = is40A ? 'CITATION LINE 40AMPS' : 'CITATION LINE 16AMPS';
    ctx.fillStyle = '#11141a';
    ctx.font = '900 32px "Arial Black", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ampStr, 115, 110);

    // "Vkon" Logo (Faithfully matching Photo 4 with italic bold lettering and orbital ring)
    const vkonX = 115;
    const vkonY = 360;
    ctx.font = 'italic 900 78px "Plus Jakarta Sans", "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#11141a';
    ctx.textAlign = 'left';
    ctx.fillText('Vk', vkonX, vkonY);
    const vkLen = ctx.measureText('Vk').width;

    ctx.fillText('o', vkonX + vkLen, vkonY);
    const oLen = ctx.measureText('o').width;

    ctx.fillText('n', vkonX + vkLen + oLen, vkonY);

    // Acute accent dot above 'o' (Vkón - Photo 4)
    ctx.beginPath();
    ctx.arc(vkonX + vkLen + oLen * 0.52, vkonY - 68, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#11141a';
    ctx.fill();

    // Sweeping oval ring encircling Vkon (Photo 4)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(vkonX + vkLen + oLen * 0.75, vkonY - 28, 120, 38, -0.22, 0, Math.PI * 2);
    ctx.strokeStyle = '#11141a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 7. CENTER SECTION: GN TECHNOLOGIES & MADE IN INDIA
    ctx.fillStyle = '#11141a';
    ctx.font = '900 22px "Plus Jakarta Sans", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GN TECHNOLOGIES', W / 2, 110);

    ctx.font = '900 22px "Plus Jakarta Sans", "Arial Black", sans-serif';
    ctx.fillText('MADE IN INDIA', W / 2, 392);

    // 8. RIGHT SECTION: Schematic Wiring Diagram (Photo 4)
    ctx.strokeStyle = '#11141a';
    ctx.lineWidth = 2.8;
    const contactCols = [880, 925, 970, 1015];
    const termLabels = [
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
      ['7', '8'],
    ];

    contactCols.forEach((cx, ci) => {
      // Top vertical lead
      ctx.beginPath();
      ctx.moveTo(cx, 55);
      ctx.lineTo(cx, 75);
      ctx.stroke();

      // Slanted switch arm
      ctx.beginPath();
      ctx.moveTo(cx, 75);
      ctx.lineTo(cx + 9, 100);
      ctx.stroke();

      // Bottom terminal contact circle
      ctx.beginPath();
      ctx.arc(cx, 104, 3.2, 0, Math.PI * 2);
      ctx.stroke();

      // Bottom vertical lead
      ctx.beginPath();
      ctx.moveTo(cx, 107);
      ctx.lineTo(cx, 125);
      ctx.stroke();

      // Number labels
      ctx.fillStyle = '#11141a';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(termLabels[ci][0], cx - 11, 68);
      ctx.fillText(termLabels[ci][1], cx - 11, 122);
    });

    // Horizontal dashed ganging link to coil
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(1015 + 9, 92);
    ctx.lineTo(1060, 92);
    ctx.stroke();
    ctx.setLineDash([]);

    // Coil symbol (A1 - A2)
    ctx.strokeRect(1060, 72, 44, 40);
    ctx.beginPath();
    ctx.moveTo(1060, 72);
    ctx.lineTo(1104, 112);
    ctx.stroke();

    // Top lead A1
    ctx.beginPath();
    ctx.moveTo(1082, 72);
    ctx.lineTo(1082, 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1082, 59, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#11141a';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('A1', 1096, 64);

    // Bottom lead A2
    ctx.beginPath();
    ctx.moveTo(1082, 112);
    ctx.lineTo(1082, 122);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1082, 125, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText('A2', 1096, 128);

    // 9. Ratings Table (Photo 4)
    ctx.fillStyle = '#11141a';
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillText('Ith 25A', 885, 185);
    ctx.fillText('AC1, 20A', 885, 222);
    ctx.fillText('AC2, 20A', 885, 259);
    ctx.fillText('AC3, 16A', 885, 296);

    // Bottom voltage & frequency specs (Photo 4)
    ctx.fillText('Ui 660V', 700, 448);
    ctx.fillText('AC4, 11A 415V, 50Hz', 840, 448);

    return c;
  }

  // Top Nameplate Texture for Citation Line 16A Contactor (Photo 4)
  function createCitationLineTopTexture() {
    const c = renderCitationLineNameplateCanvas(false);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return tex;
  }

  // Vertical Nameplate Texture for Citation Line 40A Contactors Mounted in Panel (Photos 4 & 8)
  // Faithfully drawn matching user reference photograph (media_1792571781965.png & Photo 8)
  function createPanelContactorRedCapTexture() {
    const W = 512;
    const H = 1280;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    // 1. Deep glossy industrial red background (Photo 4 & 8)
    ctx.fillStyle = '#cc1c24';
    ctx.fillRect(0, 0, W, H);

    // Beveled molded plastic rim
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 6;
    roundRect(ctx, 6, 6, W - 12, H - 12, 16);
    ctx.stroke();

    // 2. Screws at Top and Bottom of Red Cap (Photo 8 / User Photo)
    const topScrewY = 56;
    const botScrewY = H - 56;
    [topScrewY, botScrewY].forEach((sy) => {
      const sx = W / 2;
      // Recessed red pocket
      ctx.beginPath();
      ctx.arc(sx, sy, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#9e1018';
      ctx.fill();

      // Outer silver washer
      ctx.beginPath();
      ctx.arc(sx, sy, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e7ec';
      ctx.fill();
      ctx.strokeStyle = '#8a94a0';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pan head screw
      const grad = ctx.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, 22);
      grad.addColorStop(0, '#f5f7fa');
      grad.addColorStop(0.7, '#cfd6de');
      grad.addColorStop(1, '#9aa3ad');
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#707b88';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Philips cross slot
      ctx.strokeStyle = '#2c323b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx - 15, sy);
      ctx.lineTo(sx + 15, sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx, sy - 15);
      ctx.lineTo(sx, sy + 15);
      ctx.stroke();
    });

    // 3. Waist Brass Threaded Inserts (Left and Right Waist)
    const midY = H / 2;
    [18, W - 18].forEach((tx) => {
      ctx.beginPath();
      ctx.arc(tx, midY, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#cc1c24';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, midY, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#c8a442';
      ctx.fill();
      ctx.strokeStyle = '#997520';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tx, midY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#181818';
      ctx.fill();
    });

    // 4. White Vinyl Nameplate Sticker (Photos 4 & 8)
    const stickerX = 36;
    const stickerY = 112;
    const stickerW = W - 72;
    const stickerH = H - 224;

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, stickerX, stickerY, stickerW, stickerH, 12);
    ctx.fill();

    // Red border pinstripe
    ctx.strokeStyle = '#cc1c24';
    ctx.lineWidth = 3;
    roundRect(ctx, stickerX + 4, stickerY + 4, stickerW - 8, stickerH - 8, 10);
    ctx.stroke();

    // 5. Two Center Plunger Windows (Photos 4 & 8)
    // Vertical layout: one above the other in center
    const winW = 100;
    const winH = 150;
    const winX = (W - winW) / 2;
    const winY1 = 410;
    const winY2 = 660;

    [winY1, winY2].forEach((wy) => {
      // Dark recess frame
      ctx.fillStyle = '#180406';
      roundRect(ctx, winX, wy, winW, winH, 8);
      ctx.fill();
      ctx.strokeStyle = '#8c1018';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Protruding cream/white moving core tab
      const tabGrad = ctx.createLinearGradient(winX, wy, winX + winW, wy + winH);
      tabGrad.addColorStop(0, '#faf8f2');
      tabGrad.addColorStop(0.5, '#eae5d8');
      tabGrad.addColorStop(1, '#d5cfbe');
      ctx.fillStyle = tabGrad;
      roundRect(ctx, winX + 8, wy + 8, winW - 16, winH - 16, 5);
      ctx.fill();

      // Molded bevel lines on core tab
      ctx.strokeStyle = '#bab4a2';
      ctx.lineWidth = 1.5;
      roundRect(ctx, winX + 14, wy + 14, winW - 28, winH - 28, 3);
      ctx.stroke();
    });

    // 6. UPPER SECTION: Schematic Wiring Diagram & Ratings Table
    // Left side: 4-pole contact diagram
    ctx.strokeStyle = '#11141a';
    ctx.lineWidth = 3.2;
    const contactCols = [72, 108, 144, 180];
    const termLabels = [
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
      ['7', '8'],
    ];

    contactCols.forEach((cx, ci) => {
      // Top vertical lead
      ctx.beginPath();
      ctx.moveTo(cx, 145);
      ctx.lineTo(cx, 175);
      ctx.stroke();

      // Slanted switch arm
      ctx.beginPath();
      ctx.moveTo(cx, 175);
      ctx.lineTo(cx + 8, 205);
      ctx.stroke();

      // Bottom terminal contact circle
      ctx.beginPath();
      ctx.arc(cx, 210, 3.5, 0, Math.PI * 2);
      ctx.stroke();

      // Bottom vertical lead
      ctx.beginPath();
      ctx.moveTo(cx, 213);
      ctx.lineTo(cx, 235);
      ctx.stroke();

      // Number labels
      ctx.fillStyle = '#11141a';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(termLabels[ci][0], cx - 11, 160);
      ctx.fillText(termLabels[ci][1], cx - 11, 230);
    });

    // Horizontal dashed link to coil
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(180 + 8, 195);
    ctx.lineTo(215, 195);
    ctx.stroke();
    ctx.setLineDash([]);

    // Coil symbol (A1 - A2)
    ctx.strokeRect(215, 175, 36, 40);
    ctx.beginPath();
    ctx.moveTo(215, 175);
    ctx.lineTo(251, 215);
    ctx.stroke();

    // Top lead A1
    ctx.beginPath();
    ctx.moveTo(233, 175);
    ctx.lineTo(233, 160);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(233, 157, 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#11141a';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('A1', 244, 162);

    // Bottom lead A2
    ctx.beginPath();
    ctx.moveTo(233, 215);
    ctx.lineTo(233, 230);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(233, 233, 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText('A2', 244, 236);

    // Right side: Ratings Table (Photo 4 & 8)
    ctx.fillStyle = '#11141a';
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillText('Ith 25A', 256, 162);
    ctx.fillText('AC1, 20A', 256, 200);
    ctx.fillText('AC2, 20A', 256, 238);
    ctx.fillText('AC3, 16A', 256, 276);
    ctx.fillText('Ui 660V', 256, 318);
    ctx.font = 'bold 21px "JetBrains Mono", monospace';
    ctx.fillText('AC4, 11A 415V, 50Hz', 256, 356);

    // 7. MIDDLE SECTION: GN TECHNOLOGIES & MADE IN INDIA (Vertical text beside windows)
    ctx.save();
    ctx.translate(148, 485);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '900 20px "Plus Jakarta Sans", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#11141a';
    ctx.fillText('GN TECHNOLOGIES', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(148, 735);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '900 20px "Plus Jakarta Sans", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#11141a';
    ctx.fillText('MADE IN INDIA', 0, 0);
    ctx.restore();

    // 8. LOWER SECTION: CITATION LINE 40AMPS & VKON LOGO
    // Vertical text reading upwards along left side
    ctx.save();
    ctx.translate(108, 1140);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '900 32px "Arial Black", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#11141a';
    ctx.fillText('CITATION LINE 40AMPS', 0, 0);
    ctx.restore();

    // Vkon Logo in lower-right
    const vkonX = 220;
    const vkonY = 1080;
    ctx.font = 'italic 900 68px "Plus Jakarta Sans", "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#11141a';
    ctx.textAlign = 'left';
    ctx.fillText('Vk', vkonX, vkonY);
    const vkLen = ctx.measureText('Vk').width;
    ctx.fillText('o', vkonX + vkLen, vkonY);
    const oLen = ctx.measureText('o').width;
    ctx.fillText('n', vkonX + vkLen + oLen, vkonY);

    // Accent dot above 'o'
    ctx.beginPath();
    ctx.arc(vkonX + vkLen + oLen * 0.52, vkonY - 60, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#11141a';
    ctx.fill();

    // Sweeping oval ring encircling Vkon
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(vkonX + vkLen + oLen * 0.75, vkonY - 24, 105, 34, -0.22, 0, Math.PI * 2);
    ctx.strokeStyle = '#11141a';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return tex;
  }


  // Coil Voltage label texture ("280/440 VOLTS" — Photo 2)
  function createCoilVoltageTexture() {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 96;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 384, 96);

    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 376, 88);

    ctx.fillStyle = '#0a0d14';
    ctx.font = 'bold 44px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('280/440 VOLTS', 192, 64);

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

  // Terminal block specialized materials (matching user reference photo)
  const yellowZincMat = new THREE.MeshStandardMaterial({
    color: 0xbfa045, // Yellow-zinc dichromate passivated finish (Photo)
    roughness: 0.32,
    metalness: 0.82,
  });

  const bareCopperMat = new THREE.MeshStandardMaterial({
    color: 0xc8733b, // Bare shiny copper conductor (Photo)
    roughness: 0.25,
    metalness: 0.88,
  });

  const twistedBrownMat = new THREE.MeshStandardMaterial({
    color: 0x8a4b22, // Twisted pair brown insulation (Photo)
    roughness: 0.65,
    metalness: 0.05,
  });

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
  //  CITATION LINE 16A CONTACTOR 3D MODEL BUILDER (Photos 1-5)
  // ================================================================
  const contactorSteelBaseMat = new THREE.MeshStandardMaterial({
    color: 0x8a8780, // Industrial painted steel base plate (Photo 1)
    roughness: 0.58,
    metalness: 0.32,
  });

  const contactorBakeliteMat = new THREE.MeshStandardMaterial({
    color: 0x141416, // Molded glossy black bakelite body (Photos 2, 3, 5)
    roughness: 0.38,
    metalness: 0.08,
  });

  const contactorCapRedMat = new THREE.MeshStandardMaterial({
    color: 0xbf1b24, // Molded vivid red top cap (Photos 2, 3, 4)
    roughness: 0.35,
    metalness: 0.05,
  });

  const contactorCoilLilacMat = new THREE.MeshStandardMaterial({
    color: 0xcdbedc, // Lavender / lilac encapsulated coil block (Photo 2)
    roughness: 0.45,
    metalness: 0.02,
  });

  const contactorPlungerWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf4f3ee, // White nylon push plunger (Photo 4)
    roughness: 0.28,
    metalness: 0.02,
  });

  const contactorBrassMat = new THREE.MeshStandardMaterial({
    color: 0xc89e3a, // Terminal brass inserts & screws (Photo 2)
    roughness: 0.28,
    metalness: 0.85,
  });

  let standaloneContactorGroup = null;
  let standalonePlungers = [];
  let contactorSparkLight = null;

  function buildCitationLineContactor(options = {}) {
    const isStandalone = !!options.isStandalone;
    const s = options.scale || 1.0;
    const group = new THREE.Group();
    group.name = 'CitationLineContactor';

    const Hc = 0.084 * s;

    // ——— 1. FORMED STEEL BASE CHASSIS PLATE (Photo 1 & Photo 3) ———
    const baseGroup = new THREE.Group();
    const plateW = 0.086 * s;
    const plateD = 0.096 * s;
    const plateT = 0.0022 * s;

    // Main flat bottom plate
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(plateW, plateT, plateD),
      contactorSteelBaseMat
    );
    basePlate.position.y = -Hc / 2 + plateT / 2;
    basePlate.receiveShadow = true;
    basePlate.castShadow = true;
    baseGroup.add(basePlate);

    // Left folded flange (Photo 1 & Photo 3)
    const flangeH = 0.016 * s;
    const flangeL = new THREE.Mesh(
      new THREE.BoxGeometry(plateT, flangeH, plateD),
      contactorSteelBaseMat
    );
    flangeL.position.set(-plateW / 2 + plateT / 2, -Hc / 2 + flangeH / 2, 0);
    baseGroup.add(flangeL);

    // Right folded flange with cutout notch (Photo 1)
    const flangeR = new THREE.Mesh(
      new THREE.BoxGeometry(plateT, flangeH, plateD * 0.78),
      contactorSteelBaseMat
    );
    flangeR.position.set(plateW / 2 - plateT / 2, -Hc / 2 + flangeH / 2, -plateD * 0.08);
    baseGroup.add(flangeR);

    // Underside details (Photo 1): Keyhole slot at front, circular hole at rear
    const keyholeDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.0055 * s, 16),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
    );
    keyholeDisc.rotation.x = Math.PI / 2;
    keyholeDisc.position.set(0.016 * s, -Hc / 2 - 0.0002, 0.032 * s);
    baseGroup.add(keyholeDisc);

    const keyholeSlot = new THREE.Mesh(
      new THREE.PlaneGeometry(0.004 * s, 0.010 * s),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
    );
    keyholeSlot.rotation.x = Math.PI / 2;
    keyholeSlot.position.set(0.016 * s, -Hc / 2 - 0.0002, 0.026 * s);
    baseGroup.add(keyholeSlot);

    // Rear circular hole
    const rearHole = new THREE.Mesh(
      new THREE.CircleGeometry(0.0045 * s, 16),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
    );
    rearHole.rotation.x = Math.PI / 2;
    rearHole.position.set(-0.018 * s, -Hc / 2 - 0.0002, -0.034 * s);
    baseGroup.add(rearHole);

    // 4 Philips assembly screws holding chassis to body (Photo 1)
    const screwPos = [
      [-0.024 * s, -Hc / 2 - 0.0008, -0.034 * s],
      [0.028 * s, -Hc / 2 - 0.0008, -0.028 * s],
      [-0.028 * s, -Hc / 2 - 0.0008, 0.026 * s],
      [0.006 * s, -Hc / 2 - 0.0008, 0.036 * s],
    ];
    screwPos.forEach(([sx, sy, sz]) => {
      const wsh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0055 * s, 0.0055 * s, 0.0008 * s, 16),
        chromeMat
      );
      wsh.position.set(sx, sy, sz);
      baseGroup.add(wsh);

      const scr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004 * s, 0.004 * s, 0.0016 * s, 12),
        chromeMat
      );
      scr.position.set(sx, sy - 0.0008 * s, sz);
      baseGroup.add(scr);

      const crs = new THREE.Mesh(
        new THREE.PlaneGeometry(0.005 * s, 0.0012 * s),
        new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
      );
      crs.rotation.x = Math.PI / 2;
      crs.position.set(sx, sy - 0.0017 * s, sz);
      baseGroup.add(crs);
    });

    group.add(baseGroup);

    // ——— 2. MOLDED BLACK BAKELITE BODY & HOUSING (Photos 2, 3, 5) ———
    const bodyGroup = new THREE.Group();

    // Lower rear main block
    const lowerBodyRear = new THREE.Mesh(
      new THREE.BoxGeometry(0.076 * s, 0.046 * s, 0.046 * s),
      contactorBakeliteMat
    );
    lowerBodyRear.position.set(0, -Hc / 2 + plateT + 0.023 * s, -0.018 * s);
    lowerBodyRear.castShadow = true;
    lowerBodyRear.receiveShadow = true;
    bodyGroup.add(lowerBodyRear);

    // Front left & right bakelite pillars flanking the coil block (Photo 2)
    [-0.0305 * s, 0.0305 * s].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.015 * s, 0.046 * s, 0.036 * s),
        contactorBakeliteMat
      );
      pillar.position.set(px, -Hc / 2 + plateT + 0.023 * s, 0.023 * s);
      pillar.castShadow = true;
      bodyGroup.add(pillar);
    });

    // Upper terminal chamber block (stepped inward slightly per Photo 3)
    const upperBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.072 * s, 0.030 * s, 0.076 * s),
      contactorBakeliteMat
    );
    upperBody.position.y = -Hc / 2 + plateT + 0.046 * s + 0.015 * s;
    upperBody.castShadow = true;
    bodyGroup.add(upperBody);

    // Side mounting ears (Photo 3)
    [-1, 1].forEach((dir) => {
      const ear = new THREE.Mesh(
        new THREE.BoxGeometry(0.006 * s, 0.016 * s, 0.024 * s),
        contactorBakeliteMat
      );
      ear.position.set(dir * (0.076 * s / 2 + 0.003 * s), -Hc / 2 + 0.018 * s, 0);
      bodyGroup.add(ear);
    });

    group.add(bodyGroup);

    // ——— 3. FRONT & REAR TERMINAL BAYS WITH BARRIER FINS (Photo 2 & 5) ———
    const termX = [-0.027 * s, -0.009 * s, 0.009 * s, 0.027 * s];
    const finX = [-0.018 * s, 0, 0.018 * s];

    [-1, 1].forEach((faceSide) => {
      const zOffset = faceSide * (0.076 * s / 2 + 0.005 * s);

      // Terminal deck shelf
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(0.074 * s, 0.014 * s, 0.014 * s),
        contactorBakeliteMat
      );
      deck.position.set(0, 0.006 * s, zOffset);
      group.add(deck);

      // 3 vertical separator fins protruding outward (Photo 2)
      finX.forEach((fx) => {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.0024 * s, 0.032 * s, 0.016 * s),
          contactorBakeliteMat
        );
        fin.position.set(fx, 0.012 * s, zOffset + faceSide * 0.002 * s);
        fin.castShadow = true;
        group.add(fin);
      });

      // 4 recessed brass threaded sockets for wire screws
      termX.forEach((tx) => {
        const nut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0035 * s, 0.0035 * s, 0.006 * s, 16),
          contactorBrassMat
        );
        nut.position.set(tx, 0.013 * s, zOffset);
        group.add(nut);

        const threadHole = new THREE.Mesh(
          new THREE.CircleGeometry(0.0018 * s, 12),
          new THREE.MeshBasicMaterial({ color: 0x161616, side: THREE.DoubleSide })
        );
        threadHole.rotation.x = Math.PI / 2;
        threadHole.position.set(tx, 0.0161 * s, zOffset);
        group.add(threadHole);
      });
    });

    // ——— 4. LOWER COIL CAVITY & "280/440 VOLTS" LILAC COIL BLOCK (Photo 2) ———
    const coilGroup = new THREE.Group();
    const coilW = 0.046 * s;
    const coilH = 0.024 * s;
    const coilD = 0.036 * s;
    const coilY = -Hc / 2 + plateT + 0.017 * s;
    const coilZ = 0.023 * s;

    // Lavender/Lilac encapsulated coil block (Photo 2)
    const coilMesh = new THREE.Mesh(
      new THREE.BoxGeometry(coilW, coilH, coilD),
      contactorCoilLilacMat
    );
    coilMesh.position.set(0, coilY, coilZ);
    coilMesh.castShadow = true;
    coilGroup.add(coilMesh);

    // Front label: "280/440 VOLTS" sticker (Photo 2)
    const coilLabelMat = new THREE.MeshStandardMaterial({
      map: createCoilVoltageTexture(),
      roughness: 0.5,
    });
    const coilLabelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(coilW * 0.88, coilH * 0.44),
      coilLabelMat
    );
    coilLabelMesh.position.set(0, coilY + 0.003 * s, coilZ + coilD / 2 + 0.0008 * s);
    coilGroup.add(coilLabelMesh);

    // 2 Coil terminal screws with square brass clamping washers (Photo 2)
    [-0.012 * s, 0.012 * s].forEach((cx, ci) => {
      const clampPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.007 * s, 0.007 * s, 0.0018 * s),
        contactorBrassMat
      );
      clampPlate.position.set(cx, coilY - 0.004 * s, coilZ + coilD / 2 + 0.0018 * s);
      coilGroup.add(clampPlate);

      const screwHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0028 * s, 0.0028 * s, 0.002 * s, 10),
        contactorBrassMat
      );
      screwHead.rotation.x = Math.PI / 2;
      screwHead.position.set(cx, coilY - 0.004 * s, coilZ + coilD / 2 + 0.0028 * s);
      coilGroup.add(screwHead);

      // Blue inspection paint mark on the left terminal (Photo 2)
      if (ci === 0) {
        const dot = new THREE.Mesh(
          new THREE.CircleGeometry(0.001 * s, 8),
          new THREE.MeshBasicMaterial({ color: 0x0984e3, side: THREE.DoubleSide })
        );
        dot.position.set(cx - 0.0015 * s, coilY - 0.0055 * s, coilZ + coilD / 2 + 0.0030 * s);
        coilGroup.add(dot);
      }
    });

    group.add(coilGroup);

    // ——— 5. MOLDED RED TOP CAP & NAMEPLATE (Photo 4) ———
    const topCapGroup = new THREE.Group();
    const capW = 0.076 * s;
    const capH = 0.018 * s;
    const capD = 0.038 * s;
    const capY = Hc / 2 - capH / 2;

    const redCapMesh = new THREE.Mesh(
      new THREE.BoxGeometry(capW, capH, capD),
      contactorCapRedMat
    );
    redCapMesh.position.set(0, capY, 0);
    redCapMesh.castShadow = true;
    topCapGroup.add(redCapMesh);

    // Front edge cooling notches (Photo 2)
    for (let rx = -capW / 2 + 0.008 * s; rx <= capW / 2 - 0.008 * s; rx += 0.010 * s) {
      const ribNotch = new THREE.Mesh(
        new THREE.BoxGeometry(0.003 * s, 0.008 * s, 0.002 * s),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      ribNotch.position.set(rx, capY - 0.004 * s, capD / 2 + 0.0005 * s);
      topCapGroup.add(ribNotch);
    }

    // Top face Nameplate with exact schematic and ratings from Photo 4
    const nameplateMat = new THREE.MeshStandardMaterial({
      map: createCitationLineTopTexture(),
      roughness: 0.45,
    });
    const nameplateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(capW - 0.002 * s, capD - 0.002 * s),
      nameplateMat
    );
    nameplateMesh.rotation.x = -Math.PI / 2;
    nameplateMesh.position.set(0, capY + capH / 2 + 0.0004 * s, 0);
    topCapGroup.add(nameplateMesh);

    // Two silver pan screws with washers at left & right ends of red cap (Photo 4)
    [-0.033 * s, 0.033 * s].forEach((sx) => {
      const wsh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0038 * s, 0.0038 * s, 0.0008 * s, 14),
        chromeMat
      );
      wsh.position.set(sx, capY + capH / 2 + 0.0008 * s, 0);
      topCapGroup.add(wsh);

      const scr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0026 * s, 0.0026 * s, 0.0016 * s, 10),
        chromeMat
      );
      scr.position.set(sx, capY + capH / 2 + 0.0016 * s, 0);
      topCapGroup.add(scr);
    });

    group.add(topCapGroup);

    // ——— 6. TWO INTERACTIVE WHITE PUSH PLUNGERS (Photo 4) ———
    // Aligned with the two center window cutouts on the nameplate
    const plunger1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.0056 * s, 0.008 * s, 0.008 * s),
      contactorPlungerWhiteMat
    );
    plunger1.position.set(-0.0053 * s, capY + capH / 2 + 0.002 * s, 0);
    plunger1.castShadow = true;
    group.add(plunger1);

    const plunger2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.0056 * s, 0.008 * s, 0.008 * s),
      contactorPlungerWhiteMat
    );
    plunger2.position.set(0.0053 * s, capY + capH / 2 + 0.002 * s, 0);
    plunger2.castShadow = true;
    group.add(plunger2);

    group.userData.plungers = [plunger1, plunger2];
    group.userData.restY = capY + capH / 2 + 0.002 * s;

    if (isStandalone) {
      standaloneContactorGroup = group;
      standalonePlungers = [plunger1, plunger2];
    }

    return group;
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

    // ——— B. 3 CITATION LINE 40A CONTACTORS (Photo 8 / User Reference) ———
    // All 3 contactors mounted horizontally, upright and facing forward (+Z)
    // Contactor 1 (Left): x = -0.082, No Aux Block (Full Red Cap visible)
    // Contactor 2 (Middle): x = 0.022, Has Transparent Aux Block in center
    // Contactor 3 (Right): x = 0.126, Has Transparent Aux Block in center
    const cPositions = [
      { x: -0.082, hasAux: false },
      { x: 0.022, hasAux: true },
      { x: 0.126, hasAux: true },
    ];
    const cY = 0.052;

    cPositions.forEach((pos) => {
      const c = buildPanelContactor({ hasAux: pos.hasAux });
      c.position.set(pos.x, cY, baseFloorZ);
      intGroup.add(c);
    });

    // Horizontal heavy inter-contactor bus jumper conductors (Photos 4 & 8 / User Reference)
    // 4 straight horizontal black bus wires between Contactor 1 (right terminals) and Contactor 2 (left terminals)
    // 4 straight horizontal black bus wires between Contactor 2 (right terminals) and Contactor 3 (left terminals)
    const termYOffsets = [0.027, 0.009, -0.009, -0.027];
    const wireZ = baseFloorZ + 0.038 + 0.004;

    termYOffsets.forEach((ty, idx) => {
      const wy = cY + ty;

      // Contactor 1 right terminal (x = -0.082 + 0.026 = -0.056) to Contactor 2 left terminal (x = 0.022 - 0.026 = -0.004)
      const x1 = -0.082 + 0.026;
      const x2 = 0.022 - 0.026;
      const jMesh1 = makeWireSegment(x1, wy, wireZ, x2, wy, wireZ, 0.0024, wireBlackMat);
      intGroup.add(jMesh1);

      // White specification print on wire 3 ("4.0 SQ.MM" — Photo)
      if (idx === 2) {
        const specPrint = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0026, 0.0026, 0.016, 8),
          new THREE.MeshBasicMaterial({ color: 0xdedede })
        );
        specPrint.rotation.z = Math.PI / 2;
        specPrint.position.set((x1 + x2) / 2, wy, wireZ);
        intGroup.add(specPrint);
      }

      // Contactor 2 right terminal (x = 0.022 + 0.026 = 0.048) to Contactor 3 left terminal (x = 0.126 - 0.026 = 0.100)
      const x3 = 0.022 + 0.026;
      const x4 = 0.126 - 0.026;
      const jMesh2 = makeWireSegment(x3, wy, wireZ, x4, wy, wireZ, 0.0024, wireBlackMat);
      intGroup.add(jMesh2);
    });

    // Feed wires on Left of Contactor 1 (entering left terminals and routing down into duct — Photo)
    const c1LeftX = -0.082 - 0.026;
    [
      { ty: 0.027, loopX: -0.124, ductX: -0.120 },
      { ty: 0.009, loopX: -0.118, ductX: -0.114 },
      { ty: -0.009, loopX: -0.112, ductX: -0.108 },
      { ty: -0.027, loopX: -0.106, ductX: -0.102 },
    ].forEach((cfg) => {
      const wy = cY + cfg.ty;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(c1LeftX, wy, wireZ),
        new THREE.Vector3(cfg.loopX, wy - 0.006, wireZ + 0.002),
        new THREE.Vector3(cfg.ductX, -0.028, baseFloorZ + 0.020),
      ]);
      intGroup.add(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 16, 0.0022, 6, false),
        wireBlackMat
      ));
    });

    // Outgoing wires on Right of Contactor 3 (leaving right terminals and routing down into duct — Photo)
    const c3RightX = 0.126 + 0.026;
    [
      { ty: 0.027, loopX: 0.166, ductX: 0.162 },
      { ty: 0.009, loopX: 0.160, ductX: 0.156 },
      { ty: -0.009, loopX: 0.154, ductX: 0.150 },
      { ty: -0.027, loopX: 0.148, ductX: 0.144 },
    ].forEach((cfg) => {
      const wy = cY + cfg.ty;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(c3RightX, wy, wireZ),
        new THREE.Vector3(cfg.loopX, wy - 0.006, wireZ + 0.002),
        new THREE.Vector3(cfg.ductX, -0.028, baseFloorZ + 0.020),
      ]);
      intGroup.add(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 16, 0.0022, 6, false),
        wireBlackMat
      ));
    });

    // Top loop interconnect wire linking aux blocks and coil terminals (Photo)
    const auxFrontZ = baseFloorZ + 0.038 + 0.016 + 0.016;
    const topLoopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.082, cY + 0.042, wireZ),
      new THREE.Vector3(-0.030, cY + 0.045, wireZ + 0.004),
      new THREE.Vector3(0.013, cY + 0.012, auxFrontZ),
      new THREE.Vector3(0.022, cY + 0.042, wireZ + 0.006),
      new THREE.Vector3(0.074, cY + 0.045, wireZ + 0.006),
      new THREE.Vector3(0.117, cY + 0.012, auxFrontZ),
      new THREE.Vector3(0.126, cY + 0.042, wireZ),
    ]);
    intGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(topLoopCurve, 32, 0.0016, 6, false),
      wireBlackMat
    ));

    // Twisted transformer control wires (red / brown) dropping into trunking (Photo)
    const tfWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.130, 0.035, baseFloorZ + 0.025),
      new THREE.Vector3(-0.126, 0.005, baseFloorZ + 0.020),
      new THREE.Vector3(-0.124, -0.028, baseFloorZ + 0.020),
    ]);
    const tfWireMat = new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.65 });
    intGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tfWireCurve, 12, 0.0014, 6, false), tfWireMat));

    // White/cream control wire between Contactor 2 and 3 (Photo)
    const whiteWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.074, cY + 0.015, wireZ - 0.008),
      new THREE.Vector3(0.072, cY - 0.010, wireZ - 0.010),
      new THREE.Vector3(0.070, -0.028, baseFloorZ + 0.020),
    ]);
    const whiteWireMat = new THREE.MeshStandardMaterial({ color: 0xf0ece1, roughness: 0.6 });
    intGroup.add(new THREE.Mesh(new THREE.TubeGeometry(whiteWireCurve, 12, 0.0014, 6, false), whiteWireMat));

    // ——— C. HORIZONTAL GREY SLOTTED WIRE DUCT / RACEWAY ———
    // Runs horizontally below contactors (Photo 8 / User Photo)
    const ductY = -0.028;
    const ductW = 0.380;
    const ductH = 0.034;
    const ductD = 0.038;

    const ductBody = new THREE.Mesh(
      new THREE.BoxGeometry(ductW, ductH, ductD),
      trunkingGreyMat
    );
    ductBody.position.set(0, ductY, baseFloorZ + ductD / 2);
    ductBody.castShadow = true;
    ductBody.receiveShadow = true;
    intGroup.add(ductBody);

    // Slotted finger vents along duct cover (Photo)
    for (let dx = -ductW / 2 + 0.016; dx <= ductW / 2 - 0.016; dx += 0.015) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, ductH - 0.008, 0.001),
        new THREE.MeshBasicMaterial({ color: 0x22262e })
      );
      slot.position.set(dx, ductY, baseFloorZ + ductD + 0.001);
      intGroup.add(slot);
    }

    // ——— D. 3 HEAVY-DUTY TERMINAL BLOCKS (Bottom Row — Exactly Matching User Photo) ———
    // Exactly aligned below the 3 Contactors!
    // Labels: [R Y B MOTOR], [B Y R MAINS], [R Y B MOTOR]
    const tbConfigs = [
      { x: -0.082, isMains: false, labelText: 'MOTOR' },
      { x: 0.022, isMains: true, labelText: 'MAINS' },
      { x: 0.126, isMains: false, labelText: 'MOTOR' },
    ];

    const tbY = -0.092;
    const tbW = 0.072;
    const tbH = 0.046;
    const tbD = 0.024;
    const wireZ_tb = baseFloorZ + tbD / 2 + 0.002;

    tbConfigs.forEach((tb, tbIdx) => {
      const tbGroup = new THREE.Group();
      tbGroup.position.set(tb.x, tbY, baseFloorZ + tbD / 2);

      // Molded Black Bakelite block base (User Photo)
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(tbW, tbH, tbD),
        contactorBakeliteMat
      );
      block.castShadow = true;
      tbGroup.add(block);

      // Side mounting flanges with recessed silver screws (User Photo)
      [-tbW / 2 - 0.0045, tbW / 2 + 0.0045].forEach((fx) => {
        const flange = new THREE.Mesh(
          new THREE.BoxGeometry(0.009, 0.018, 0.006),
          contactorBakeliteMat
        );
        flange.position.set(fx, 0, -tbD / 2 + 0.003);
        tbGroup.add(flange);

        // Silver pan head mounting screw with washer
        const scr = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0024, 0.0024, 0.0022, 12),
          chromeMat
        );
        scr.rotation.x = Math.PI / 2;
        scr.position.set(fx, 0, -tbD / 2 + 0.007);
        tbGroup.add(scr);

        const slot = new THREE.Mesh(
          new THREE.PlaneGeometry(0.0032, 0.0008),
          new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        slot.position.set(fx, 0, -tbD / 2 + 0.0082);
        tbGroup.add(slot);
      });

      // 4 Vertical Barrier Fins separating the 3 terminal poles (User Photo)
      const finXPositions = [-0.024, -0.008, 0.008, 0.024];
      finXPositions.forEach((bx) => {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.0024, tbH, 0.014),
          contactorBakeliteMat
        );
        fin.position.set(bx, 0, tbD / 2 + 0.005);
        fin.castShadow = true;
        tbGroup.add(fin);
      });

      // Central Molded Cylindrical Crossbar / Tie-Bar across barrier fins (User Photo)
      const crossbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, 0.052, 16),
        contactorBakeliteMat
      );
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, 0, tbD / 2 + 0.0055);
      crossbar.castShadow = true;
      tbGroup.add(crossbar);

      // 6 Heavy-Duty Clamping Terminals with Square Yellow-Zinc Clamping Washers (User Photo)
      // 3 Upper terminals, 3 Lower terminals
      const poleXPositions = [-0.016, 0, 0.016];
      poleXPositions.forEach((tx, pIdx) => {
        [-0.012, 0.012].forEach((ty) => {
          // Square Yellow-Zinc passivated saddle clamping washer plate (Photo)
          const washer = new THREE.Mesh(
            new THREE.BoxGeometry(0.0095, 0.0095, 0.0018),
            yellowZincMat
          );
          washer.position.set(tx, ty, tbD / 2 + 0.0012);
          washer.castShadow = true;
          tbGroup.add(washer);

          // Yellow-Zinc pan-head terminal screw with combination drive (Photo)
          const screw = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0034, 0.0034, 0.0032, 14),
            yellowZincMat
          );
          screw.rotation.x = Math.PI / 2;
          screw.position.set(tx, ty, tbD / 2 + 0.0036);
          screw.castShadow = true;
          tbGroup.add(screw);

          // Combination cross-slot + flathead drive
          const crsSlot = new THREE.Mesh(
            new THREE.PlaneGeometry(0.0048, 0.0012),
            new THREE.MeshBasicMaterial({ color: 0x221a08 })
          );
          crsSlot.position.set(tx, ty, tbD / 2 + 0.0053);
          tbGroup.add(crsSlot);

          const flatSlot = new THREE.Mesh(
            new THREE.PlaneGeometry(0.0012, 0.0048),
            new THREE.MeshBasicMaterial({ color: 0x221a08 })
          );
          flatSlot.position.set(tx, ty, tbD / 2 + 0.0053);
          tbGroup.add(flatSlot);

          // Incoming wires dropping from duct above into upper terminals (ty > 0)
          if (ty > 0) {
            // Special detail from User Photo on right terminal (pIdx === 2):
            // Bare shiny copper conductor exposed right above washer before black insulation
            if (pIdx === 2) {
              const copperSegment = makeWireSegment(
                tb.x + tx, tbY + ty + 0.001, wireZ_tb,
                tb.x + tx, tbY + ty + 0.005, wireZ_tb,
                0.0015, bareCopperMat
              );
              intGroup.add(copperSegment);

              const wireBlack = makeWireSegment(
                tb.x + tx, tbY + ty + 0.005, wireZ_tb,
                tb.x + tx, ductY - ductH / 2, wireZ_tb,
                0.0022, wireBlackMat
              );
              intGroup.add(wireBlack);
            } else {
              const wire = makeWireSegment(
                tb.x + tx, tbY + ty, wireZ_tb,
                tb.x + tx, ductY - ductH / 2, wireZ_tb,
                0.0022, wireBlackMat
              );
              intGroup.add(wire);
            }
          }
        });
      });

      // Twisted brown wire pair running along backplate to the right (User Photo)
      // Faithfully modeled from the user reference photo!
      if (tbIdx === 1 || tbIdx === 2) {
        const brownPts1 = [
          new THREE.Vector3(tb.x + 0.024, tbY + 0.016, baseFloorZ + tbD / 2 - 0.002),
          new THREE.Vector3(tb.x + 0.038, tbY + 0.015, baseFloorZ + 0.016),
          new THREE.Vector3(tb.x + 0.054, tbY + 0.012, baseFloorZ + 0.014),
          new THREE.Vector3(tb.x + 0.072, tbY + 0.008, baseFloorZ + 0.012),
        ];
        const brownCurve1 = new THREE.CatmullRomCurve3(brownPts1);
        intGroup.add(new THREE.Mesh(
          new THREE.TubeGeometry(brownCurve1, 16, 0.0010, 6, false),
          twistedBrownMat
        ));

        const brownPts2 = [
          new THREE.Vector3(tb.x + 0.024, tbY + 0.014, baseFloorZ + tbD / 2 - 0.001),
          new THREE.Vector3(tb.x + 0.038, tbY + 0.017, baseFloorZ + 0.017),
          new THREE.Vector3(tb.x + 0.054, tbY + 0.010, baseFloorZ + 0.013),
          new THREE.Vector3(tb.x + 0.072, tbY + 0.009, baseFloorZ + 0.011),
        ];
        const brownCurve2 = new THREE.CatmullRomCurve3(brownPts2);
        intGroup.add(new THREE.Mesh(
          new THREE.TubeGeometry(brownCurve2, 16, 0.0010, 6, false),
          twistedBrownMat
        ));
      }

      // RYB color label strip below the block
      const labelMat = new THREE.MeshBasicMaterial({
        map: createTerminalLabelTexture(tb.isMains),
      });
      const labelStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(tbW - 0.004, 0.016),
        labelMat
      );
      labelStrip.position.set(0, -tbH / 2 - 0.011, tbD / 2);
      tbGroup.add(labelStrip);

      intGroup.add(tbGroup);
    });

    return intGroup;
  }

  // ================================================================
  //  PANEL-MOUNTED CITATION LINE 40A CONTACTOR (Photo 8 / User Photo)
  //  Backplate-mounted, facing forward (+Z), vertical red cap, left/right terminals
  // ================================================================
  function buildPanelContactor(options = {}) {
    const hasAux = !!options.hasAux;
    const group = new THREE.Group();
    group.name = 'PanelCitationContactor';

    const cW = 0.076; // Total width across terminal bays
    const cH = 0.088; // Total height
    const bodyD = 0.038; // Bakelite body depth from backplate
    const capW = 0.032; // Center red cap width (vertical rectangle)
    const capH = 0.080; // Center red cap height
    const capD = 0.016; // Red cap protrusion forward
    const frontZ = bodyD + capD; // Front face Z

    // 1. Steel Mounting Base Plate (screwed flat against backplate)
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.082, 0.096, 0.0025),
      contactorSteelBaseMat
    );
    basePlate.position.set(0, 0, 0.00125);
    basePlate.receiveShadow = true;
    group.add(basePlate);

    // Stamped mounting ears top & bottom with screws (Photo)
    [-0.045, 0.045].forEach((my) => {
      const ear = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.006, 0.003),
        contactorSteelBaseMat
      );
      ear.position.set(0, my, 0.0015);
      group.add(ear);

      const scr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0026, 0.0026, 0.003, 10),
        chromeMat
      );
      scr.rotation.x = Math.PI / 2;
      scr.position.set(0, my, 0.0035);
      group.add(scr);
    });

    // 2. Molded Black Bakelite Main Body
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(cW, cH, bodyD),
      contactorBakeliteMat
    );
    bodyMesh.position.set(0, 0, bodyD / 2);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 3. Left & Right Terminal Bays (Terminals on LEFT and RIGHT sides!)
    // 4 Terminal levels: Level 0 (top) to Level 3 (bottom)
    const termY = [0.027, 0.009, -0.009, -0.027];
    const finY = [0.036, 0.018, 0, -0.018, -0.036];
    const bayXOffsets = [-0.026, 0.026];

    bayXOffsets.forEach((bx) => {
      // 5 Separator Barrier Fins (horizontal fins)
      finY.forEach((fy) => {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.0025, 0.022),
          contactorBakeliteMat
        );
        fin.position.set(bx, fy, bodyD - 0.002);
        fin.castShadow = true;
        group.add(fin);
      });

      // 4 Brass Screw Terminals with square washers
      termY.forEach((ty) => {
        // Square brass clamping washer plate
        const washer = new THREE.Mesh(
          new THREE.BoxGeometry(0.008, 0.008, 0.0018),
          contactorBrassMat
        );
        washer.position.set(bx, ty, bodyD + 0.002);
        group.add(washer);

        // Brass pan-head screw
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0030, 0.0030, 0.0028, 12),
          contactorBrassMat
        );
        screw.rotation.x = Math.PI / 2;
        screw.position.set(bx, ty, bodyD + 0.0042);
        group.add(screw);

        // Dark Philips cross slot on screw head
        const slot = new THREE.Mesh(
          new THREE.PlaneGeometry(0.0042, 0.0012),
          new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
        );
        slot.position.set(bx, ty, bodyD + 0.0057);
        group.add(slot);
      });
    });

    // 4. Molded Red Center Cap (Vertical rectangle)
    const redCapMesh = new THREE.Mesh(
      new THREE.BoxGeometry(capW, capH, capD),
      contactorCapRedMat
    );
    redCapMesh.position.set(0, 0, bodyD + capD / 2);
    redCapMesh.castShadow = true;
    group.add(redCapMesh);

    // Front Faceplate Texture on Red Cap
    const nameplateMat = new THREE.MeshStandardMaterial({
      map: createPanelContactorRedCapTexture(),
      roughness: 0.35,
      metalness: 0.05,
    });
    const nameplateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(capW - 0.0006, capH - 0.0006),
      nameplateMat
    );
    nameplateMesh.position.set(0, 0, frontZ + 0.0004);
    group.add(nameplateMesh);

    // Top & Bottom Center Mounting Screws on Red Cap (Photo)
    [capH / 2 - 0.0045, -capH / 2 + 0.0045].forEach((sy) => {
      const washer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0032, 0.0032, 0.0006, 12),
        chromeMat
      );
      washer.rotation.x = Math.PI / 2;
      washer.position.set(0, sy, frontZ + 0.0008);
      group.add(washer);

      const scr = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, 0.0012, 10),
        chromeMat
      );
      scr.rotation.x = Math.PI / 2;
      scr.position.set(0, sy, frontZ + 0.0014);
      group.add(scr);

      const slot = new THREE.Mesh(
        new THREE.PlaneGeometry(0.0032, 0.0008),
        new THREE.MeshBasicMaterial({ color: 0x222222 })
      );
      slot.position.set(0, sy, frontZ + 0.0021);
      group.add(slot);
    });

    // Left and Right Waist Brass Threaded Inserts
    [-capW / 2 + 0.0016, capW / 2 - 0.0016].forEach((wx) => {
      const bRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0018, 0.0018, 0.0010, 10),
        contactorBrassMat
      );
      bRing.rotation.x = Math.PI / 2;
      bRing.position.set(wx, 0, frontZ + 0.0006);
      group.add(bRing);

      const bHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0009, 0.0009, 0.0012, 8),
        contactorBakeliteMat
      );
      bHole.rotation.x = Math.PI / 2;
      bHole.position.set(wx, 0, frontZ + 0.0007);
      group.add(bHole);
    });

    // Two moving plunger core tabs in the center (ivory/white)
    [0.010, -0.006].forEach((wy) => {
      const plunger = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.011, 0.003),
        new THREE.MeshStandardMaterial({ color: 0xede8dc, roughness: 0.5 })
      );
      plunger.position.set(0, wy, frontZ + 0.0008);
      group.add(plunger);
    });

    // 5. Auxiliary Contact Block (Contactors 2 & 3 — Photo)
    if (hasAux) {
      const auxW = 0.032;
      const auxH = 0.034;
      const auxD = 0.016;
      const auxY = 0.002;
      const auxZ = frontZ + auxD / 2;

      const auxGroup = new THREE.Group();
      auxGroup.position.set(0, auxY, auxZ);

      // Black mounting footplate under aux block
      const auxBase = new THREE.Mesh(
        new THREE.BoxGeometry(auxW * 0.92, auxH * 0.92, 0.002),
        contactorBakeliteMat
      );
      auxBase.position.z = -auxD / 2 + 0.001;
      auxGroup.add(auxBase);

      // Clear acrylic transparent housing with glass highlights
      const auxBody = new THREE.Mesh(
        new THREE.BoxGeometry(auxW, auxH, auxD),
        acrylicClearMat
      );
      auxBody.renderOrder = 2;
      auxGroup.add(auxBody);

      // Polished acrylic edge highlights
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(auxW, auxH, auxD));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x8899aa, linewidth: 1 });
      const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
      edgeLines.renderOrder = 3;
      auxGroup.add(edgeLines);

      // Center brass plunger clamp pin
      const clampPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0040, 0.0040, 0.006, 16),
        contactorBrassMat
      );
      clampPin.rotation.x = Math.PI / 2;
      clampPin.position.z = auxD / 2 + 0.0015;
      clampPin.renderOrder = 4;
      auxGroup.add(clampPin);

      // 4 Brass terminal screws with square washers on the front face of aux block
      [
        [-auxW / 2 + 0.007, auxH / 2 - 0.006],
        [auxW / 2 - 0.007, auxH / 2 - 0.006],
        [-auxW / 2 + 0.007, -auxH / 2 + 0.006],
        [auxW / 2 - 0.007, -auxH / 2 + 0.006],
      ].forEach(([asx, asy]) => {
        const sqW = new THREE.Mesh(
          new THREE.BoxGeometry(0.0065, 0.0065, 0.0016),
          contactorBrassMat
        );
        sqW.position.set(asx, asy, auxD / 2 + 0.001);
        sqW.renderOrder = 4;
        auxGroup.add(sqW);

        const scr = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0026, 0.0026, 0.0028, 12),
          contactorBrassMat
        );
        scr.rotation.x = Math.PI / 2;
        scr.position.set(asx, asy, auxD / 2 + 0.0025);
        scr.renderOrder = 5;
        auxGroup.add(scr);

        const crs = new THREE.Mesh(
          new THREE.PlaneGeometry(0.0035, 0.001),
          new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        crs.position.set(asx, asy, auxD / 2 + 0.004);
        crs.renderOrder = 6;
        auxGroup.add(crs);
      });

      // Jumper wire from aux block top-left terminal into top terminal deck
      const auxJumperCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-auxW / 2 + 0.007, auxH / 2 - 0.006, auxD / 2 + 0.002),
        new THREE.Vector3(-auxW / 2 - 0.006, auxH / 2 + 0.008, auxD / 2 + 0.002),
        new THREE.Vector3(-0.026, 0.027, 0),
      ]);
      auxGroup.add(new THREE.Mesh(
        new THREE.TubeGeometry(auxJumperCurve, 12, 0.0014, 6, false),
        wireBlackMat
      ));

      group.add(auxGroup);
    }

    group.userData = {
      width: cW,
      height: cH,
      frontZ: frontZ,
      termY: termY,
    };

    return group;
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

  const SEAM_Z = -D / 2 + BASE_D; // = +0.035m (mating plane between base box and door)

  function buildHingedDoor() {
    // Pivot along LEFT long side at the seam mating plane
    doorPivot = new THREE.Group();
    doorPivot.position.set(-W / 2, 0, SEAM_Z);
    rootGroup.add(doorPivot);

    const doorMeshGroup = new THREE.Group();
    // Offset door mesh so pivot is right at the hinge axis
    doorMeshGroup.position.set(W / 2, 0, 0);
    doorPivot.add(doorMeshGroup);

    // Deep clamshell door perimeter walls (35mm deep cover)
    // Front face plate at the front edge of door (local z = DOOR_D - 0.0015)
    const frontFace = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, 0.003),
      steelPaintMat
    );
    frontFace.position.set(0, 0, DOOR_D - 0.0015);
    frontFace.castShadow = true;
    doorMeshGroup.add(frontFace);

    // Door return flanges (top, bottom, right, left) spanning from local z = 0 to DOOR_D
    // Perfectly closing any gap against the base enclosure lip!
    const flangeMat = steelPaintMat;

    // Top flange
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(W, 0.003, DOOR_D), flangeMat);
    topFlange.position.set(0, H / 2 - 0.0015, DOOR_D / 2);
    doorMeshGroup.add(topFlange);

    // Bottom flange
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(W, 0.003, DOOR_D), flangeMat);
    botFlange.position.set(0, -H / 2 + 0.0015, DOOR_D / 2);
    doorMeshGroup.add(botFlange);

    // Right flange (latch side)
    const rightFlange = new THREE.Mesh(new THREE.BoxGeometry(0.003, H, DOOR_D), flangeMat);
    rightFlange.position.set(W / 2 - 0.0015, 0, DOOR_D / 2);
    doorMeshGroup.add(rightFlange);

    // Left flange (hinge side)
    const leftFlange = new THREE.Mesh(new THREE.BoxGeometry(0.003, H, DOOR_D), flangeMat);
    leftFlange.position.set(-W / 2 + 0.0015, 0, DOOR_D / 2);
    doorMeshGroup.add(leftFlange);

    // ——— A. MAIN CONTROL FACEPLATE (Vertical Portrait on the Left — Photo) ———
    const faceplateMat = new THREE.MeshStandardMaterial({
      map: initFaceplateTexture(),
      roughness: 0.32,
      metalness: 0.05,
    });

    const fpW = 0.106;  // ~106mm wide
    const fpH = 0.212;  // ~212mm tall (exact 1:2 aspect ratio matching 1024x2048 canvas)
    const fpX = -0.134; // placed on the left side of the panel door
    const fpY = 0.008;  // centered vertically
    const fpZ = DOOR_D + 0.001; // directly on the front plate

    const faceplateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(fpW, fpH),
      faceplateMat
    );
    faceplateMesh.position.set(fpX, fpY, fpZ);
    faceplateMesh.receiveShadow = true;
    doorMeshGroup.add(faceplateMesh);

    // Molded brushed aluminum outer bezel frame surrounding faceplate (Photo)
    const frameT = 0.0038;
    const frameD = 0.0042;
    // Top
    doorMeshGroup.add(makeFrameBar(fpW + frameT * 2, frameT, frameD, fpX, fpY + fpH / 2 + frameT / 2, fpZ + frameD / 2));
    // Bottom
    doorMeshGroup.add(makeFrameBar(fpW + frameT * 2, frameT, frameD, fpX, fpY - fpH / 2 - frameT / 2, fpZ + frameD / 2));
    // Left
    doorMeshGroup.add(makeFrameBar(frameT, fpH, frameD, fpX - fpW / 2 - frameT / 2, fpY, fpZ + frameD / 2));
    // Right
    doorMeshGroup.add(makeFrameBar(frameT, fpH, frameD, fpX + fpW / 2 + frameT / 2, fpY, fpZ + frameD / 2));

    // ——— B. PHYSICAL 3D SWITCHES (Horizontal Row at Bottom — Photo) ———
    // Aligned mathematically to canvas cards (Col 1: MOTER ON, Col 2: MOTER OFF, Col 3: BLANK, Col 4: 3PHASE AUTO)
    const swY = fpY - 0.0798;
    const swW = 0.0135;
    const swH = 0.021;
    const swD = 0.004;

    const btnOnMat = new THREE.MeshStandardMaterial({ color: 0x009e49, roughness: 0.25, metalness: 0.02 });
    const btnOffMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.25, metalness: 0.02 });

    // 1. Green ON Rocker Switch (Leftmost Column — Photo)
    const btnOn = createSwitch(swW, swH, swD, btnOnMat, fpX - 0.0380, swY, fpZ);
    btnOn.name = 'btn_motor_on';
    doorMeshGroup.add(btnOn);

    // 2. Red OFF Rocker Switch with vertical groove (Column 2 — Photo)
    const btnOff = createSwitch(swW, swH, swD, btnOffMat, fpX - 0.0127, swY, fpZ);
    btnOff.name = 'btn_motor_off';
    const offGroove = new THREE.Mesh(
      new THREE.PlaneGeometry(0.0006, swH * 0.85),
      new THREE.MeshBasicMaterial({ color: 0x08090a })
    );
    offGroove.position.set(0, 0, swD / 2 + 0.0018);
    btnOff.add(offGroove);
    doorMeshGroup.add(btnOff);

    // 3. COLUMN 3 IS A BLANK KNOCKOUT SLOT (Photo: No switch installed in slot 3!)

    // 4. Red AUTO / 3-PHASE Rocker Switch (Column 4 — Photo: with white O / I marking)
    const swW4 = 0.0105; // Narrower rocker
    const btnPhase3 = createSwitch(swW4, swH, swD, btnOffMat, fpX + 0.0378, swY, fpZ);
    btnPhase3.name = 'btn_phase3';

    // White "O" (circle on top)
    const rockerO = new THREE.Mesh(
      new THREE.RingGeometry(0.0016, 0.0024, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    rockerO.position.set(0, 0.0048, swD / 2 + 0.0020);
    btnPhase3.add(rockerO);

    // White "I" (line on bottom)
    const rockerI = new THREE.Mesh(
      new THREE.PlaneGeometry(0.0012, 0.0045),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    rockerI.position.set(0, -0.0048, swD / 2 + 0.0020);
    btnPhase3.add(rockerI);

    doorMeshGroup.add(btnPhase3);

    // ——— C. CENTER BLACK POTENTIOMETER KNOB (Above Vkon Logo in Yellow Area — Photo) ———
    // Compact ~15mm diameter, molded matte black plastic with cross (+) slot (Photo)
    const knobX = fpX;
    const knobY = fpY + 0.0380; // Aligned to canvas knob position
    const knobGeo = new THREE.CylinderGeometry(0.0070, 0.0076, 0.0055, 32);
    potKnobMesh = new THREE.Mesh(knobGeo, new THREE.MeshStandardMaterial({
      color: 0x121316,
      roughness: 0.75,
      metalness: 0.05,
    }));
    potKnobMesh.rotation.x = Math.PI / 2;
    potKnobMesh.position.set(knobX, knobY, fpZ + 0.0035);
    potKnobMesh.castShadow = true;

    // Recessed cross (+) slot on front circular face (Photo)
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x050608 });
    const slotH = new THREE.Mesh(new THREE.PlaneGeometry(0.0014, 0.0055), slotMat);
    slotH.rotation.x = -Math.PI / 2;
    slotH.position.set(0, 0.00285, 0);
    const slotV = new THREE.Mesh(new THREE.PlaneGeometry(0.0055, 0.0014), slotMat);
    slotV.rotation.x = -Math.PI / 2;
    slotV.position.set(0, 0.00285, 0);
    potKnobMesh.add(slotH);
    potKnobMesh.add(slotV);

    doorMeshGroup.add(potKnobMesh);

    // ——— D. SQUARE AMMETER KNOCKOUT WITH 4 TABS (In Center of Door — Image 2) ———
    const ammeterGroup = new THREE.Group();
    const ammeterX = -0.012;
    const ammeterY = -0.040;
    ammeterGroup.position.set(ammeterX, ammeterY, fpZ);

    const cutW = 0.064;
    const cutH = 0.064;
    const slitT = 0.0018;

    const slitMat = new THREE.MeshBasicMaterial({ color: 0x111317 });

    const slitTop = new THREE.Mesh(new THREE.PlaneGeometry(cutW, slitT), slitMat);
    slitTop.position.set(0, cutH / 2, 0.0006);
    ammeterGroup.add(slitTop);

    const slitBot = new THREE.Mesh(new THREE.PlaneGeometry(cutW, slitT), slitMat);
    slitBot.position.set(0, -cutH / 2, 0.0006);
    ammeterGroup.add(slitBot);

    [-1, 1].forEach((side) => {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(slitT, cutH * 0.28), slitMat);
      s1.position.set(side * cutH / 2, cutH * 0.35, 0.0006);
      ammeterGroup.add(s1);

      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(slitT, cutH * 0.28), slitMat);
      s2.position.set(side * cutH / 2, 0, 0.0006);
      ammeterGroup.add(s2);

      const s3 = new THREE.Mesh(new THREE.PlaneGeometry(slitT, cutH * 0.28), slitMat);
      s3.position.set(side * cutH / 2, -cutH * 0.35, 0.0006);
      ammeterGroup.add(s3);

      [-0.020, 0.020].forEach((ty) => {
        const tabNotch = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.005), slitMat);
        tabNotch.position.set(side * (cutH / 2 + 0.002), ty, 0.0006);
        ammeterGroup.add(tabNotch);
      });
    });

    doorMeshGroup.add(ammeterGroup);

    // ——— E. EMBOSSED SQUARE RECESS (On the Right Side of Door — Image 2) ———
    const embossW = 0.076;
    const embossH = 0.076;
    const embossGroup = new THREE.Group();
    const embossX = 0.128;
    const embossY = -0.040;
    embossGroup.position.set(embossX, embossY, fpZ - 0.0005);

    const embossMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(embossW, embossH),
      new THREE.MeshStandardMaterial({
        color: 0xc4c0b6,
        roughness: 0.52,
        metalness: 0.06,
      })
    );
    embossGroup.add(embossMesh);

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x99948a });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xeeeae2 });

    const topShadow = new THREE.Mesh(new THREE.PlaneGeometry(embossW, 0.0016), shadowMat);
    topShadow.position.set(0, embossH / 2, 0.001);
    embossGroup.add(topShadow);

    const leftShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.0016, embossH), shadowMat);
    leftShadow.position.set(-embossW / 2, 0, 0.001);
    embossGroup.add(leftShadow);

    const botHighlight = new THREE.Mesh(new THREE.PlaneGeometry(embossW, 0.0016), highlightMat);
    botHighlight.position.set(0, -embossH / 2, 0.001);
    embossGroup.add(botHighlight);

    const rightHighlight = new THREE.Mesh(new THREE.PlaneGeometry(0.0016, embossH), highlightMat);
    rightHighlight.position.set(embossW / 2, 0, 0.001);
    embossGroup.add(rightHighlight);

    doorMeshGroup.add(embossGroup);

    // ——— F. INSIDE OF DOOR: CONTROLLER PCB ENCLOSURE BOX (Photo 7) ———
    const pcbGroup = new THREE.Group();
    const pcbW = 0.102;
    const pcbH = 0.208;
    const pcbD = 0.030;
    pcbGroup.position.set(fpX, fpY, DOOR_D - pcbD / 2 - 0.003);

    const pcbBody = new THREE.Mesh(
      new THREE.BoxGeometry(pcbW, pcbH, pcbD),
      pcbBoxMat
    );
    pcbGroup.add(pcbBody);

    for (let ry = -pcbH / 2 + 0.02; ry <= pcbH / 2 - 0.02; ry += 0.012) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(pcbW - 0.016, 0.003, 0.002),
        new THREE.MeshBasicMaterial({ color: 0x444038 })
      );
      rib.position.set(0, ry, -pcbD / 2 - 0.001);
      pcbGroup.add(rib);
    }

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

    const harnessCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(fpX, fpY - pcbH / 2, DOOR_D - pcbD),
      new THREE.Vector3(fpX - 0.05, fpY - pcbH / 2 - 0.04, 0.01),
      new THREE.Vector3(-0.12, -0.02, -D / 2 + BASE_D / 2),
    ]);
    const harnessMesh = new THREE.Mesh(
      new THREE.TubeGeometry(harnessCurve, 16, 0.006, 8, false),
      wireBlackMat
    );
    doorMeshGroup.add(harnessMesh);

    doorMeshGroup.add(pcbGroup);

    // ——— G. TWO EXTERNAL STEEL BUTT HINGES (Photo 4) ———
    // Mounted on the left edge spanning the seam mating plane
    [-0.08, 0.08].forEach((hy) => {
      const hinge = buildHingeMesh();
      hinge.position.set(-W / 2, hy, SEAM_Z);
      rootGroup.add(hinge);
    });

    return doorMeshGroup;
  }

  const faceplateBezelMat = new THREE.MeshStandardMaterial({
    color: 0xd2d5dc, // Silver anodized aluminum / metallic trim (Photo)
    roughness: 0.28,
    metalness: 0.68,
  });

  function createSwitch(w, h, d, colorMat, x, y, z) {
    const swGroup = new THREE.Group();
    swGroup.position.set(x, y, z);

    // Slim matte black outer housing bezel (Photo)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e11,
      roughness: 0.85,
      metalness: 0.02,
    });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.002, h + 0.002, 0.0025),
      bezelMat
    );
    base.position.z = 0.00125;
    swGroup.add(base);

    // Colored rocker button sitting inside bezel
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      colorMat
    );
    btn.position.z = d / 2 + 0.0018;
    btn.castShadow = true;
    swGroup.add(btn);

    return swGroup;
  }

  function makeFrameBar(w, h, d, x, y, z) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      faceplateBezelMat
    );
    bar.position.set(x, y, z);
    bar.castShadow = true;
    return bar;
  }

  function buildHingeMesh() {
    const hGroup = new THREE.Group();

    // Hinge cylinder pin positioned directly on the seam line
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0045, 0.0045, 0.040, 16),
      chromeMat
    );
    pin.position.set(0, 0, 0);
    hGroup.add(pin);

    // Door leaf plate (attaches to door, extends forward into z > 0)
    const leafDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.036, 0.016),
      chromeMat
    );
    leafDoor.position.set(0.0015, 0, 0.008);
    hGroup.add(leafDoor);

    // Body leaf plate (attaches to base enclosure, extends backward into z < 0)
    const leafBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.036, 0.016),
      chromeMat
    );
    leafBody.position.set(0.0015, 0, -0.008);
    hGroup.add(leafBody);

    // Hinge screws
    [-0.011, 0.011].forEach((sy) => {
      const scrDoor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0025, 0.0025, 0.002, 8),
        chromeMat
      );
      scrDoor.rotation.z = Math.PI / 2;
      scrDoor.position.set(-0.001, sy, 0.008);
      hGroup.add(scrDoor);

      const scrBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0025, 0.0025, 0.002, 8),
        chromeMat
      );
      scrBody.rotation.z = Math.PI / 2;
      scrBody.position.set(-0.001, sy, -0.008);
      hGroup.add(scrBody);
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
  //  STANDALONE CITATION LINE CONTACTOR SHOWCASE PEDESTAL
  // ================================================================
  const contactorShowcaseGroup = new THREE.Group();
  scene.add(contactorShowcaseGroup);
  contactorShowcaseGroup.visible = false;

  // Sleek titanium exhibition turntable pedestal
  const contactorPedestalGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.018, 64);
  const contactorPedestalMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.32,
    metalness: 0.85,
  });
  const contactorPedestal = new THREE.Mesh(contactorPedestalGeo, contactorPedestalMat);
  contactorPedestal.position.set(0, -0.065, 0);
  contactorPedestal.receiveShadow = true;
  contactorShowcaseGroup.add(contactorPedestal);

  // Glowing cyan accent ring around turntable
  const contactorRingGeo = new THREE.TorusGeometry(0.132, 0.0024, 16, 64);
  const contactorRingMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
  const contactorLedRing = new THREE.Mesh(contactorRingGeo, contactorRingMat);
  contactorLedRing.rotation.x = Math.PI / 2;
  contactorLedRing.position.set(0, -0.056, 0);
  contactorShowcaseGroup.add(contactorLedRing);

  // Standalone contactor on top of pedestal (scale: 1.2 for clear inspection)
  const standaloneContactor = buildCitationLineContactor({ isStandalone: true, scale: 1.2 });
  standaloneContactor.position.set(0, 0, 0);
  contactorShowcaseGroup.add(standaloneContactor);

  // Contact spark light effect inside terminal chamber
  contactorSparkLight = new THREE.PointLight(0x00d2d3, 0, 0.4);
  contactorSparkLight.position.set(0, 0.03, 0.04);
  contactorShowcaseGroup.add(contactorSparkLight);

  // Underneath soft uplight for base plate inspection
  const underLight = new THREE.PointLight(0xffffff, 0.5, 0.3);
  underLight.position.set(0, -0.04, 0);
  contactorShowcaseGroup.add(underLight);

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

  // Periodic subtle voltage / current fluctuation when running
  setInterval(() => {
    if (state.isMotorRunning) {
      state.voltage = 414 + Math.floor(Math.random() * 3);
      state.current = 18.0 + (Math.random() - 0.5) * 0.6;
      updateFaceplateCanvas();
    }
  }, 2200);

  // ================================================================
  //  CONTACTOR ENERGIZE ANIMATION (Plunger pull-in + spark)
  // ================================================================
  let isEnergizing = false;

  function energizeContactor() {
    if (isEnergizing || standalonePlungers.length < 2) return;
    isEnergizing = true;

    const p1 = standalonePlungers[0];
    const p2 = standalonePlungers[1];
    const restY = standaloneContactor.userData.restY;
    const pulledY = restY - 0.0075;

    const btn = document.getElementById('btnEnergizeContactor');
    if (btn) btn.classList.add('energized');

    // Mechanical plunger snap-in
    gsap.to([p1.position, p2.position], {
      y: pulledY,
      duration: 0.06,
      ease: 'power4.in',
      onComplete: () => {
        // Flash contact spark
        if (contactorSparkLight) {
          contactorSparkLight.intensity = 3.5;
          gsap.to(contactorSparkLight, { intensity: 0, duration: 0.22 });
        }
      },
    });

    // Hold energized state then release
    gsap.to([p1.position, p2.position], {
      y: restY,
      duration: 0.16,
      delay: 0.55,
      ease: 'back.out(2.2)',
      onComplete: () => {
        if (btn) btn.classList.remove('energized');
        isEnergizing = false;
      },
    });
  }

  // ================================================================
  //  MODE SWITCHER: PANEL vs CONTACTOR
  // ================================================================
  const modePanelBtn = document.getElementById('modePanelBtn');
  const modeContactorBtn = document.getElementById('modeContactorBtn');
  const contactorSpecCard = document.getElementById('contactorSpecCard');
  const panelDockGroup = document.getElementById('panelDockGroup');
  const contactorDockGroup = document.getElementById('contactorDockGroup');
  const showcaseTitle = document.getElementById('showcaseTitle');
  const showcaseSubtitle = document.getElementById('showcaseSubtitle');
  const btnPowerToggle = document.getElementById('btnPowerToggle');

  let currentMode = 'panel';

  function switchMode(mode) {
    currentMode = mode;

    if (mode === 'panel') {
      if (modePanelBtn) modePanelBtn.classList.add('active');
      if (modeContactorBtn) modeContactorBtn.classList.remove('active');

      rootGroup.visible = true;
      contactorShowcaseGroup.visible = false;

      if (contactorSpecCard) contactorSpecCard.classList.remove('active');
      if (panelDockGroup) panelDockGroup.style.display = 'flex';
      if (contactorDockGroup) contactorDockGroup.style.display = 'none';
      if (btnPowerToggle) btnPowerToggle.style.display = 'flex';

      if (showcaseTitle) showcaseTitle.textContent = 'VKON AUTOMATION';
      if (showcaseSubtitle) showcaseSubtitle.textContent = 'SASD 1/2/3 Panel · Digital Twin';

      setActiveDockBtn(btnFront);
      setDoorState(false);
      animateCameraTo({ x: 0, y: 0.04, z: 0.72 }, { x: 0, y: 0, z: 0 });
    } else {
      if (modePanelBtn) modePanelBtn.classList.remove('active');
      if (modeContactorBtn) modeContactorBtn.classList.add('active');

      rootGroup.visible = false;
      contactorShowcaseGroup.visible = true;

      if (contactorSpecCard) contactorSpecCard.classList.add('active');
      if (panelDockGroup) panelDockGroup.style.display = 'none';
      if (contactorDockGroup) contactorDockGroup.style.display = 'flex';
      if (btnPowerToggle) btnPowerToggle.style.display = 'none';

      if (showcaseTitle) showcaseTitle.textContent = 'CITATION LINE 16A';
      if (showcaseSubtitle) showcaseSubtitle.textContent = 'Heavy Duty 4-Pole Contactor · 280/440V Coil';

      setContactorDockActive(btnContactorIso);
      animateCameraTo({ x: 0.16, y: 0.14, z: 0.22 }, { x: 0, y: 0.01, z: 0 });
    }
  }

  if (modePanelBtn) modePanelBtn.addEventListener('click', () => switchMode('panel'));
  if (modeContactorBtn) modeContactorBtn.addEventListener('click', () => switchMode('contactor'));

  // Wire Energize button in spec card
  const btnEnergize = document.getElementById('btnEnergizeContactor');
  if (btnEnergize) {
    btnEnergize.addEventListener('click', () => {
      energizeContactor();
    });
  }

  // ================================================================
  //  UI INTERACTION EVENT HANDLERS
  // ================================================================

  // Panel Dock Buttons
  const btnFront = document.getElementById('btnFront');
  const btnToggleDoor = document.getElementById('btnToggleDoor');
  const btnInside = document.getElementById('btnInside');
  const btnBack = document.getElementById('btnBack');
  const btnRotate = document.getElementById('btnRotate');

  function setActiveDockBtn(activeBtn) {
    [btnFront, btnInside, btnBack].forEach((b) => b && b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  if (btnFront) {
    btnFront.addEventListener('click', () => {
      setActiveDockBtn(btnFront);
      setDoorState(false);
      animateCameraTo({ x: 0, y: 0.04, z: 0.72 }, { x: 0, y: 0, z: 0 });
    });
  }

  if (btnToggleDoor) {
    btnToggleDoor.addEventListener('click', () => {
      setDoorState(!state.isDoorOpen);
      if (state.isDoorOpen) {
        setActiveDockBtn(btnInside);
      }
    });
  }

  if (btnInside) {
    btnInside.addEventListener('click', () => {
      setActiveDockBtn(btnInside);
      setDoorState(true);
      animateCameraTo({ x: 0.04, y: 0.02, z: 0.46 }, { x: 0.02, y: -0.02, z: -0.02 });
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      setActiveDockBtn(btnBack);
      setDoorState(false);
      animateCameraTo({ x: 0, y: 0.05, z: -0.76 }, { x: 0, y: 0, z: 0 });
    });
  }

  // Contactor Dock Buttons
  const btnContactorTop = document.getElementById('btnContactorTop');
  const btnContactorFront = document.getElementById('btnContactorFront');
  const btnContactorBase = document.getElementById('btnContactorBase');
  const btnContactorIso = document.getElementById('btnContactorIso');

  function setContactorDockActive(activeBtn) {
    [btnContactorTop, btnContactorFront, btnContactorBase, btnContactorIso].forEach((b) => b && b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Top Face (Photo 4: Nameplate & Plungers)
  if (btnContactorTop) {
    btnContactorTop.addEventListener('click', () => {
      setContactorDockActive(btnContactorTop);
      gsap.to(standaloneContactor.rotation, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'power2.inOut' });
      animateCameraTo({ x: 0, y: 0.24, z: 0.015 }, { x: 0, y: 0.03, z: 0 });
    });
  }

  // Front View (Photo 2: Terminals & 280/440V Coil)
  if (btnContactorFront) {
    btnContactorFront.addEventListener('click', () => {
      setContactorDockActive(btnContactorFront);
      gsap.to(standaloneContactor.rotation, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'power2.inOut' });
      animateCameraTo({ x: 0, y: 0.02, z: 0.24 }, { x: 0, y: 0.01, z: 0 });
    });
  }

  // Base Plate Underneath (Photo 1: Keyhole slots & Screws)
  if (btnContactorBase) {
    btnContactorBase.addEventListener('click', () => {
      setContactorDockActive(btnContactorBase);
      // Tilt contactor up to showcase underneath base plate directly to viewer (Photo 1)
      gsap.to(standaloneContactor.rotation, { x: -Math.PI * 0.52, y: 0, z: 0, duration: 0.9, ease: 'power2.inOut' });
      animateCameraTo({ x: 0, y: 0.04, z: 0.28 }, { x: 0, y: 0.01, z: 0 });
    });
  }

  // Isometric 3/4 View (Photo 3: Stepped Profile)
  if (btnContactorIso) {
    btnContactorIso.addEventListener('click', () => {
      setContactorDockActive(btnContactorIso);
      gsap.to(standaloneContactor.rotation, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'power2.inOut' });
      animateCameraTo({ x: 0.16, y: 0.14, z: 0.22 }, { x: 0, y: 0.01, z: 0 });
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

  // Double click canvas to toggle door (in panel mode) or energize (in contactor mode)
  canvas.addEventListener('dblclick', () => {
    if (currentMode === 'panel') {
      setDoorState(!state.isDoorOpen);
    } else {
      energizeContactor();
    }
  });

  // Raycasting for physical switch clicks or contactor click
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (currentMode === 'panel') {
      const intersects = raycaster.intersectObjects(doorGroup.children, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && obj.parent && !obj.name && obj !== doorGroup) {
          obj = obj.parent;
        }

        if (obj && obj.name) {
          if (obj.name === 'btn_motor_on') {
            gsap.to(obj.position, { z: obj.position.z - 0.0025, duration: 0.08, yoyo: true, repeat: 1 });
            toggleMotorPower(true);
          } else if (obj.name === 'btn_motor_off') {
            gsap.to(obj.position, { z: obj.position.z - 0.0025, duration: 0.08, yoyo: true, repeat: 1 });
            toggleMotorPower(false);
          } else if (obj.name === 'btn_phase3') {
            state.autoPhase3 = !state.autoPhase3;
            gsap.to(obj.rotation, { x: state.autoPhase3 ? 0.12 : -0.12, duration: 0.12, ease: 'power2.out' });
          }
        }
      }
    } else {
      const intersects = raycaster.intersectObjects(standaloneContactor.children, true);
      if (intersects.length > 0) {
        energizeContactor();
      }
    }
  });

  // Potentiometer knob rotation on hover/wheel (around cylinder Y axis)
  canvas.addEventListener('wheel', (e) => {
    if (e.shiftKey && potKnobMesh) {
      state.potAngle += e.deltaY * 0.003;
      potKnobMesh.rotation.y = state.potAngle;
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
