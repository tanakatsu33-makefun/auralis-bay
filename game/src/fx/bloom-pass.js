// Post-processing: scene -> HDR target -> bright-pass + blur chain -> tone-mapped composite with vignette.
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

function makeQuad(frag, uniforms) {
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, mat };
}

export function createBloomPass(renderer) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  const full = new THREE.WebGLRenderTarget(4, 4, { ...opts, samples: 4 });
  const half = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false });
  const quarterA = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false });
  const quarterB = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: false });

  const bright = makeQuad(`varying vec2 vUv; uniform sampler2D tex;
    void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * smoothstep(1.0, 2.6, l), 1.0); }`, { tex: { value: null } });
  const blur = makeQuad(`varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir;
    void main(){ vec3 s = texture2D(tex, vUv).rgb * 0.227;
      s += (texture2D(tex, vUv + dir * 1.38).rgb + texture2D(tex, vUv - dir * 1.38).rgb) * 0.316;
      s += (texture2D(tex, vUv + dir * 3.23).rgb + texture2D(tex, vUv - dir * 3.23).rgb) * 0.070;
      gl_FragColor = vec4(s, 1.0); }`, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
  const comp = makeQuad(`varying vec2 vUv; uniform sampler2D tex; uniform sampler2D glow; uniform float strength; uniform float flash; uniform float vig;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
    void main(){
      vec3 c = texture2D(tex, vUv).rgb + texture2D(glow, vUv).rgb * strength;
      c *= 1.05;
      c = aces(c);
      c = mix(vec3(dot(c, vec3(0.299,0.587,0.114))), c, 1.18);
      c *= vec3(1.04, 0.98, 1.06);
      vec2 q = vUv - 0.5;
      c *= 1.0 - dot(q, q) * vig;
      c += vec3(1.0, 0.2, 0.2) * flash * dot(q, q) * 1.6;
      gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
    }`, { tex: { value: null }, glow: { value: null }, strength: { value: 0.7 }, flash: { value: 0 }, vig: { value: 1.1 } });

  const size = new THREE.Vector2();
  function resize() {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(2, size.x | 0), h = Math.max(2, size.y | 0);
    full.setSize(w, h);
    half.setSize(w >> 1, h >> 1);
    quarterA.setSize(w >> 2, h >> 2);
    quarterB.setSize(w >> 2, h >> 2);
  }
  resize();

  function pass(q, src, dst) {
    q.mat.uniforms.tex.value = src;
    renderer.setRenderTarget(dst);
    renderer.render(q.scene, cam);
  }

  return {
    resize,
    uniforms: comp.mat.uniforms,
    render(scene, camera) {
      renderer.setRenderTarget(full);
      renderer.clear();
      renderer.render(scene, camera);
      pass(bright, full.texture, half);
      const tx = 1 / quarterA.width, ty = 1 / quarterA.height;
      blur.mat.uniforms.dir.value.set(tx, 0);
      pass(blur, half.texture, quarterA);
      blur.mat.uniforms.dir.value.set(0, ty);
      pass(blur, quarterA.texture, quarterB);
      blur.mat.uniforms.dir.value.set(tx * 2, 0);
      pass(blur, quarterB.texture, quarterA);
      blur.mat.uniforms.dir.value.set(0, ty * 2);
      pass(blur, quarterA.texture, quarterB);
      comp.mat.uniforms.glow.value = quarterB.texture;
      pass(comp, full.texture, null);
    },
  };
}
