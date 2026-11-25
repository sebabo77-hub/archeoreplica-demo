// Archeoreplica — dwa małe elementy 3D na stronie głównej (Three.js):
//  1. replika z poroża, którą można obracać (sekcja „Repliki”),
//  2. przekrój wykopu z czterema krokami współpracy (sekcja „Dla inwestora”).
// Każdy uruchamia się dopiero, gdy wejdzie w pole widzenia, i rysuje tylko wtedy, gdy go widać.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TEX = '../demo-3d/assets/tex/';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function makeRenderer(canvas) {
  try { const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.outputColorSpace = THREE.SRGBColorSpace; return r; }
  catch (e) { return null; }
}
function lazy(el, start) {                                    // start() zwraca funkcję klatki (dt, czyWidoczny)
  let frame = null, visible = false, raf = 0, last = 0;
  const loop = (t) => { const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; frame(dt); if (visible) raf = requestAnimationFrame(loop); };
  new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible && !frame) frame = start();
    if (visible && frame) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { rootMargin: '200px 0px' }).observe(el);
}
function fit(renderer, camera, canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}

/* ═════════ 1. Replika z poroża ═════════ */
const rep = document.querySelector('[data-replika]');
if (rep) lazy(rep, () => {
  const canvas = rep.querySelector('canvas'), renderer = makeRenderer(canvas);
  if (!renderer) { rep.classList.add('no-3d'); return () => {}; }
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
  camera.position.set(0, 0, 7.2);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
  const key = new THREE.DirectionalLight('#fff0d8', 2.4); key.position.set(-3.5, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight('#cfe0ff', 1.1); rim.position.set(4, 2, -4); scene.add(rim);    // chłodna kontra, żeby krawędzie się odcinały
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a6a48', .5));

  // tekstura poroża: plik z generatora obrazów, a gdy go nie ma, wzór liczony w przeglądarce
  const procTex = () => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#d9c7a4'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(${90 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},${30 + Math.random() * 30 | 0},${.04 + Math.random() * .1})`; x.lineWidth = .6 + Math.random() * 1.6; const px = Math.random() * 512, py = Math.random() * 512, len = 30 + Math.random() * 120; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + len * .3, py + (Math.random() - .5) * 8, px + len * .6, py + (Math.random() - .5) * 8, px + len, py + (Math.random() - .5) * 10); x.stroke(); }
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(70,45,25,${Math.random() * .16})`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.4, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 2.4); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const antler = new THREE.MeshStandardMaterial({ color: '#ddd4c8', map: procTex(), roughness: .62, metalness: 0, envMapIntensity: .7 });
  new THREE.TextureLoader().load('assets/3d/porozec-tekstura.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; antler.map = t; antler.needsUpdate = true; }, undefined, () => {});
  const core = new THREE.MeshStandardMaterial({ color: '#efe3cb', roughness: .9, metalness: 0, envMapIntensity: .4 });
  const flint = new THREE.MeshStandardMaterial({ color: '#15171b', roughness: .16, metalness: .1, envMapIntensity: 1.5, flatShading: true });

  const pivot = new THREE.Group(); scene.add(pivot);
  new GLTFLoader().load('assets/3d/oprawa-z-poroza.glb', (g) => {
    // Model niesie własne tekstury wypalone w Blenderze (kolor, chropowatość, wypukłości); dokładamy zacienienie zagłębień.
    const tl = new THREE.TextureLoader(), ao = (f) => { const t = tl.load(f); t.flipY = false; return t; };
    const aoBody = ao('assets/3d/oprawa-ao.jpg'), aoBlade = ao('assets/3d/ostrze-ao.jpg');
    g.scene.traverse((o) => {
      if (!o.isMesh) return; const m = o.material, isFlint = m.name === 'krzemien';
      m.aoMap = isFlint ? aoBlade : aoBody; m.aoMapIntensity = isFlint ? .9 : 1.25; m.envMapIntensity = isFlint ? 1.5 : .5;
      if (isFlint) { m.color.set('#77777d'); if (m.normalMap) m.normalScale.set(.8, .8); }
      else {                                                    // kolor z fotograficznej tekstury poroża (Codex); wypalony wzór był zbyt regularny
        const t = tl.load('assets/3d/porozec-tekstura.jpg'); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.6, 2.6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
        m.map = t; m.color.set('#e9dfd0'); if (m.normalMap) m.normalScale.set(.45, .45);
      }
      m.needsUpdate = true;
    });
    g.scene.position.set(0, 0, .25); pivot.add(g.scene); rep.classList.add('is-ready');
  }, undefined, () => rep.classList.add('no-3d'));

  // obracanie: przeciągnięcie myszą lub palcem w poziomie; pion zostaje dla przewijania strony
  const rot = { x: 1.0, y: -.5, tx: 1.0, ty: -.5 }; let dragging = false, lx = 0, ly = 0, touched = false;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; touched = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); rep.classList.add('is-used'); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; rot.ty += (e.clientX - lx) * .01; rot.tx = clamp(rot.tx + (e.clientY - ly) * .006, .15, 1.5); lx = e.clientX; ly = e.clientY; });
  const end = () => { dragging = false; }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { rot.ty -= .3; touched = true; } if (e.key === 'ArrowRight') { rot.ty += .3; touched = true; } });

  // punkty na modelu: współrzędne w układzie modelu, widok, który je pokazuje, i podpis
  const SPOTS = {
    otwor: { p: new THREE.Vector3(0, .3, 0), view: [1.3, 0] },
    ostrze: { p: new THREE.Vector3(0, .05, -1.75), view: [.85, Math.PI] },
    ramie: { p: new THREE.Vector3(1.2, .05, .7), view: [.7, -2.1] },
  };
  const dots = [...rep.querySelectorAll('[data-spot-dot]')], items = [...rep.querySelectorAll('[data-spot]')], out = rep.querySelector('.replika3d__out');
  const pick = (k) => { const s = SPOTS[k]; if (!s) return; touched = true; rot.tx = s.view[0]; rot.ty = s.view[1] + Math.round((rot.ty - s.view[1]) / (Math.PI * 2)) * Math.PI * 2;
    items.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.spot === k))); dots.forEach((d) => d.classList.toggle('is-on', d.dataset.spotDot === k));
    out.textContent = items.find((b) => b.dataset.spot === k).dataset.txt; rep.classList.add('is-used'); };
  items.forEach((b) => b.addEventListener('click', () => pick(b.dataset.spot)));
  dots.forEach((d) => d.addEventListener('click', () => pick(d.dataset.spotDot)));

  const v = new THREE.Vector3();
  return (dt) => {
    fit(renderer, camera, canvas);
    if (!touched && !reduce) rot.ty += dt * .35;                // powolny obrót, dopóki nikt nie dotknął
    rot.x += (rot.tx - rot.x) * Math.min(1, dt * 6); rot.y += (rot.ty - rot.y) * Math.min(1, dt * 6);
    pivot.rotation.set(rot.x, rot.y, 0, 'XYZ');
    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    dots.forEach((d) => {                                       // kropki jadą za punktami modelu
      const s = SPOTS[d.dataset.spotDot]; v.copy(s.p); v.z += .25; pivot.localToWorld(v); const depth = v.z; v.project(camera);
      d.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px)`; d.style.opacity = depth > -.9 ? 1 : .18;
    });
  };
});

