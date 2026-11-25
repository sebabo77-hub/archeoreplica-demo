// Archeoreplica — sekcja „Dla inwestora”: cztery kroki współpracy jako scena przypięta do przewijania.
// Każdy krok ma własny fotorealistyczny kadr; kadry przechodzą w siebie w WebGL (warstwa wysuwa się od dołu),
// obraz lekko się przybliża i reaguje na mysz, żeby miał głębię. Bez WebGL albo przy „ogranicz ruch”
// zostaje zwykła lista czterech kroków.
import * as THREE from 'three';

const root = document.querySelector('[data-proc]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (root && !reduce) start();

function start() {
  const canvas = root.querySelector('canvas'), pin = root.querySelector('.proc__pin'), items = [...root.querySelectorAll('.proc__steps li')], numEl = root.querySelector('.proc__n');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false }); } catch (e) { return; }
  const FILES = ['1-analiza', '2-wniosek', '3-nadzor', '4-raport'].map((n) => 'media/proces/' + n + '.jpg');
  const loader = new THREE.TextureLoader();
  Promise.all(FILES.map((f) => new Promise((res, rej) => loader.load(f, (t) => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; res(t); }, undefined, rej))))
    .then(run).catch(() => {});                                // brak obrazów: zostaje lista

  function run(tex) {
    root.classList.add('proc--live');
    const N = tex.length;
    // klipy: kadr bieżącego kroku ożywa, gdy film się wczyta (pierwsza klatka filmu = zdjęcie, więc podmiana jest niewidoczna)
    const vids = FILES.map((f, k) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.dataset.src = f.replace('.jpg', '.mp4');
      v.addEventListener('playing', () => { if (v._tex) return; v._tex = new THREE.VideoTexture(v); v._tex.colorSpace = THREE.NoColorSpace; v._tex.image = v; v._ratio = v.videoWidth / v.videoHeight; tex[k] = v._tex; }, { once: true });
      v.addEventListener('error', () => { v._dead = true; }); return v; });
    const playStep = (i) => vids.forEach((v, k) => {
      if (k !== i || v._dead) { if (!v.paused) v.pause(); return; }
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      if (v.paused) v.play().catch(() => {});
    });
    const ratio = (t) => t.isVideoTexture ? t.image.videoWidth / t.image.videoHeight : t.image.width / t.image.height;
    const mat = new THREE.ShaderMaterial({
      uniforms: { tA: { value: tex[0] }, tB: { value: tex[1] }, uMix: { value: 0 }, uZoom: { value: 0 }, uPtr: { value: new THREE.Vector2() }, uAsp: { value: 1 }, uImg: { value: tex[0].image.width / tex[0].image.height } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: /* glsl */`
        varying vec2 vUv; uniform sampler2D tA, tB; uniform float uMix, uZoom, uAsp, uImg; uniform vec2 uPtr;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }
        vec2 cover(vec2 uv, float zoom){                          // wypełnij kadr bez zniekształceń + zbliżenie + głębia od myszy
          vec2 s = uAsp > uImg ? vec2(1., uImg / uAsp) : vec2(uAsp / uImg, 1.);
          vec2 c = (uv - .5) * s / (1.06 + zoom) + .5;
          return c + uPtr * .014 * (1.15 - uv.y);               // dół kadru (bliżej) przesuwa się mocniej
        }
        void main(){
          float n = fbm(vec2(vUv.x * 3.2, 2.7)) * .22 + fbm(vUv * 9.) * .05;
          float edge = uMix * 1.35 - (vUv.y + n);                 // następny kadr wysuwa się od dołu falistą krawędzią
          float m = smoothstep(0., .02, edge);
          vec3 a = texture2D(tA, cover(vUv + vec2(0., uMix * .06), uZoom)).rgb;
          vec3 b = texture2D(tB, cover(vUv - vec2(0., (1. - uMix) * .08), 0.)).rgb;
          vec3 c = mix(a, b, m);
          float seam = smoothstep(.0, .012, edge) * smoothstep(.05, .012, edge);
          c = mix(c, vec3(.94, .88, .78), seam * .9);            // jasna linia jak granica warstw
          c *= 1. - .22 * smoothstep(.55, 1.05, length(vUv - .5) * 1.25);   // delikatna winieta
          gl_FragColor = vec4(c, 1.);
        }`,
    });
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    root.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); ptr.x = ((e.clientX - r.left) / r.width - .5) * 2; ptr.y = -((e.clientY - r.top) / r.height - .5) * 2; });
    root.addEventListener('pointerleave', () => { ptr.x = ptr.y = 0; });

    let active = -1, visible = false, raf = 0, shown = 0;
    const setActive = (i) => { if (i === active) return; active = i; items.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); li.setAttribute('aria-current', k === i ? 'step' : 'false'); }); numEl.textContent = i + 1; playStep(i); };
    items.forEach((li, k) => li.addEventListener('click', () => {      // kliknięcie kroku przewija do niego
      const total = root.offsetHeight - pin.offsetHeight; scrollTo({ top: root.getBoundingClientRect().top + scrollY + total * (k + .25) / N, behavior: 'smooth' });
    }));

    function frame() {
      const w = canvas.clientWidth, h = canvas.clientHeight, pr = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(w * pr)) { renderer.setPixelRatio(pr); renderer.setSize(w, h, false); mat.uniforms.uAsp.value = w / h; }
      const r = root.getBoundingClientRect(), total = r.height - pin.offsetHeight;
      const p = Math.min(1, Math.max(0, -r.top / total)), f = Math.min(N - 1e-4, p * N), i = Math.floor(f), t = f - i;
      const target = i < N - 1 ? Math.min(1, Math.max(0, (t - .5) / .5)) : 0;
      const eased = target * target * (3 - 2 * target);
      shown += (i + eased - shown) * .18;                              // wygładzenie, żeby kadr nie skakał z kółkiem myszy
      const si = Math.min(N - 1, Math.floor(shown)), sm = shown - si;
      mat.uniforms.tA.value = tex[si]; mat.uniforms.tB.value = tex[Math.min(N - 1, si + 1)];
      mat.uniforms.uMix.value = si < N - 1 ? sm : 0; mat.uniforms.uZoom.value = t * .05;
      mat.uniforms.uImg.value = ratio(tex[si]);
      ptr.sx += (ptr.x - ptr.sx) * .06; ptr.sy += (ptr.y - ptr.sy) * .06; mat.uniforms.uPtr.value.set(ptr.sx, ptr.sy);
      setActive(eased > .5 ? i + 1 : i);
      root.style.setProperty('--proc-p', p.toFixed(4));
      renderer.render(scene, cam);
      if (visible) raf = requestAnimationFrame(frame);
    }
    const stage = canvas.parentElement;
    function sync() {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) {
        playStep(active);
        raf = requestAnimationFrame(frame);
      } else {
        playStep(-1);
      }
    }
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; sync(); }).observe(stage);
    document.addEventListener('visibilitychange', sync);
  }
}
