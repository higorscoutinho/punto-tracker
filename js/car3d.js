// ==========================================================================
// car3d.js — a small 3D "Fiat Punto Preto" icon that sits on a short strip
// and hops forward whenever the paid progress changes. No idle spinning —
// it's meant to read as a calm icon, not a scene, and only moves in
// response to something you did (marking a parcela paid).
// (Three.js r128, global build, no build step needed.)
// ==========================================================================

function createPuntoIcon(container, opts = {}) {
  const trackLength = 2.5;

  let width = container.clientWidth || 160;
  let height = container.clientHeight || 120;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 30);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // ---------- lights (no shadow map — this is a tiny icon, not a scene) ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8f97a3, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.85);
  sun.position.set(3, 5, 3);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.25);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  // ---------- a soft contact shadow blob under the car (fake, cheap) ----------
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128; shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(10,15,25,0.38)');
  grad.addColorStop(1, 'rgba(10,15,25,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadowBlob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.85), shadowMat);
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = 0.002;
  scene.add(shadowBlob);

  // ---------- thin ground strip (just enough to read as a path) ----------
  const stripMat = new THREE.MeshStandardMaterial({ color: 0xe4e7ee, roughness: 1 });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.04, trackLength + 1.1), stripMat);
  strip.position.set(0, -0.02, -trackLength / 2 + 0.2);
  scene.add(strip);

  // ---------- the car ----------
  // Starts as an empty group; the real Fiat Punto model (assets/models/fiat-punto.glb,
  // repainted black) loads in asynchronously and drops itself in here. If it
  // can't be loaded for any reason, a simple stylized fallback car is used
  // instead so the icon never shows up empty. Wheels stay static on purpose.
  const car = new THREE.Group();
  scene.add(car);
  loadRealCar(car);

  function loadRealCar(target) {
    const MODEL_URL = 'assets/models/fiat-punto.glb';

    if (!window.THREE || !THREE.GLTFLoader) {
      useFallback(target);
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        try {
          const model = gltf.scene;
          model.rotation.y = Math.PI; // model's front faces +Z; we drive toward -Z
          const scale = 0.025; // model units (~inches) → meters
          model.scale.setScalar(scale);
          model.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= box.min.y;

          target.add(model);
          renderOnce();
        } catch (e) {
          console.warn('Falha ao montar o modelo 3D, usando carrinho simples.', e);
          useFallback(target);
        }
      },
      undefined,
      (err) => {
        console.warn('Não consegui carregar o modelo 3D, usando carrinho simples.', err);
        useFallback(target);
      },
    );
  }

  function useFallback(target) {
    target.add(buildFallbackCar());
    renderOnce();
  }

  function buildFallbackCar() {
    const grp = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x101114, metalness: 0.65, roughness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1c2836, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.88 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.6 });
    const rim = new THREE.MeshStandardMaterial({ color: 0xc7c9cf, metalness: 0.85, roughness: 0.25 });
    const tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
    const headlight = new THREE.MeshStandardMaterial({ color: 0xfff6d9, emissive: 0xffe9a8, emissiveIntensity: 0.55 });
    const taillight = new THREE.MeshStandardMaterial({ color: 0xaa1414, emissive: 0x660000, emissiveIntensity: 0.4 });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.5, 3.5), body);
    lower.position.y = 0.5;
    grp.add(lower);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.05), body);
    hood.position.set(0, 0.78, 1.28);
    grp.add(hood);

    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.7), body);
    trunk.position.set(0, 0.8, -1.35);
    grp.add(trunk);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.56, 1.75), body);
    cabin.position.set(0, 1.12, -0.15);
    grp.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.5, 0.06), glass);
    windshield.position.set(0, 1.12, 0.72);
    windshield.rotation.x = THREE.MathUtils.degToRad(24);
    grp.add(windshield);

    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.46, 0.06), glass);
    rearWindow.position.set(0, 1.12, -1.02);
    rearWindow.rotation.x = THREE.MathUtils.degToRad(-26);
    grp.add(rearWindow);

    [-0.735, 0.735].forEach((x) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 1.35), glass);
      sw.position.set(x, 1.14, -0.1);
      grp.add(sw);
    });

    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.28, 0.22), trim);
    bumperF.position.set(0, 0.36, 1.78);
    grp.add(bumperF);
    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.28, 0.22), trim);
    bumperR.position.set(0, 0.36, -1.78);
    grp.add(bumperR);

    [-0.62, 0.62].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), headlight);
      hl.position.set(x, 0.56, 1.78);
      grp.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), taillight);
      tl.position.set(x, 0.6, -1.79);
      grp.add(tl);
    });

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.05), trim);
    grille.position.set(0, 0.56, 1.8);
    grp.add(grille);

    [-0.88, 0.88].forEach((x) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.2), trim);
      m.position.set(x, 1.02, 0.55);
      grp.add(m);
    });

    const crease = new THREE.Mesh(new THREE.BoxGeometry(1.685, 0.03, 3.2), trim);
    crease.position.set(0, 0.66, -0.05);
    grp.add(crease);

    const wheelPositions = [
      [-0.86, 0.34, 1.1], [0.86, 0.34, 1.1],
      [-0.86, 0.34, -1.15], [0.86, 0.34, -1.15],
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wGrp = new THREE.Group();
      const tireMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20), tire);
      tireMesh.rotation.z = Math.PI / 2;
      const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.23, 12), rim);
      rimMesh.rotation.z = Math.PI / 2;
      wGrp.add(tireMesh, rimMesh);
      wGrp.position.set(x, y, z);
      grp.add(wGrp);
    });

    // scale the hand-built fallback down to roughly match the real model's footprint
    grp.scale.setScalar(0.28);
    return grp;
  }

  // ---------- camera framing (fixed — no orbiting, this is an icon) ----------
  function frameCamera() {
    camera.aspect = width / height;
    camera.position.set(1.55, 1.05, 1.85);
    camera.lookAt(0, 0.28, -trackLength * 0.4);
    camera.updateProjectionMatrix();
  }
  frameCamera();

  // ---------- state + on-demand rendering ----------
  let progressPct = null; // null until first setProgress call
  let displayZ = 0;
  let rafId = null;
  let sparkles = null;
  let sparkleUntil = 0;

  function renderOnce() {
    renderer.render(scene, camera);
  }

  const zFor = (pct) => -((pct / 100) * trackLength);

  function easeOutBack(t) {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function runLoop(stepFn) {
    if (rafId) cancelAnimationFrame(rafId);
    const start = performance.now();
    function tick(now) {
      const done = stepFn(now - start);
      renderOnce();
      if (!done) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function hopTo(newZ, celebrate) {
    const fromZ = displayZ;
    const duration = 700;
    runLoop((elapsed) => {
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutBack(t);
      displayZ = fromZ + (newZ - fromZ) * eased;
      car.position.z = displayZ;
      // little hop arc + squash on landing
      const arc = Math.sin(Math.min(t, 1) * Math.PI) * 0.13;
      car.position.y = arc;
      const squash = t > 0.92 ? 1 - (1 - t) * 1.2 : 1;
      car.scale.set(1 + (1 - squash) * 0.06, squash, 1 + (1 - squash) * 0.06);
      updateSparkles(elapsed);
      const finished = t >= 1;
      if (finished) {
        car.position.y = 0;
        car.scale.set(1, 1, 1);
        if (celebrate) spawnSparkles();
      }
      return finished && (!sparkles || elapsed > sparkleUntil);
    });
  }

  function spawnSparkles() {
    const count = 46;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.1;
      positions[i * 3 + 1] = 0.15 + Math.random() * 0.1;
      positions[i * 3 + 2] = displayZ + (Math.random() - 0.5) * 1.1;
      speeds[i] = 0.35 + Math.random() * 0.6;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffd873, size: 0.055, transparent: true, opacity: 0.95 });
    if (sparkles) scene.remove(sparkles);
    sparkles = new THREE.Points(geo, mat);
    scene.add(sparkles);
    sparkleUntil = performance.now() - performance.now() + 1400; // relative marker, see updateSparkles
    sparkles.userData.startedAt = performance.now();
  }

  function updateSparkles() {
    if (!sparkles) return;
    const age = performance.now() - sparkles.userData.startedAt;
    if (age > 1400) {
      scene.remove(sparkles);
      sparkles = null;
      return;
    }
    const pos = sparkles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + 0.012);
    }
    pos.needsUpdate = true;
    sparkles.material.opacity = Math.max(0, 0.95 * (1 - age / 1400));
  }

  // keep the sparkle fade animating even after the hop itself has settled
  function tickSparklesUntilDone() {
    if (!sparkles) return;
    runLoop((elapsed) => {
      updateSparkles();
      return !sparkles;
    });
  }

  function setProgress(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    const isFirst = progressPct === null;
    const wasComplete = progressPct !== null && progressPct >= 100;
    const nowComplete = clamped >= 100;
    const newZ = zFor(clamped);

    if (isFirst) {
      progressPct = clamped;
      displayZ = newZ;
      car.position.z = newZ;
      renderOnce();
      // small welcome hop in place so it doesn't feel static on first paint
      hopTo(newZ, false);
      if (nowComplete) spawnSparkles();
      tickSparklesUntilDone();
      return;
    }

    const changed = Math.abs(newZ - displayZ) > 0.0001;
    progressPct = clamped;
    if (changed) {
      hopTo(newZ, nowComplete && !wasComplete);
    } else if (nowComplete && !wasComplete) {
      spawnSparkles();
      tickSparklesUntilDone();
    }
  }

  function resize() {
    width = container.clientWidth || width;
    height = container.clientHeight || height;
    renderer.setSize(width, height);
    frameCamera();
    renderOnce();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('resize', resize);

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    ro.disconnect();
    window.removeEventListener('resize', resize);
    renderer.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  }

  return { setProgress, destroy };
}
