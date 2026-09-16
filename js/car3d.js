// ==========================================================================
// car3d.js — a small 3D "Fiat Punto Preto" toy sitting in the corner of the
// screen. It does NOT represent progress or any data at all — it's just a
// decoration, parked and still, that you can grab and spin around with your
// finger/mouse to look at it, like a little toy on a shelf. Flick it and it
// keeps spinning for a bit before settling back down.
// (Three.js r128, global build, no build step needed.)
// ==========================================================================

function createPuntoToy(container, opts = {}) {
  let width = container.clientWidth || 160;
  let height = container.clientHeight || 120;

  const scene = new THREE.Scene();
  scene.background = null;

  const target = new THREE.Vector3(0, 0.5, 0);
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.05, 30);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  // ---------- lights (no shadow map — this is a tiny toy, not a scene) ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8f97a3, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
  sun.position.set(3, 5, 3);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.28);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  // ---------- a soft contact shadow blob under the car (fake, cheap) ----------
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128; shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(10,15,25,0.4)');
  grad.addColorStop(1, 'rgba(10,15,25,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadowBlob = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.75), shadowMat);
  shadowBlob.rotation.x = -Math.PI / 2;
  shadowBlob.position.y = 0.002;
  scene.add(shadowBlob);

  // ---------- the car — parked, still, just sitting there ----------
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
          model.rotation.y = Math.PI; // model's front faces +Z; we want it facing -Z (toward viewer's left-ish)
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

  // ---------- orbit camera you can grab & spin (drag to rotate, flick for momentum) ----------
  let radius = 5.6;
  let theta = Math.PI + 0.62; // azimuth (around Y) — starts on a front 3/4 view
  let phi = 1.1;              // polar angle (0 = straight above, PI/2 = level with car)
  const PHI_MIN = 0.55;
  const PHI_MAX = 1.5;

  function updateCameraFromSpherical() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(target);
  }
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updateCameraFromSpherical();

  function renderOnce() {
    renderer.render(scene, camera);
  }

  // ---------- drag-to-spin interaction (pointer events unify mouse + touch) ----------
  const el = renderer.domElement;
  let dragging = false;
  let lastX = 0, lastY = 0;
  let vTheta = 0; // angular velocity from the last drag, used for momentum on release
  let momentumId = null;
  const DRAG_SENS = 0.0085;

  function stopMomentum() {
    if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
  }

  function onPointerDown(e) {
    dragging = true;
    stopMomentum();
    vTheta = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    theta += dx * DRAG_SENS;
    phi = Math.max(PHI_MIN, Math.min(PHI_MAX, phi - dy * DRAG_SENS));
    vTheta = dx * DRAG_SENS; // remember for the momentum flick on release
    updateCameraFromSpherical();
    renderOnce();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (Math.abs(vTheta) > 0.0008) runMomentum();
  }

  function runMomentum() {
    stopMomentum();
    function tick() {
      vTheta *= 0.955; // friction — the toy gently settles back to a stop
      theta += vTheta;
      updateCameraFromSpherical();
      renderOnce();
      if (Math.abs(vTheta) > 0.0004) {
        momentumId = requestAnimationFrame(tick);
      } else {
        momentumId = null;
      }
    }
    momentumId = requestAnimationFrame(tick);
  }

  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);

  function resize() {
    width = container.clientWidth || width;
    height = container.clientHeight || height;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderOnce();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('resize', resize);

  function destroy() {
    stopMomentum();
    ro.disconnect();
    window.removeEventListener('resize', resize);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
    renderer.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  }

  return { destroy };
}
