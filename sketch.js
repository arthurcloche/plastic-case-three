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

// Scene setup
const scene = new THREE.Scene();
scene.background = "#000";
const camera = new THREE.PerspectiveCamera(
  90,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
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

// Model cache
const modelCache = {
  data: null,
  promise: null,
};

// Load model function
async function loadModel(modelPath) {
  if (modelCache.data) {
    scene.add(modelCache.data);
    return modelCache.data;
  }

  try {
    const gltf = await gltfLoader.loadAsync(modelPath);
    modelCache.data = gltf.scene;
    const transparentMaterial = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.75,
      roughness: 0.125,
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
      //   iridescenceThickness: 40,
      dispersion: 1.0,
      side: THREE.DoubleSide,
      envMap: scene.environment,
    });

    const flatMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.85,
      side: THREE.DoubleSide,
      envMapIntensity: 0,
      envMap: irrimap,
      //   map: irrimap,
    });

    // Apply custom material to all meshes
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // if (child.name.includes("case")) {
        child.material = transparentMaterial;
        // } else {
        //   child.material = flatMaterial;
        // }
      }
    });

    scene.add(gltf.scene);
    return gltf.scene;
  } catch (error) {
    console.error("Error loading model:", error);
    return null;
  }
}

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

scene.add(spotLight1);
scene.add(spotLight2);
scene.add(spotLight3);

// Reduce ambient light intensity for more contrast
// scene.remove(light); // Remove the original directional light
const ambient = new THREE.AmbientLight(0x404040, 0.3); // Darker ambient
scene.add(ambient);

// Position camera
camera.position.z = 5;

// Setup post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.25, // strength
  0.6, // radius
  0.5 // threshold
);
const fxaaPass = new ShaderPass(FXAAShader);
const pixelRatio = renderer.getPixelRatio();

fxaaPass.material.uniforms["resolution"].value.x =
  1 / (window.innerWidth * pixelRatio);
fxaaPass.material.uniforms["resolution"].value.y =
  1 / (window.innerHeight * pixelRatio);

composer.addPass(bloomPass);
// composer.addPass(bokehPass);
composer.addPass(fxaaPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// composer.addPass(contrastPass);

// Handle window resize
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();

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

// Load texture and apply equirectangular mapping
const irrimap = new THREE.TextureLoader().load(
  "src/paint.png",
  function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
  }
);

// Set black background (can be placed near scene setup)
scene.background = new THREE.Color(0x000000);
scene.background.alpha = 0;

// Update renderer settings
renderer.setClearColor(0x000000, 0);
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

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

// Add new iridescent rim lights
const iridLights = [
  { color: 0xff1493, pos: [15, 8, -12], intensity: 15 }, // Deep pink
  { color: 0x4b0082, pos: [-15, 12, -8], intensity: 12 }, // Indigo
  { color: 0x00ff7f, pos: [12, -10, -15], intensity: 18 }, // Spring green
  { color: 0x9400d3, pos: [-12, -8, -12], intensity: 10 }, // Violet
  { color: 0x00ced1, pos: [18, 0, -10], intensity: 20 }, // Turquoise
].map((config) => {
  const light = new THREE.SpotLight(config.color, config.intensity);
  light.position.set(...config.pos);
  light.angle = Math.PI / 8;
  light.penumbra = 0.3;
  light.decay = 1.8;
  scene.add(light);
  return light;
});
