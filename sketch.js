import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { MeshTransmissionMaterial } from "./transmission.js";
// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({
  preserveDrawingBuffer: true,
  alpha: true, // Enable alpha channel
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 2.0;

// Setup model loader
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
);
gltfLoader.setDRACOLoader(dracoLoader);
const irrimap = new THREE.TextureLoader().load(
  "src/paint.png",
  function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
  }
);
// Model cache
const modelCache = {
  data: null,
  promise: null,
};

// const renderTarget = new THREE.WebGLRenderTarget(
//   window.innerWidth,
//   window.innerHeight
// );

const transparentMaterial = new THREE.MeshPhysicalMaterial({
  transparent: true,
  opacity: 0.75,
  roughness: 0.8,
  metalness: 0.1,
  transmission: 1.0,
  thickness: 1.0,
  ior: 4.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.0,
  iridescence: true,
  clearcoat: true,
  samples: 16,
  iridescenceIOR: 1.34,
  iridescenceThickness: 40,
  dispersion: 1.0,
  side: THREE.DoubleSide,
  envMap: scene.environment,
});

const transmissionMaterial = new MeshTransmissionMaterial({
  samples: 6,
  transmissionSampler: false,
  chromaticAberration: 1.0,
  anisotropicBlur: 0.8,
  time: 0,
  distortion: 0.05,
  distortionScale: 0.5,
  temporalDistortion: 0.0,
  buffer: irrimap,
  // Physical material properties
  transparent: true,
  opacity: 0.75,
  color: new THREE.Color("white"),
  roughness: 0.2,
  metalness: 0.2,
  transmission: 1.0,
  thickness: 1.0,
  ior: 4.4,
  clearcoat: 1.0,
  clearcoatRoughness: 0.0,
  // envMapIntensity: 0.125,
  iridescence: true,
  iridescenceIOR: 1.34,
  dispersion: 0.0,
  side: THREE.DoubleSide,
  // map: irrimap,
});

// console.log(transparentMaterial);

// Load model function
async function loadModel(modelPath) {
  if (modelCache.data) {
    // Create 6 instances with different rotations and y-offsets
    for (let i = 0; i < 6; i++) {
      const instance = modelCache.data.clone();
      instance.rotation.y = (Math.PI / 3) * i;
      instance.position.y = (-3 + i) * 2; // Offset each instance by 2 units
      instance.scale.setScalar(0.5); // Scale down each instance
      scene.add(instance);
    }
    return modelCache.data;
  }

  try {
    const gltf = await gltfLoader.loadAsync(modelPath);
    modelCache.data = gltf.scene;

    // Apply custom material to all meshes
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material = transparentMaterial;
      }
    });

    // Create 6 instances with different rotations and y-offsets
    for (let i = 0; i < 6; i++) {
      const instance = gltf.scene.clone();
      instance.rotation.y = (Math.PI / 3) * i;
      instance.position.y = (-2 + i) * 2; // Offset each instance by 2 units
      instance.scale.setScalar(4); // Scale down each instance
      scene.add(instance);
    }

    return gltf.scene;
  } catch (error) {
    console.error("Error loading model:", error);
    return null;
  }
}

const ambient = new THREE.AmbientLight(0x404040, 0.3); // Darker ambient
scene.add(ambient);
// Add dramatic studio lights
const spotLight1 = new THREE.SpotLight(0xffffff, 30);
spotLight1.position.set(10, 5, 10); // Moved forward
spotLight1.angle = Math.PI / 6; // Narrow beam
spotLight1.penumbra = 0.1; // Sharp falloff
spotLight1.decay = 1.5;

const spotLight2 = new THREE.SpotLight(0xccccff, 25);
spotLight2.position.set(-8, 3, 8); // Moved forward
spotLight2.angle = Math.PI / 8;
spotLight2.penumbra = 0.2;
spotLight2.decay = 1.5;

const spotLight3 = new THREE.SpotLight(0xffffcc, 20);
spotLight3.position.set(0, -5, 5); // Moved forward
spotLight3.angle = Math.PI / 8;
spotLight3.penumbra = 0.2;
spotLight3.decay = 1.5;

scene.add(ambient);

// Add new iridescent rim lights
const iridLights = [
  { color: 0xff1493, pos: [15, 8, -12].map((num) => num * 1), intensity: 15 }, // Deep pink
  { color: 0x4b0082, pos: [-15, 12, -8].map((num) => num * 1), intensity: 12 }, // Indigo
  { color: 0x00ff7f, pos: [12, -10, -15].map((num) => num * 1), intensity: 18 }, // Spring green
  { color: 0x9400d3, pos: [-12, -8, -12].map((num) => num * 1), intensity: 10 }, // Violet
  { color: 0x00ced1, pos: [18, 0, -10].map((num) => num * 1), intensity: 20 }, // Turquoise
].map((config) => {
  const light = new THREE.SpotLight(config.color, config.intensity);
  light.position.set(...config.pos);
  light.angle = Math.PI / 8;
  light.penumbra = 0.3;
  light.decay = 1.8;
  scene.add(light);
  return light;
});

// Setup post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4, // strength
  0.5, // radius
  0.4 // threshold
);
const fxaaPass = new ShaderPass(FXAAShader);
const pixelRatio = renderer.getPixelRatio();

fxaaPass.material.uniforms["resolution"].value.x =
  1 / (window.innerWidth * pixelRatio);
fxaaPass.material.uniforms["resolution"].value.y =
  1 / (window.innerHeight * pixelRatio);
const outputPass = new OutputPass();
composer.addPass(fxaaPass);
composer.addPass(bloomPass);

composer.addPass(outputPass);

// Handle window resize
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

loadModel("./src/dispersion-test.glb").then((model) => {
  if (model) {
    // Optional: Center and scale model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 6 / maxDim; // Scale to fit in a 2x2x2 box
    model.scale.setScalar(scale);
  }
});

// Add after Scene setup
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load HDR environment map
new RGBELoader().load("src/env.hdr", function (texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  texture.dispose();
  pmremGenerator.dispose();
});

scene.background = new THREE.Color(0x000000);
scene.background.alpha = 0;

// Update renderer settings
renderer.setClearColor(0x000000, 0);
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

function animate() {
  requestAnimationFrame(animate);
  transmissionMaterial.uniforms.time.value += 1 / 60;
  controls.update();
  composer.render();
}
animate();

// Add after renderer setup
document.getElementById("saveButton").addEventListener("click", function () {
  // Render at current size
  composer.render();
  // Convert to blob and download
  renderer.domElement.toBlob(function (blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "render.png";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});
