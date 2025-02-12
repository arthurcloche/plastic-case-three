import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = "#000";
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

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
      opacity: 0.5,
      roughness: 0,
      metalness: 0,
      transmission: 1.0,
      thickness: 10.0,
      ior: 2.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.0,
      iridescence: true,
      clearcoat: true,
      //   iridescenceIOR: 1.34,
      //   iridescenceThickness: 40,
      dispersion: 1.0,
    });

    const flatMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide,
      envMapIntensity: 0.0,
    });

    // Apply custom material to all meshes
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes("case")) {
          child.material = transparentMaterial;
        } else {
          child.material = flatMaterial;
        }
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
const spotLight1 = new THREE.SpotLight(0xffffff, 50);
spotLight1.position.set(10, 5, 0);
spotLight1.angle = Math.PI / 6; // Narrow beam
spotLight1.penumbra = 0.1; // Sharp falloff
spotLight1.decay = 1.5;

const spotLight2 = new THREE.SpotLight(0xccccff, 40); // Slightly blue backlight
spotLight2.position.set(-8, 3, -8);
spotLight2.angle = Math.PI / 8;
spotLight2.penumbra = 0.2;
spotLight2.decay = 1.5;

const spotLight3 = new THREE.SpotLight(0xffffcc, 30); // Warm rim light
spotLight3.position.set(0, -5, -10);
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
  1.5, // strength
  0.4, // radius
  0.85 // threshold
);
composer.addPass(bloomPass);

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

// Usage example:
loadModel("./src/case-dispersion.glb").then((model) => {
  if (model) {
    // Optional: Center and scale model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxDim; // Scale to fit in a 2x2x2 box
    model.scale.setScalar(scale);
  }
});

// Add after Scene setup
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load environment map (using regular PNG)
new THREE.TextureLoader().load("./src/paint.png", function (texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
});

// Set black background (can be placed near scene setup)
scene.background = new THREE.Color(0x000000);

// Update renderer settings
renderer.setClearColor(0x000000, 0);
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; // Adjust this value to control the brightness
