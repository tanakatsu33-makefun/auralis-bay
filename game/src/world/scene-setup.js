// Creates the renderer, scene, city, sky, ocean and lights, and returns the handles the loop needs.
import * as THREE from 'three';
import { G } from '../core/game-state.js';
import { generateCity } from './city-generator.js';
import { buildCityMeshes } from './city-meshes.js';
import { buildStreetProps } from './street-props.js';
import { createSky, createOcean, skyUniforms } from './sky-dome.js';
import { createLighting, followShadow } from './lighting-rig.js';
import { createBloomPass } from '../fx/bloom-pass.js';

export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 5000);
  scene.add(camera);

  generateCity();
  scene.add(createSky());
  const ocean = createOcean();
  scene.add(ocean);
  scene.add(buildCityMeshes());
  const props = buildStreetProps();
  scene.add(props);
  createLighting(scene);

  const post = createBloomPass(renderer);
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    post.resize();
  });

  G.three = { scene, camera, renderer, post, props };

  return {
    scene, camera, renderer, post,
    tick(dt, focusX, focusZ) {
      skyUniforms.uTime.value += dt;
      props.userData.wheel.rotation.z += dt * 0.08;
      followShadow(focusX, focusZ);
    },
    render() {
      post.render(scene, camera);
    },
  };
}
