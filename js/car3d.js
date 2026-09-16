// ==========================================================================
// car3d.js — a small, stylized 3D "Fiat Punto Preto" that drives down a
// road as the financing gets paid off. Just for fun (Three.js r128, global
// build, no build step needed).
// ==========================================================================

function createPuntoScene(container, opts = {}) {
  const trackLength = 34;
  const finishMargin = 2.4;
  const milestoneEvery = opts.milestoneEvery || 3;
  const totalParcelas = opts.totalParcelas || 36;

  let width = container.clientWidth || 300;
  let height = container.clientHeight || 300;

  const scene = new THREE.Scene();
  const skyTop = new THREE.Color('#cfe0f5');
  const skyBottom = new THREE.Color('#eaf1fb');
  scene.background = skyTop;
  scene.fog = new THREE.Fog(0xdbe7f5, 18, 42);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa5b1, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.05);
  sun.position.set(6, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.far = 30;
  scene.add(sun);

  // ---------- ground + road ----------
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x9db08a, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.position.z = -trackLength / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadGeo = new THREE.BoxGeometry(4.6, 0.06, trackLength + 6);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2f333b, roughness: 0.95 });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(0, 0, -trackLength / 2 + 2);
  road.receiveShadow = true;
  scene.add(road);

  // dashed centerline
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xf4d35e, roughness: 0.6 });
  for (let z = 2; z > -trackLength - 3; z -= 1.4) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, 0.7), dashMat);
    dash.position.set(0, 0.005, z);
    scene.add(dash);
  }

  // curbs
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.9 });
  [-2.5, 2.5].forEach((x) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, trackLength + 6), curbMat);
    curb.position.set(x, 0.03, -trackLength / 2 + 2);
    curb.castShadow = true;
    scene.add(curb);
  });

  // ---------- milestone flags ----------
  const milestoneGroup = new THREE.Group();
  scene.add(milestoneGroup);
  const flags = [];
  for (let n = milestoneEvery; n <= totalParcelas; n += milestoneEvery) {
    const z = -((n / totalParcelas) * trackLength);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x555a63 }),
    );
    pole.position.set(2.35, 0.45, z);
    pole.castShadow = true;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x9aa1ad, side: THREE.DoubleSide }),
    );
    flag.position.set(2.56, 0.78, z);
    flag.userData.baseColor = flag.material.color.clone();
    const grp = new THREE.Group();
    grp.add(pole, flag);
    grp.userData = { n, flag };
    milestoneGroup.add(grp);
    flags.push(grp);
  }

  // finish line
  const finishGeo = new THREE.PlaneGeometry(4.4, 0.5);
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 8;
  const cctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 1; j++) {
      cctx.fillStyle = (i % 2 === 0) ? '#111' : '#fff';
      cctx.fillRect(i * 8, 0, 8, 8);
    }
  }
  const finishTex = new THREE.CanvasTexture(canvas);
  finishTex.magFilter = THREE.NearestFilter;
  const finishMat = new THREE.MeshStandardMaterial({ map: finishTex, roughness: 0.8 });
  const finishLine = new THREE.Mesh(finishGeo, finishMat);
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.position.set(0, 0.04, -trackLength);
  scene.add(finishLine);

  const flagPoleGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8);
  const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99 });
  [-2.35, 2.35].forEach((x) => {
    const p = new THREE.Mesh(flagPoleGeo, flagPoleMat);
    p.position.set(x, 1.1, -trackLength);
    p.castShadow = true;
    scene.add(p);
  });
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.3, roughness: 0.5 });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.34, 0.06), bannerMat);
  banner.position.set(0, 2.15, -trackLength);
  scene.add(banner);

  // ---------- the car ----------
  // Starts as an empty group; the real Fiat Punto model (assets/models/fiat-punto.glb,
  // repainted black) loads in asynchronously and drops itself in here. If it
  // can't be loaded for any reason, a simple stylized fallback car is used
  // instead so the panel never shows an empty road.
  const car = new THREE.Group();
  car.userData.wheels = [];
  scene.add(car);
  loadRealCar(car);

  function loadRealCar(target) {
    const MODEL_URL = 'assets/models/fiat-punto.glb';
    const WHEEL_NODE_PAIRS = [
      ['Object_58', 'Object_61'],
      ['Object_66', 'Object_69'],
      ['Object_74', 'Object_77'],
      ['Object_82', 'Object_85'],
    ];

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
          model.updateMatrixWorld(true);

          model.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = false;
            }
          });

          const wheelPivots = WHEEL_NODE_PAIRS
            .map((pair) => makeWheelPivot(model, pair))
            .filter(Boolean);

          target.add(model);
          target.userData.wheels = wheelPivots.length ? wheelPivots : target.userData.wheels;
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

  function makeWheelPivot(model, nodeNames) {
    const nodes = nodeNames.map((n) => model.getObjectByName(n)).filter(Boolean);
    if (nodes.length < 2) return null;
    const parent = nodes[0].parent;
    if (!parent) return null;

    const box = new THREE.Box3();
    nodes.forEach((n) => box.expandByObject(n));
    const worldCenter = new THREE.Vector3();
    box.getCenter(worldCenter);

    const pivot = new THREE.Group();
    parent.add(pivot);
    pivot.position.copy(parent.worldToLocal(worldCenter.clone()));

    nodes.forEach((n) => pivot.attach(n));
    return pivot;
  }

  function useFallback(target) {
    const fallback = buildFallbackCar();
    target.add(fallback);
    target.userData.wheels = fallback.userData.wheels;
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

    // lower body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.5, 3.5), body);
    lower.position.y = 0.5;
    lower.castShadow = true;
    grp.add(lower);

    // hood (front, slightly lower/tapered)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.05), body);
    hood.position.set(0, 0.78, 1.28);
    hood.castShadow = true;
    grp.add(hood);

    // trunk (rear)
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.7), body);
    trunk.position.set(0, 0.8, -1.35);
    trunk.castShadow = true;
    grp.add(trunk);

    // cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.56, 1.75), body);
    cabin.position.set(0, 1.12, -0.15);
    cabin.castShadow = true;
    grp.add(cabin);

    // windshield (tilted)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.5, 0.06), glass);
    windshield.position.set(0, 1.12, 0.72);
    windshield.rotation.x = THREE.MathUtils.degToRad(24);
    grp.add(windshield);

    // rear window (tilted)
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.46, 0.06), glass);
    rearWindow.position.set(0, 1.12, -1.02);
    rearWindow.rotation.x = THREE.MathUtils.degToRad(-26);
    grp.add(rearWindow);

    // side windows
    [-0.735, 0.735].forEach((x) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 1.35), glass);
      sw.position.set(x, 1.14, -0.1);
      grp.add(sw);
    });

    // bumpers
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.28, 0.22), trim);
    bumperF.position.set(0, 0.36, 1.78);
    grp.add(bumperF);
    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.28, 0.22), trim);
    bumperR.position.set(0, 0.36, -1.78);
    grp.add(bumperR);

    // headlights / taillights
    [-0.62, 0.62].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), headlight);
      hl.position.set(x, 0.56, 1.78);
      grp.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), taillight);
      tl.position.set(x, 0.6, -1.79);
      grp.add(tl);
    });

    // grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.05), trim);
    grille.position.set(0, 0.56, 1.8);
    grp.add(grille);

    // mirrors
    [-0.88, 0.88].forEach((x) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.2), trim);
      m.position.set(x, 1.02, 0.55);
      grp.add(m);
    });

    // door handles + crease line (visual detail via thin trim strips)
    const crease = new THREE.Mesh(new THREE.BoxGeometry(1.685, 0.03, 3.2), trim);
    crease.position.set(0, 0.66, -0.05);
    grp.add(crease);

    // wheels
    const wheelPositions = [
      [-0.86, 0.34, 1.1], [0.86, 0.34, 1.1],
      [-0.86, 0.34, -1.15], [0.86, 0.34, -1.15],
    ];
    const wheels = [];
    wheelPositions.forEach(([x, y, z]) => {
      const wGrp = new THREE.Group();
      const tireMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20), tire);
      tireMesh.rotation.z = Math.PI / 2;
      tireMesh.castShadow = true;
      const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.23, 12), rim);
      rimMesh.rotation.z = Math.PI / 2;
      wGrp.add(tireMesh, rimMesh);
      wGrp.position.set(x, y, z);
      grp.add(wGrp);
      wheels.push(wGrp);
    });

    grp.userData.wheels = wheels;
    grp.position.y = 0.03;
    return grp;
  }

  // ---------- state ----------
  let progressPct = 0;
  let displayZ = 0;
  let camAngle = 0;
  let finished = false;
  let sparkles = null;

  function setProgress(pct) {
    progressPct = Math.max(0, Math.min(100, pct));
    finished = progressPct >= 100;
    flags.forEach((grp) => {
      const reached = (grp.userData.n / totalParcelas) * 100 <= progressPct + 0.001;
      grp.userData.flag.material.color.set(reached ? 0xd4af37 : 0x9aa1ad);
    });
    if (finished && !sparkles) spawnSparkles();
    if (!finished && sparkles) { scene.remove(sparkles); sparkles = null; }
  }

  function spawnSparkles() {
    const count = 90;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2.4;
      positions[i * 3 + 1] = Math.random() * 0.4;
      positions[i * 3 + 2] = -trackLength + (Math.random() - 0.5) * 2.4;
      speeds[i] = 0.4 + Math.random() * 0.9;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffd873, size: 0.09, transparent: true, opacity: 0.9 });
    sparkles = new THREE.Points(geo, mat);
    sparkles.userData.speeds = speeds;
    scene.add(sparkles);
  }

  const targetZ = () => -((progressPct / 100) * (trackLength - finishMargin));

  const clock = new THREE.Clock();

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    displayZ += (targetZ() - displayZ) * Math.min(dt * 2.2, 1);
    car.position.z = displayZ;
    car.position.y = 0.03 + Math.sin(t * 1.6) * 0.008;

    const speedFactor = Math.abs(targetZ() - displayZ) > 0.01 ? 3.2 : 0.35;
    car.userData.wheels.forEach((w) => { w.rotation.x -= dt * speedFactor * 3; });

    camAngle += dt * 0.12;
    const radius = 5.1;
    const camX = Math.sin(camAngle) * radius * 0.55 + 2.1;
    const camZ = car.position.z + Math.cos(camAngle) * radius * 0.4 + 4.4;
    camera.position.set(camX, 2.5, camZ);
    camera.lookAt(car.position.x, 0.7, car.position.z - 1.1);

    if (sparkles) {
      const pos = sparkles.geometry.attributes.position;
      const speeds = sparkles.userData.speeds;
      for (let i = 0; i < speeds.length; i++) {
        let y = pos.getY(i) + dt * speeds[i];
        if (y > 1.6) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      sparkles.rotation.y += dt * 0.15;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }

  let raf = requestAnimationFrame(animate);

  function resize() {
    width = container.clientWidth || width;
    height = container.clientHeight || height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('resize', resize);

  function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('resize', resize);
    renderer.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
  }

  return { setProgress, destroy };
}