/* ═════════ 2. Przekrój wykopu z krokami współpracy ═════════ */
const str = document.querySelector('[data-strata]');
if (str) lazy(str, () => {
  const canvas = str.querySelector('canvas'), renderer = makeRenderer(canvas);
  if (!renderer) { str.classList.add('no-3d'); return () => {}; }
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 60);
  camera.position.set(0, 2.2, 13.5); camera.lookAt(0, -.2, 0);
  const load = (f) => { const t = new THREE.TextureLoader().load(TEX + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const W = 8.4, H = 3.6, D = 2.6;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tBrick: { value: load('castle_brick_broken_06_diffuse.jpg') }, tSand: { value: load('gravelly_sand_diffuse.jpg') }, tClay: { value: load('muddy_tracks_diffuse.jpg') }, tSoil: { value: load('excavated_soil_wall_diffuse.jpg') }, tMud: { value: load('brown_mud_02_diffuse.jpg') }, uActive: { value: 0 } },
    vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */`
      varying vec3 vP; varying vec3 vN; uniform sampler2D tBrick, tSand, tClay, tSoil, tMud; uniform float uActive;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 a = abs(vN.x) > .5 ? vec2(vP.z + 9., vP.y) : vec2(vP.x, vP.y);
        vec3 c;
        if (vN.y > .5) c = texture2D(tSand, vP.xz / 2.6).rgb * vec3(1.05, 1., .92);                 // powierzchnia
        else {
          float d = ${(H / 2).toFixed(2)} - vP.y + (vnoise(vec2(a.x * .9, 4.)) - .5) * .45;     // głębokość z falującą granicą
          vec2 uv = a / 2.4; float k = d / ${H.toFixed(2)} * 4.;                                 // 4 warstwy = 4 kroki
          float i = clamp(floor(k), 0., 3.);
          vec3 l0 = texture2D(tBrick, uv * 1.2).rgb * .82, l1 = texture2D(tSand, uv).rgb * vec3(1.2,1.14,1.), l2 = texture2D(tClay, uv).rgb * vec3(1.5,1.28,1.08), l3 = texture2D(tSoil, uv).rgb;
          c = i < .5 ? l0 : i < 1.5 ? l1 : i < 2.5 ? l2 : l3;
          c *= mix(.6, 1., smoothstep(0., .08, fract(k)));                                         // ciemna granica warstwy
          float on = smoothstep(i + .9, i + 1.1, uActive);                                         // warstwa „odsłonięta” kolejnym krokiem
          c = mix(c * .42 + vec3(.1,.07,.05), c, on);
          c *= abs(vN.x) > .5 ? .72 : 1.;
        }
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const block = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat); const pivot = new THREE.Group(); pivot.add(block); scene.add(pivot);
  // łata miernicza przy narożniku
  const rc = document.createElement('canvas'); rc.width = 8; rc.height = 64; const rx = rc.getContext('2d'); rx.fillStyle = '#f6f1e8'; rx.fillRect(0, 0, 8, 64); rx.fillStyle = '#b8402e'; rx.fillRect(0, 0, 8, 32);
  const rt = new THREE.CanvasTexture(rc); rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, 5); rt.magFilter = THREE.NearestFilter; rt.colorSpace = THREE.SRGBColorSpace;
  const rod = new THREE.Mesh(new THREE.BoxGeometry(.14, H + 1, .05), new THREE.MeshBasicMaterial({ map: rt })); rod.position.set(-W / 2 + .5, .5, D / 2 + .04); pivot.add(rod);

  const steps = [...document.querySelectorAll('#inwestor .steps li')], tags = [...str.querySelectorAll('[data-step-tag]')];
  const v = new THREE.Vector3(); let active = 0;
  return (dt) => {
    fit(renderer, camera, canvas);
    const r = str.getBoundingClientRect(), k = clamp((innerHeight * .92 - r.top) / (innerHeight * .75), 0, 1);   // postęp przewijania sekcji
    const target = reduce ? 4 : k * 4.6;
    active += (target - active) * Math.min(1, dt * 4); mat.uniforms.uActive.value = active;
    pivot.rotation.y = -.42 + k * .5; pivot.rotation.x = .1;
    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    tags.forEach((t, i) => {                                    // etykiety kroków przypięte do warstw
      v.set(W / 2 - .2 - i * .55, H / 2 - (i + .5) * H / 4, D / 2); pivot.localToWorld(v); v.project(camera);
      t.style.transform = `translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px)`; t.classList.toggle('is-on', active > i + .9);
    });
    steps.forEach((li, i) => li.classList.toggle('is-step', active > i + .9));
  };
});
