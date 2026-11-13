import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const config = window.__HORSE_CONFIG__;
const send = (type, payload = {}) => {
  const text = JSON.stringify({ channel: config.channel, type, payload });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
  else window.parent.postMessage(text, '*');
};
let renderer,
  controls,
  asset,
  rig,
  markers,
  observer,
  disposed = false,
  ready = false,
  localScale = 1;
const geometries = new Set(),
  materials = new Set(),
  textures = new Set();
const disposeObject = (root) => {
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
};
function dispose() {
  if (disposed) return;
  disposed = true;
  observer?.disconnect();
  controls?.dispose();
  if (rig) disposeObject(rig);
  if (markers) disposeObject(markers);
  geometries.forEach((x) => x.dispose());
  materials.forEach((x) => x.dispose());
  textures.forEach((x) => {
    x.dispose();
    x.source?.data?.close?.();
  });
  renderer?.dispose();
}
window.__disposeHorse = dispose;
window.addEventListener('pagehide', dispose);
(async () => {
  try {
    const host = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f3f6f5');
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100),
      target = new THREE.Vector3(0, 1.32, 0);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 13;
    controls.minPolarAngle = 0.18;
    controls.maxPolarAngle = Math.PI * 0.8;
    controls.target.copy(target);
    scene.add(new THREE.HemisphereLight('#ffffff', '#b9b4a5', 2.2));
    const key = new THREE.DirectionalLight('#fff4e6', 2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#e4efff', 1.3);
    fill.position.set(-4, 3, -3);
    scene.add(fill);
    const render = () => {
      if (ready && !disposed) renderer.render(scene, camera);
    };
    controls.addEventListener('change', render);
    const setView = (view) => {
      const distance = Math.max(6.1, 4.5 / Math.max(0.55, camera.aspect));
      const directions = {
        overview: [1, 0.12, 0.38],
        left: [1, 0.06, 0],
        right: [-1, 0.06, 0],
        front: [0, 0.06, 1],
        back: [0, 0.06, -1],
      };
      camera.position.copy(
        new THREE.Vector3(...(directions[view] || directions.overview))
          .normalize()
          .multiplyScalar(distance)
          .add(target),
      );
      controls.update();
      render();
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      render();
    };
    observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const markerGroup = new THREE.Group();
    markers = markerGroup;
    const setMarker = (location) => {
      for (const child of [...markerGroup.children]) {
        child.geometry?.dispose();
        child.material?.dispose();
        markerGroup.remove(child);
      }
      if (!location) {
        render();
        return;
      }
      const point = new THREE.Vector3(...location.point),
        normal = new THREE.Vector3(...location.normal).normalize();
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.055 / localScale, 20, 16),
        new THREE.MeshBasicMaterial({ color: config.canPick ? '#7c3aed' : '#dc443b' }),
      );
      pin.position.copy(point.addScaledVector(normal, 0.018 / localScale));
      markerGroup.add(pin);
      render();
    };
    const buffer = Uint8Array.from(atob(config.model), (c) => c.charCodeAt(0)).buffer;
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    if (disposed) {
      disposeObject(gltf.scene);
      geometries.forEach((x) => x.dispose());
      materials.forEach((x) => x.dispose());
      textures.forEach((x) => {
        x.dispose();
        x.source?.data?.close?.();
      });
      return;
    }
    asset = gltf.scene;
    const surfaces = [],
      selectable = new Set();
    asset.traverse((object) => {
      if (!object.isMesh) return;
      surfaces.push(object);
      if (gltf.parser.associations.get(object)?.meshes === 0) selectable.add(object);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (selectable.has(object)) {
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          material.roughness = Math.max(0.8, material.roughness ?? 0.8);
        } else if (material.transparent) {
          material.alphaTest = 0.35;
          material.depthWrite = true;
        }
      }
    });
    if (!selectable.size) throw new Error('Wrong body mesh');
    rig = new THREE.Group();
    rig.add(asset);
    rig.rotation.y = Math.PI / 2;
    rig.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(rig, true),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Invalid bounds');
    localScale = 2.6 / size.y;
    rig.scale.setScalar(localScale);
    rig.position.set(-center.x * localScale, -bounds.min.y * localScale, -center.z * localScale);
    rig.updateMatrixWorld(true);
    scene.add(rig);
    asset.add(markerGroup);
    ready = true;
    setView(
      config.marker?.side === 'right'
        ? 'right'
        : config.marker?.side === 'left'
          ? 'left'
          : config.marker?.regionId === 'head'
            ? 'front'
            : config.marker?.regionId === 'hindquarters'
              ? 'back'
              : 'overview',
    );
    setMarker(config.marker);
    send('ready');
    document.getElementById('status').textContent = 'Kéo để xoay · Chụm hai ngón để phóng to';
    for (const button of document.querySelectorAll('[data-view]'))
      button.onclick = () => setView(button.dataset.view);
    let mode = 'view',
      start = null;
    const pointers = new Set(),
      raycaster = new THREE.Raycaster();
    const mark = document.getElementById('mark');
    mark.hidden = !config.canPick;
    mark.onclick = () => {
      mode = mode === 'mark' ? 'view' : 'mark';
      mark.textContent = mode === 'mark' ? 'Đang đánh dấu' : 'Đánh dấu vị trí';
      mark.setAttribute('aria-pressed', String(mode === 'mark'));
    };
    renderer.domElement.addEventListener('pointerdown', (event) => {
      pointers.add(event.pointerId);
      start =
        pointers.size === 1
          ? { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
          : null;
    });
    renderer.domElement.addEventListener('pointerup', (event) => {
      const tap =
        mode === 'mark' &&
        start?.id === event.pointerId &&
        event.button === 0 &&
        pointers.size === 1 &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8 &&
        event.timeStamp - start.time < 650;
      start = null;
      pointers.delete(event.pointerId);
      if (!tap || !ready) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(surfaces, false)[0];
      if (!hit || !selectable.has(hit.object)) {
        send('miss');
        return;
      }
      const point = asset.worldToLocal(hit.point.clone()),
        worldNormal = hit.face.normal
          .clone()
          .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      const normal = worldNormal
        .applyMatrix3(new THREE.Matrix3().getNormalMatrix(asset.matrixWorld).invert())
        .normalize();
      const location = { point: point.toArray(), normal: normal.toArray() };
      setMarker(location);
      send('pick', location);
    });
    renderer.domElement.addEventListener('pointercancel', (event) => {
      pointers.delete(event.pointerId);
      start = null;
    });
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      ready = false;
      send('error');
      dispose();
    });
    const command = (event) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message?.channel !== config.channel) return;
        if (message.command === 'marker') setMarker(message.value);
        if (message.command === 'dispose') dispose();
      } catch {}
    };
    window.addEventListener('message', command);
    document.addEventListener('message', command);
  } catch {
    document.getElementById('status').textContent = 'Không tải được mô hình 3D';
    send('error');
    dispose();
  }
})();
