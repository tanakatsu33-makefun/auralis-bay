// One Lambert material for every building: window grid, lit windows and glass sheen are computed in-shader.
import * as THREE from 'three';

export function createBuildingMaterial() {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp4 = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWPos = wp4.xyz;
        vWNrm = normalize(mat3(instanceMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 an = abs(vWNrm);
          if (an.y < 0.5) {
            bool alongX = an.x > 0.5;
            float u = alongX ? vWPos.z : vWPos.x;
            float seed = floor(alongX ? vWPos.x : vWPos.z);
            vec2 cell = vec2(floor(u / 3.2), floor(vWPos.y / 3.6));
            vec2 f = vec2(fract(u / 3.2), fract(vWPos.y / 3.6));
            float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.2, f.y) * step(f.y, 0.82);
            float r = h21(cell + seed * 7.3);
            float lit = step(0.5, r);
            vec3 warm = mix(vec3(1.0, 0.72, 0.32), vec3(0.6, 0.9, 1.0), h21(cell * 1.7 + seed));
            float ground = step(vWPos.y, 4.4);
            diffuseColor.rgb *= mix(1.0, 0.38, win);
            totalEmissiveRadiance += win * lit * warm * 0.85;
            totalEmissiveRadiance += win * (1.0 - lit) * vec3(0.16, 0.08, 0.14) * (0.5 + f.y);
            totalEmissiveRadiance += ground * step(0.15, f.y) * vec3(1.0, 0.5, 0.6) * 0.18 * h21(cell + 4.0);
          } else {
            diffuseColor.rgb *= 0.8;
          }
        }`);
  };
  return mat;
}
