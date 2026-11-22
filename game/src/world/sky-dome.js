// Golden-hour sky dome and the sparkling ocean. Both use one shared GLSL sky function.
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(-0.86, 0.2, 0.28).normalize(); // low sun over the western ocean
export const FOG_COLOR = 0xf2a276;

const SKY_GLSL = `
uniform vec3 uSun;
vec3 skyColor(vec3 d) {
  float h = clamp(d.y, -0.2, 1.0);
  vec3 horizon = vec3(1.0, 0.62, 0.36);
  vec3 mid = vec3(0.95, 0.34, 0.5);
  vec3 top = vec3(0.1, 0.1, 0.38);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
  c = mix(c, top, smoothstep(0.18, 0.85, h));
  float s = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.55, 0.2) * pow(s, 6.0) * 0.55;
  c += vec3(1.0, 0.85, 0.55) * pow(s, 64.0) * 0.9;
  c += vec3(1.6, 1.3, 0.9) * smoothstep(0.9993, 0.9998, s) * 3.0;
  float band = sin(d.x * 7.0 + d.z * 3.0) * sin(d.z * 11.0 - d.x * 4.0);
  c += vec3(0.5, 0.15, 0.25) * smoothstep(0.2, 0.9, band) * smoothstep(0.05, 0.3, h) * (1.0 - smoothstep(0.3, 0.6, h)) * 0.5;
  return c;
}`;

export const skyUniforms = { uSun: { value: SUN_DIR }, uTime: { value: 0 }, uFog: { value: new THREE.Color(FOG_COLOR) } };

export function createSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vDir; ${SKY_GLSL}
      void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

export function createOcean() {
  const mat = new THREE.ShaderMaterial({
    uniforms: skyUniforms, fog: false, transparent: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vW; uniform vec3 uFog; uniform float uTime; ${SKY_GLSL}
      float wave(vec2 p){ return sin(p.x*0.8+uTime*1.3)*0.5 + sin(p.y*1.1-uTime*1.7)*0.5 + sin((p.x+p.y)*2.3+uTime*2.5)*0.25; }
      void main(){
        vec3 v = normalize(vW - cameraPosition);
        vec2 p = vW.xz;
        float e = 0.35;
        vec3 n = normalize(vec3(-(wave(p+vec2(e,0.))-wave(p))*0.06, 1.0, -(wave(p+vec2(0.,e))-wave(p))*0.06));
        vec3 r = reflect(v, n);
        r.y = abs(r.y);
        float fres = pow(1.0 - clamp(dot(-v, n), 0.0, 1.0), 3.0) * 0.8 + 0.2;
        vec3 deep = vec3(0.05, 0.12, 0.3);
        vec3 col = mix(deep, skyColor(r), fres);
        float glit = pow(max(dot(r, uSun), 0.0), 220.0) * (0.6 + 0.4 * sin(p.x * 3.1 + uTime * 4.0) * sin(p.y * 2.7 - uTime * 3.0));
        col += vec3(2.0, 1.4, 0.8) * glit;
        float dist = length(vW - cameraPosition);
        col = mix(col, uFog, smoothstep(300.0, 2400.0, dist) * 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-3000 - 20, -0.6, 400);
  return sea;
}
