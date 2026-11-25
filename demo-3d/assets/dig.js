// Archeoreplica — próbna scena 3D „Zejdź w głąb”.
// Zasada (wzór Edolus): jedno płótno, jedna liczba postępu 0→1 steruje kamerą, zdjęciami, tekstem i światłem.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = (s) => document.querySelector(s);
const IMG = '../demo/media/img/';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function plain(why) {
  $('#plainWhy').textContent = why;
  $('#plain').hidden = false;
  $('#start').classList.add('is-gone');
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#scena'), antialias: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }

if (reduce) plain('Masz włączone ograniczanie ruchu, więc nie uruchamiam animowanej sceny 3D.');
else if (!renderer) plain('Ta przeglądarka nie obsługuje grafiki 3D potrzebnej do tej sceny.');
else init();

function init() {
  /* ───────── oś postępu ───────── */
  const stEls = [...document.querySelectorAll('.st')];
  const N = stEls.length;                                   // 6 warstw
  const sP = stEls.map((_, k) => 0.14 + 0.12 * k);          // postęp każdej warstwy
  const INV_P = 0.87;                                        // przystanek „współpraca z inwestorem”
  const sY = stEls.map((_, k) => -5 * (k + 1));             // jej wysokość w świecie
  const INV_A = 0.79, INV_B = 0.905;                         // karty współpracy: pierwsza na środku przy INV_A, ostatnia przy INV_B
  const INV_STOPS = [0, 1, 2, 3].map((k) => INV_A + (INV_B - INV_A) * k / 3);
  const STOPS = [0, ...sP, ...INV_STOPS, 1];
  const DEPTH_P = [0, 0.07, ...sP, INV_P, 1];
  const DEPTH_M = [0, 0, ...stEls.map((e) => +e.dataset.depth), 4.0, 4.2];
  const FLOOR_Y = -38;

  const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ───────── scena ───────── */
  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#dfe6e4'), DARK = new THREE.Color('#1d120b');
  scene.background = SKY.clone();
  scene.fog = new THREE.Fog(SKY.clone(), 30, 90);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // odbicia na lakierze i stali
  scene.environmentIntensity = 0.55;

  scene.add(new THREE.HemisphereLight('#f4f7ff', '#b59a72', 0.9));
  const sun = new THREE.DirectionalLight('#fff0d6', 2.6);
  sun.position.set(-14, 20, 9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 20, bottom: -20, near: 1, far: 70 });
  scene.add(sun);

  // tekstury fotograficzne (Poly Haven, CC0); wczytują się przez wspólny menedżer ładowania niżej
  const TEXDIR = 'assets/tex/';
  const lateTex = [];
  const rawTex = (file, srgb) => { const t = new THREE.Texture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; lateTex.push([t, file]); return t; };
  const tSoil = rawTex('excavated_soil_wall_diffuse.jpg'), tSoilN = rawTex('excavated_soil_wall_nor_gl.jpg');
  const tBrick = rawTex('castle_brick_broken_06_diffuse.jpg');
  const tSand = rawTex('gravelly_sand_diffuse.jpg'), tMud = rawTex('brown_mud_02_diffuse.jpg'), tClay = rawTex('muddy_tracks_diffuse.jpg');

  const uTime = { value: 0 }, uCamY = { value: 0 }, uFire = { value: 0 }, uLin = { value: 0 };

  const NOISE = /* glsl */`
    uniform float uLin;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }
  `;

  /* ściany wykopu: warstwy ziemi liczone w shaderze */
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { uLin, tBrick: { value: tBrick }, uTime, uCamY, uFire, tSoil: { value: tSoil }, tSoilN: { value: tSoilN }, tSand: { value: tSand }, tMud: { value: tMud }, tClay: { value: tClay } },
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec3 vN;
      void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      varying vec3 vW; varying vec3 vN; uniform float uCamY; uniform float uFire; uniform float uTime;
      ${NOISE}
      uniform sampler2D tBrick; uniform sampler2D tSoil; uniform sampler2D tSoilN; uniform sampler2D tSand; uniform sampler2D tMud; uniform sampler2D tClay;
      // każda warstwa: inna prawdziwa tekstura i inny odcień
      vec3 layer(float i, vec2 uv){
        if(i<.5) return texture2D(tSand, uv).rgb * vec3(.96,.88,.78);           // zasypisko pod murem
        if(i<1.5) return texture2D(tSand, uv).rgb * vec3(1.22,1.16,1.02);        // piasek
        if(i<2.5) return texture2D(tClay, uv).rgb * vec3(1.55,1.30,1.10);        // glina
        if(i<3.5) return texture2D(tSoil, uv).rgb * vec3(.95,.92,.88);           // ił
        if(i<4.5) return texture2D(tMud, uv).rgb * vec3(.52,.46,.42);            // warstwa spalenizny
        if(i<5.5) return texture2D(tSand, uv).rgb * vec3(1.40,1.38,1.30);        // jasny less
        if(i<6.5) return mix(texture2D(tMud, uv).rgb, vec3(.5), .35) * 1.15;     // żwir
        return texture2D(tSoil, uv).rgb * vec3(1.25,1.12,.92);                   // calec
      }
      vec3 layerAT(float i, vec2 uv){                                           // dwie skale, żeby nie było widać powtórzeń
        float m = smoothstep(.35, .65, fbm(uv * .7 + i * 3.1));
        return mix(layer(i, uv), layer(i, uv * .43 + vec2(.37, .11)), m);
      }
      void main(){
        vec2 along = abs(vN.x) > .5 ? vec2(vW.z + 11., vW.y) : vec2(vW.x, vW.y);
        float d = -vW.y;
        float wob = (fbm(vec2(along.x * .22, 3.7)) - .5) * 2.6 + (fbm(along * .9) - .5) * .5;
        float f = (d + 2.5 + wob) / 5.;
        float i = clamp(floor(f), 0., 7.);
        float fr = fract(f);
        vec2 uv = along / 3.4;
        vec3 c = mix(layerAT(max(i - 1., 0.), uv), layerAT(i, uv), smoothstep(0., .05, fr));
        c *= mix(.62, 1., smoothstep(0., .03, fr));                          // ciemna granica warstwy
        c *= .82 + .36 * fbm(along * 1.3 + i * 5.);                          // plamy wilgoci
        vec3 n = texture2D(tSoilN, uv * 1.3).xyz * 2. - 1.;                  // rzeźba powierzchni z mapy normalnych
        c *= .62 + .62 * clamp(dot(normalize(n), normalize(vec3(.25, .8, .55))), 0., 1.);
        float relief = .62 + .62 * clamp(dot(normalize(n), normalize(vec3(.25, .8, .55))), 0., 1.);
        float bEdge = 2.7 + fbm(vec2(along.x * .7, 9.1)) * 2.6;              // ceglany mur piwnicy u góry, z wyszczerbionym dołem
        vec3 brick = texture2D(tBrick, along / 2.7).rgb; brick = mix(vec3(dot(brick, vec3(.333))), brick, .55) * vec3(.86, .8, .76) * relief;   // przygaszona jak na zdjęciu
        c = mix(c, brick, smoothstep(bEdge + .22, bEdge - .1, d));
        float amb = mix(.66, .3, smoothstep(0., 30., d));                    // światło rozproszone słabnie z głębokością
        float lit = 0.;                                                      // słońce z lewej-przodu rzuca ukośną granicę cienia
        if (vN.z > .5) lit = smoothstep(0., .9, (vW.x + 6.) / .7 - d);
        else if (vN.x < -.5) lit = smoothstep(0., .9, (3. - vW.z) / .45 - d);
        float light = amb + .6 * lit * smoothstep(20., 2., d);
        light += .34 * exp(-abs(vW.y - uCamY) * .22);                        // „czołówka” przy kamerze
        c *= light;
        float fire = uFire * exp(-max(vW.y + 38., 0.) * .32) * (.85 + .15 * sin(uTime * 9.) * sin(uTime * 5.3));
        c += vec3(1., .5, .16) * fire * .5;
        if (uLin > .5) c = pow(c, vec3(2.2)); gl_FragColor = vec4(c, 1.);
      }`,
  });
  const PIT = { w: 12, d: 6, h: 38 };
  const mkWall = (w, pos, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, PIT.h), wallMat); m.position.copy(pos); m.rotation.y = rotY; scene.add(m); };
  mkWall(PIT.w, new THREE.Vector3(0, -PIT.h / 2, -PIT.d / 2), 0);
  mkWall(PIT.w, new THREE.Vector3(0, -PIT.h / 2, PIT.d / 2), Math.PI);
  mkWall(PIT.d, new THREE.Vector3(-PIT.w / 2, -PIT.h / 2, 0), Math.PI / 2);
  mkWall(PIT.d, new THREE.Vector3(PIT.w / 2, -PIT.h / 2, 0), -Math.PI / 2);

  function groundTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#e9e2d4'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 105 | 0; x.fillStyle = `rgba(${v},${v - 12},${v - 34},${.25 + Math.random() * .4})`; const r = Math.random() * 2.2 + .4; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, r, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(120,96,62,${.05 + Math.random() * .06})`; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 50, 14 + Math.random() * 24, Math.random() * 3, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(.09, .09); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  /* powierzchnia z otworem wykopu */
  const shape = new THREE.Shape();
  shape.moveTo(-70, -70); shape.lineTo(70, -70); shape.lineTo(70, 70); shape.lineTo(-70, 70); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-6, -3); hole.lineTo(-6, 3); hole.lineTo(6, 3); hole.lineTo(6, -3); hole.closePath();
  shape.holes.push(hole);
  // Zdjęcie wykopu jest rzutowane z kamery startowej na tło i na podłoże, więc tworzą jeden obraz.
  const projCam = new THREE.PerspectiveCamera(61.3, 1920 / 936, .1, 300);   // szerzej niż kamera, żeby zdjęcie pokrywało też ekrany 21:9
  projCam.position.set(-3.5, 3.4, 15.5); projCam.lookAt(-4.2, 4.6, -3); projCam.updateMatrixWorld();
  const uProj = { value: new THREE.Matrix4().multiplyMatrices(projCam.projectionMatrix, projCam.matrixWorldInverse) };
  const uPhoto = { value: null }, uSkyU = { value: SKY };
  const groundTile = rawTex('grunt_ze_zdjecia.jpg');
  const PROJ_VERT = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const PROJ_COMMON = `uniform float uLin; varying vec3 vW; uniform mat4 uProj; uniform sampler2D uPhoto; uniform vec3 uSky;
    vec2 projUv(out float w){ vec4 q = uProj * vec4(vW, 1.); w = q.w; return q.xy / q.w * .5 + .5; }
    float haze(vec2 uv){ return .1 + .58 * smoothstep(.3, .92, uv.y); }`;
  const groundGeo = new THREE.ShapeGeometry(shape);
  const ground = new THREE.Mesh(groundGeo, new THREE.ShaderMaterial({
    uniforms: { uLin, uProj, uPhoto, uSky: uSkyU, tTile: { value: groundTile } },
    vertexShader: PROJ_VERT,
    fragmentShader: PROJ_COMMON + `uniform sampler2D tTile;
      void main(){ float w; vec2 uv = projUv(w);
        vec3 tile = texture2D(tTile, vW.xz * .16).rgb;
        float inside = step(0., w) * smoothstep(-.9, -.25, uv.y) * smoothstep(-.6, -.1, uv.x) * smoothstep(1.6, 1.1, uv.x);
        vec3 c = mix(tile, texture2D(uPhoto, uv).rgb, inside);
        c = mix(c, uSky, haze(uv) * inside + .1 * (1. - inside));
        if (uLin > .5) c = pow(c, vec3(2.2)); gl_FragColor = vec4(c, 1.); }`,
  }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  // osobna, przezroczysta warstwa, która tylko łapie cienie koparki i hałd
  const shadowCatcher = new THREE.Mesh(groundGeo, new THREE.ShadowMaterial({ opacity: .42 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = .015; shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);
  // obmurowanie krawędzi wykopu: resztki ceglanego muru o nierównej wysokości
  const curbMap = rawTex('castle_brick_broken_06_diffuse.jpg', true); curbMap.repeat.set(.42, .2);
  const curbMat = new THREE.MeshStandardMaterial({ color: '#8a827c', map: curbMap, roughness: 1, metalness: 0, envMapIntensity: 0 });
  const curb = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 1.15), along = x0 !== x1;
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, r = Math.abs(Math.sin((x0 + z0 * 3 + i) * 12.9898) * 43758.5453) % 1;
      const hgt = .1 + r * .34, seg = len / n * (.9 + r * .16);
      const m = new THREE.Mesh(new THREE.BoxGeometry(along ? seg : .52, hgt, along ? .52 : seg), curbMat);
      m.position.set(x0 + (x1 - x0) * t, hgt / 2 - .04, z0 + (z1 - z0) * t); m.rotation.y = (r - .5) * .05;
      m.castShadow = m.receiveShadow = true; scene.add(m);
    }
  };
  curb(-6.26, -3.26, 6.26, -3.26); curb(-6.26, -2.7, -6.26, 2.7); curb(6.26, -2.7, 6.26, 2.7);   // od strony kamery bez muru, żeby było widać wnętrze
  // hałda urobku przy wykopie
  const heapMap = rawTex('grunt_ze_zdjecia.jpg', true); heapMap.repeat.set(3, 1.5);
  const heapMat = new THREE.MeshStandardMaterial({ color: '#f3ead8', map: heapMap, roughness: 1, metalness: 0, envMapIntensity: .2 });
  [] /* hałdy wyłączone: na zdjęciu w tle jest już prawdziwy urobek */.forEach(([x, z, r, h]) => {
    const g = new THREE.ConeGeometry(r, h, 28, 8); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .16 * Math.sin(a * 3 + r) + .09 * Math.sin(a * 7 + y * 4) + .05 * Math.sin(y * 9 + a * 2); p.setXYZ(i, x * k, y * (1 - .12 * Math.cos(a * 2 + r)), z * k); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, heapMat); m.position.set(x, h / 2 - .12, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  });

  /* ───────── ładowanie ───────── */
  const manager = new THREE.LoadingManager();
  const texLoader = new THREE.TextureLoader(manager);
  lateTex.forEach(([t, file]) => new THREE.ImageLoader(manager).load(TEXDIR + file, (img) => { t.image = img; t.needsUpdate = true; }));
  const tex = (file) => { const t = texLoader.load(IMG + file); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t; };

  // zdjęcie wykopu w mieście jako tło na powierzchni
  const photo = tex('hero2.webp'); photo.wrapS = photo.wrapT = THREE.MirroredRepeatWrapping; uPhoto.value = photo;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(260, 130), new THREE.ShaderMaterial({
    uniforms: { uLin, uProj, uPhoto, uSky: uSkyU }, depthWrite: false,
    vertexShader: PROJ_VERT,
    fragmentShader: PROJ_COMMON + `
      void main(){ float w; vec2 uv = projUv(w);
        vec3 c = mix(texture2D(uPhoto, uv).rgb, uSky, haze(uv));
        c = mix(c, uSky, smoothstep(.86, 1.02, uv.y));            // powyżej zdjęcia samo niebo
        if (uLin > .5) c = pow(c, vec3(2.2)); gl_FragColor = vec4(c, 1.); }`,
  }));
  backdrop.position.set(0, 58, -46);
  scene.add(backdrop);

  /* łata miernicza na całą głębokość wykopu */
  const rodCv = document.createElement('canvas'); rodCv.width = 8; rodCv.height = 64;
  const rc = rodCv.getContext('2d'); rc.fillStyle = '#f6f1e8'; rc.fillRect(0, 0, 8, 64); rc.fillStyle = '#b8402e'; rc.fillRect(0, 0, 8, 32);
  const rodTex = new THREE.CanvasTexture(rodCv); rodTex.wrapT = THREE.RepeatWrapping; rodTex.repeat.set(1, 41); rodTex.magFilter = THREE.NearestFilter; rodTex.colorSpace = THREE.SRGBColorSpace;
  const rod = new THREE.Mesh(new THREE.BoxGeometry(.24, 41, .07), new THREE.MeshBasicMaterial({ map: rodTex }));
  rod.position.set(0, FLOOR_Y + 20.5, -PIT.d / 2 + .12);
  scene.add(rod);

  /* zdjęcia klienta jako odbitki w przestrzeni, odsłaniane spod piasku */
  const photoShader = (map) => new THREE.ShaderMaterial({
    uniforms: { uLin, map: { value: map }, vid: { value: null }, uMix: { value: 0 }, uReveal: { value: 0 }, uAspect: { value: 1.4 } }, transparent: true, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform sampler2D map; uniform sampler2D vid; uniform float uMix; uniform float uReveal; uniform float uAspect;
      ${NOISE}
      void main(){
        float b = .028;                                              // biała ramka odbitki
        vec2 bw = vec2(b, b * uAspect);
        vec2 iuv = (vUv - bw) / (1. - 2. * bw);
        bool inside = iuv.x > 0. && iuv.x < 1. && iuv.y > 0. && iuv.y < 1.;
        vec3 c = vec3(.97, .94, .88);
        if (inside) { c = texture2D(map, iuv).rgb; if (uMix > 0.) c = mix(c, texture2D(vid, iuv).rgb, uMix); }
        float n = fbm(vUv * vec2(5. * uAspect, 5.)) * .8 + vnoise(vUv * 38.) * .2;
        float edge = uReveal * 1.25 - n;                             // > 0: odkopane
        if (edge < -.02) discard;
        vec3 sand = vec3(.80, .66, .44) * (.8 + .4 * vnoise(vUv * 90.));
        c = mix(sand, c, smoothstep(0., .09, edge));
        if (uLin > .5) c = pow(c, vec3(2.2)); gl_FragColor = vec4(c, 1.);
      }`,
  });
  const barCv = document.createElement('canvas'); barCv.width = 80; barCv.height = 8;
  const bc = barCv.getContext('2d'); for (let i = 0; i < 5; i++) { bc.fillStyle = i % 2 ? '#f6f1e8' : '#2b1a10'; bc.fillRect(i * 16, 0, 16, 8); }
  const barTex = new THREE.CanvasTexture(barCv); barTex.magFilter = THREE.NearestFilter; barTex.colorSpace = THREE.SRGBColorSpace;

  const photos = stEls.map((el, k) => {
    const g = new THREE.Group();
    const mat = photoShader(texLoader.load(IMG + el.dataset.img, (t) => {
      const a = t.image.width / t.image.height; mat.uniforms.uAspect.value = a;
      const w = a >= 1.25 ? 3.7 : 2.9 * a; plane.scale.set(w, w / a, 1); bar.position.y = -w / a / 2 - .22;
    }));
    mat.uniforms.map.value.colorSpace = THREE.NoColorSpace; mat.uniforms.map.value.anisotropy = 8;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .09), new THREE.MeshBasicMaterial({ map: barTex, transparent: true, opacity: 0 }));
    bar.position.x = 0;
    g.add(plane, bar);
    scene.add(g);
    let video = null;
    if (el.dataset.video) {                                     // klip wczytuje się dopiero w pobliżu warstwy
      video = document.createElement('video');
      video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
      video.dataset.src = '../demo/media/video/' + el.dataset.video;
    }
    return { g, mat, bar, video, vtex: null, mix: 0, side: el.dataset.side === 'left' ? -1 : 1, y: sY[k] };
  });

  /* dno: piasek i ciepły blask ogniska */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PIT.w, PIT.d), new THREE.ShaderMaterial({
    uniforms: { uLin, map: { value: tex('piasek.webp') }, uFire, uTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uLin; varying vec2 vUv; uniform sampler2D map; uniform float uFire; uniform float uTime;
      void main(){ vec3 c = texture2D(map, vUv * vec2(1., .62) + vec2(0., .2)).rgb * .42;
        float g = exp(-distance(vUv, vec2(.5, .45)) * 3.2) * uFire * (.85 + .15 * sin(uTime * 8.));
        c += vec3(1., .55, .2) * g * .85; if (uLin > .5) c = pow(c, vec3(2.2)); gl_FragColor = vec4(c, 1.); }`,
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y;
  scene.add(floor);

  /* pył w świetle */
  const DUST = 700, dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dpos[i * 3] = (Math.random() - .5) * 11; dpos[i * 3 + 1] = Math.random() * -40 + 2; dpos[i * 3 + 2] = (Math.random() - .5) * 5.4; dseed[i] = Math.random(); }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dgeo.setAttribute('seed', new THREE.BufferAttribute(dseed, 1));
  const dust = new THREE.Points(dgeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uCamY, uPx: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float seed; uniform float uTime; uniform float uCamY; uniform float uPx; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * (.12 + seed * .2) + 38., 40.) - 38.;
        p.x += sin(uTime * .3 + seed * 40.) * .35; p.z += cos(uTime * .25 + seed * 31.) * .25;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (14. + seed * 22.) / -mv.z; vA = (.25 + seed * .45) * smoothstep(7., 1.5, abs(p.y - uCamY)); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if(d > .5) discard;
      gl_FragColor = vec4(1., .93, .78, vA * smoothstep(.5, .1, d)); }`,
  }));
  scene.add(dust);

  /* koparka (model z Blendera) */
  let digger = null; const rig = {}; let matPaint, matDark, matSteel, matGlass;
  const rawTexNow = (file) => { const t = new THREE.TextureLoader().load(TEXDIR + file); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // Koparka: wycięte zdjęcie (Waryński K-611, Wikimedia Commons, CC BY-SA 3.0) jako duża plansza przy wykopie.
  const DIG_H = 10.5, DIG_ASPECT = 1.2841, DIG_GROUND = 0.0821;
  const digTex = texLoader.load('assets/koparka-foto.webp'); digTex.colorSpace = THREE.SRGBColorSpace; digTex.anisotropy = 8;
  digger = new THREE.Mesh(new THREE.PlaneGeometry(DIG_H * DIG_ASPECT, DIG_H), new THREE.MeshBasicMaterial({ map: digTex, transparent: true, alphaTest: .03, fog: false, toneMapped: false }));
  digger.position.set(8.4, DIG_H / 2 - DIG_H * DIG_GROUND, -5.2);
  digger.rotation.y = Math.atan2(-3.5 - digger.position.x, 15.5 - digger.position.z);          // przodem do kamery startowej
  scene.add(digger);
  const shCv = document.createElement('canvas'); shCv.width = 256; shCv.height = 64;
  { const x = shCv.getContext('2d'), g = x.createRadialGradient(128, 32, 4, 128, 32, 124); g.addColorStop(0, 'rgba(20,12,6,.75)'); g.addColorStop(1, 'rgba(20,12,6,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 64); }
  const digShadow = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCv), transparent: true, depthWrite: false, fog: false }));
  digShadow.rotation.x = -Math.PI / 2; digShadow.rotation.z = -digger.rotation.y; digShadow.position.set(11.2, .03, -4.6);
  scene.add(digShadow);

  /* ───────── kamera po klatkach kluczowych ───────── */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let keys = [], camZ = 2.6, portrait = false;
  function buildKeys() {
    keys = [
      { p: 0, pos: V(-3.5, 3.4, 15.5), look: V(portrait ? 1 : -4.2, portrait ? 6.2 : 4.6, -3) },
      { p: 0.07, pos: V(0, 5.2, 2.4), look: V(0, -6, -2.7) },
      ...sP.map((p, k) => ({ p, pos: V(0, sY[k] + .25 + (portrait ? .5 : 0), camZ), look: V(0, sY[k] + (portrait ? .5 : 0), -3) })),
      { p: INV_A, pos: V(0, FLOOR_Y + 4.3, camZ), look: V(0, FLOOR_Y + 3.9, -3) },
      { p: INV_B + 0.03, pos: V(0, FLOOR_Y + 4.3, camZ), look: V(0, FLOOR_Y + 3.9, -3) },
      { p: 1, pos: V(0, FLOOR_Y + 1.9, camZ), look: V(0, FLOOR_Y + .4, -2.2) },
    ];
  }
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0);
  function poseAt(p) {
    let i = 0; while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const a = keys[i], b = keys[i + 1], t = smoother(clamp((p - a.p) / (b.p - a.p), 0, 1));
    tmpA.lerpVectors(a.pos, b.pos, t); tmpB.lerpVectors(a.look, b.look, t);
  }

  let mouseGain = 0;
  const sketch = { v: 1, draw: 0 };                              // v: 1 = szkic, 0 = kolor; draw: postęp rysowania
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), postScene = new THREE.Scene();
  const postMat = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uSketch: { value: 1 }, uDraw: { value: 0 }, uCenter: { value: new THREE.Vector2(.5, .42) } },
    depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform sampler2D tScene; uniform vec2 uRes; uniform float uSketch; uniform float uDraw; uniform vec2 uCenter;
      ${NOISE}
      vec3 srgb(vec2 uv){ return pow(max(texture2D(tScene, uv).rgb, 0.), vec3(1. / 2.2)); }
      float lum(vec2 uv){ return dot(srgb(uv), vec3(.299, .587, .114)); }
      float hatch(vec2 p, float ang, float gap){                    // kreskowanie pod kątem, z nierównym naciskiem
        float c = cos(ang), s = sin(ang); vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        float v = abs(fract(q.y / gap + vnoise(q * .012) * .7) - .5) * 2.;
        return smoothstep(.68, .96, v) * (.55 + .45 * vnoise(q * vec2(.02, .35)));
      }
      void main(){
        vec2 px = 1.25 / uRes, p = vUv * uRes;
        vec2 u = vUv + (vec2(vnoise(p / 11.), vnoise(p / 11. + 31.)) - .5) * 2.4 / uRes;   // drżenie ręki
        float tl = lum(u + px * vec2(-1., 1.)), t = lum(u + px * vec2(0., 1.)), tr = lum(u + px * vec2(1., 1.));
        float l = lum(u + px * vec2(-1., 0.)), r = lum(u + px * vec2(1., 0.));
        float bl = lum(u + px * vec2(-1., -1.)), b = lum(u + px * vec2(0., -1.)), br = lum(u + px * vec2(1., -1.));
        float g = length(vec2(-tl - 2. * l - bl + tr + 2. * r + br, -tl - 2. * t - tr + bl + 2. * b + br));
        float line = smoothstep(.09, .4, g) * (.6 + .4 * vnoise(p / 2.6));
        float tone = lum(u);
        float sh = hatch(p, .7, 6.) * smoothstep(.64, .4, tone) + hatch(p, -.6, 6.5) * smoothstep(.44, .22, tone) * .9 + hatch(p, 1.45, 5.) * smoothstep(.26, .08, tone) * .9;
        vec3 paper = vec3(.972, .948, .905) * (.965 + .05 * fbm(p / 170.)) - .028 * vnoise(p / 1.8);
        float ink = clamp(line * .92 + sh * .5, 0., 1.);
        float drawn = smoothstep(0., .2, uDraw * 1.5 - (vUv.x * .8 + fbm(vUv * 3.) * .35 + (1. - vUv.y) * .1));   // ołówek idzie od lewej
        vec3 sk = mix(paper, vec3(.2, .2, .235), ink * drawn);
        vec2 asp = vec2(uRes.x / uRes.y, 1.);
        float flood = smoothstep(0., .24, (1. - uSketch) * 2.1 - distance(vUv * asp, uCenter * asp) * .9 - fbm(vUv * 6.) * .3);   // kolor rozlewa się od środka
        gl_FragColor = vec4(mix(sk, srgb(vUv), flood), 1.);
      }`,
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

  function layout() {
    const w = innerWidth, h = innerHeight, asp = w / h;
    portrait = asp < 0.9;
    renderer.setPixelRatio(Math.min(devicePixelRatio, portrait ? 1.5 : 2));
    renderer.setSize(w, h, false);
    { const pr = renderer.getPixelRatio(); rt.setSize(Math.round(w * pr), Math.round(h * pr)); postMat.uniforms.uRes.value.set(w * pr, h * pr); }
    camera.aspect = asp; camera.fov = portrait ? 72 : 55; camera.updateProjectionMatrix();
    camZ = portrait ? 2.85 : 2.6;
    dust.material.uniforms.uPx.value = h / 720 * renderer.getPixelRatio() * 2.2;
    const sc = portrait ? clamp(asp / 0.52, .6, .9) * .62 : clamp(asp / 1.9, .6, 1);
    photos.forEach((ph) => {
      ph.g.position.set(portrait ? .25 : ph.side * 2.5 * sc, ph.y + (portrait ? 1.35 : 0), -PIT.d / 2 + .75);
      ph.g.rotation.y = portrait ? 0 : -ph.side * .16;
      ph.g.scale.setScalar(sc);
    });
    rod.position.x = portrait ? -1.35 : 0;
    buildKeys();
  }
  addEventListener('resize', layout);
  layout();

  /* ───────── przewijanie wirtualne ───────── */
  const scroll = { target: 0, cur: 0, locked: true, idleAt: 0 };
  const WHEEL_PX = 7600, TOUCH_PX = 3000, SNAP_RANGE = 0.034, SNAP_DELAY = 900;
  const nudge = (d) => { if (scroll.locked) return; scroll.target = clamp(scroll.target + d, 0, 1); scroll.idleAt = performance.now(); };
  addEventListener('wheel', (e) => { e.preventDefault(); nudge((e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY) / WHEEL_PX); }, { passive: false });
  let ty = null;
  addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { if (ty === null) return; const y = e.touches[0].clientY; nudge((ty - y) / TOUCH_PX); ty = y; }, { passive: true });
  addEventListener('touchend', () => { ty = null; });
  const goStop = (dir) => {
    if (scroll.locked) return;
    const cur = scroll.target; let next;
    if (dir > 0) next = STOPS.find((s) => s > cur + .01); else next = [...STOPS].reverse().find((s) => s < cur - .01);
    if (next !== undefined) { scroll.target = next; scroll.idleAt = performance.now(); }
  };
  addEventListener('keydown', (e) => {
    if (e.target.closest('a,button,input,select,textarea') && (e.key === ' ' || e.key === 'Enter')) return;
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goStop(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goStop(-1); }
    if (e.key === 'Home') scroll.target = 0;
    if (e.key === 'End') scroll.target = 1;
  });
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

  /* ───────── nakładka HTML ───────── */
  const gauge = $('#gauge'), gaugeM = $('#gaugeM'), gaugeEra = $('#gaugeEra'), hint = $('#hint'), endEl = $('#end');
  const invEl = $('#inwestor'), invTrack = $('#invTrack'), endBar = $('#endBar'), invCards = [...invTrack.children];
  const FULL_URL = '../demo/index.html?z=intro', LEAVE_MS = 3600;
  const params = new URLSearchParams(location.search);
  let autoGo = params.get('p') === null || params.get('auto') === '1', leaveAt = 0, leaving = false;
  $('#zostan').addEventListener('click', () => { autoGo = false; $('#endMsg').textContent = 'Zostajesz na dnie wykopu. Pełną stronę otworzysz przyciskiem.'; $('#zostan').hidden = true; });
  addEventListener('pageshow', (ev) => { if (ev.persisted) { leaving = false; leaveAt = 0; autoGo = false; document.body.classList.remove('is-leaving'); } });
  let eraNow = 'współczesność', activeSt = -1, endOn = false, invOn = false;
  const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUWYZ0123456789#/<>+=';
  function decode(el) {                                        // litery „odkopują się” z losowych znaków
    if (!el) return;
    const txt = el.dataset.txt || (el.dataset.txt = el.textContent);
    el.setAttribute('aria-label', txt);
    cancelAnimationFrame(el._raf);
    const t0 = performance.now(), dur = 900;
    const tick = (now) => {
      const k = clamp((now - t0) / dur, 0, 1), done = Math.floor(k * txt.length);
      let out = txt.slice(0, done);
      for (let i = done; i < txt.length; i++) out += txt[i] === ' ' ? ' ' : (i - done < 5 ? GLYPHS[Math.random() * GLYPHS.length | 0] : '\u00a0');
      el.textContent = out;
      if (k < 1) el._raf = requestAnimationFrame(tick); else el.textContent = txt;
    };
    el._raf = requestAnimationFrame(tick);
  }
  const eras = ['współczesność', ...stEls.map((e) => e.dataset.era), 'calec', 'calec, dno wykopu'];
  function setEra(t) { if (t === eraNow) return; eraNow = t; gaugeEra.classList.add('swap'); setTimeout(() => { gaugeEra.textContent = t; gaugeEra.classList.remove('swap'); }, 280); }
  function depthAt(p) { let i = 0; while (i < DEPTH_P.length - 2 && p > DEPTH_P[i + 1]) i++; const t = clamp((p - DEPTH_P[i]) / (DEPTH_P[i + 1] - DEPTH_P[i]), 0, 1); return DEPTH_M[i] + (DEPTH_M[i + 1] - DEPTH_M[i]) * smoother(t); }

  function overlay(p) {
    gaugeM.textContent = depthAt(p).toFixed(1).replace('.', ',') + ' m';
    let near = 0, best = 9; STOPS.forEach((s, i) => { const d = Math.abs(p - s); if (d < best) { best = d; near = i; } });
    setEra(eras[near]);
    let act = -1; sP.forEach((s, k) => { if (Math.abs(p - s) < 0.047) act = k; });
    if (act !== activeSt) { stEls.forEach((el, k) => el.classList.toggle('on', k === act)); activeSt = act; if (act >= 0) decode(stEls[act].querySelector('h2')); }
    const iv = sstep(INV_A - 0.016, INV_A - 0.002, p) * (1 - sstep(INV_B + 0.022, INV_B + 0.045, p));   // ostatnia karta stoi chwilę na środku, zanim scena zgaśnie
    invEl.style.opacity = iv;
    if (iv > .5 && !invOn) decode(invEl.querySelector('h2'));
    invOn = iv > .5;
    const run = clamp((p - INV_A) / (INV_B - INV_A), 0, 1);            // karty jadą poziomo razem z przewijaniem
    const cFirst = invCards[0], cLast = invCards[invCards.length - 1];
    const x0 = innerWidth / 2 - (cFirst.offsetLeft + cFirst.offsetWidth / 2), x1 = innerWidth / 2 - (cLast.offsetLeft + cLast.offsetWidth / 2);
    invTrack.style.transform = `translate3d(${(x0 + (x1 - x0) * run).toFixed(1)}px,0,0)`;   // od pierwszej do ostatniej karty na środku ekranu
    invCards.forEach((li) => {                                    // karta bliżej środka jest większa, a jej film gra
      const r = li.getBoundingClientRect(), d = Math.abs((r.left + r.width / 2) - innerWidth / 2) / innerWidth, near = iv > .3 && d < .34, v = li.firstElementChild;
      li.style.opacity = (1 - clamp(d * 1.5, 0, .55)).toFixed(3); li.style.transform = `scale(${(1 - clamp(d * .22, 0, .1)).toFixed(4)})`;
      if (near) { if (!v.src) v.src = v.dataset.src; if (v.paused) v.play().catch(() => {}); } else if (!v.paused) v.pause();
    });
    const now = performance.now();
    if (p > 0.985 && autoGo && !leaving) {
      if (!leaveAt) leaveAt = now + LEAVE_MS;
      endBar.style.transform = `scaleX(${clamp(1 - (leaveAt - now) / LEAVE_MS, 0, 1)})`;
      if (now >= leaveAt) { leaving = true; document.body.classList.add('is-leaving'); setTimeout(() => { location.href = FULL_URL; }, 650); }
    } else if (!leaving) { leaveAt = 0; endBar.style.transform = 'scaleX(0)'; }
    const e = p > 0.955; if (e !== endOn) { endOn = e; endEl.classList.toggle('on', e); endEl.setAttribute('aria-hidden', String(!e)); }
    document.body.classList.toggle('is-deep', p > 0.085);
    hint.classList.toggle('on', !scroll.locked && p < 0.1);
    gauge.classList.toggle('on', !scroll.locked && !invOn);     // przy kartach współpracy miernik się chowa, żeby nie nachodził na kartę
  }

  /* ───────── pętla ───────── */
  const clock = new THREE.Clock(); const bg = new THREE.Color();
  function frame() {
    const dt = Math.min(clock.getDelta(), .05); uTime.value += dt;
    if (!scroll.locked && performance.now() - scroll.idleAt > SNAP_DELAY) {         // punkty zaczepienia
      const s = STOPS.find((v) => Math.abs(v - scroll.target) < SNAP_RANGE);
      if (s !== undefined) scroll.target += (s - scroll.target) * Math.min(1, dt * 3);
    }
    scroll.cur += (scroll.target - scroll.cur) * (1 - Math.pow(1 - 0.085, dt * 60));
    const p = scroll.cur;

    poseAt(p);
    mouseGain += ((scroll.locked ? 0 : 1) - mouseGain) * .03;
    mouse.sx += (mouse.x * mouseGain - mouse.sx) * .05; mouse.sy += (mouse.y * mouseGain - mouse.sy) * .05;
    const inPit = sstep(0.07, 0.13, p);
    camera.position.copy(tmpA); camera.position.x += mouse.sx * (.5 - .2 * inPit); camera.position.y -= mouse.sy * .22;
    tmpB.x += mouse.sx * .5 * inPit;
    camera.lookAt(tmpB);
    uCamY.value = camera.position.y;

    const deep = sstep(0.05, 0.14, p);
    bg.copy(SKY).lerp(DARK, deep); scene.background.copy(bg); scene.fog.color.copy(bg);
    scene.fog.near = 30 - 24 * deep; scene.fog.far = 90 - 66 * deep;
    uFire.value = sstep(0.78, 0.97, p);

    photos.forEach((ph, k) => {
      const r = sstep(sP[k] - 0.085, sP[k] - 0.012, p);
      ph.mat.uniforms.uReveal.value = r; ph.bar.material.opacity = sstep(.7, 1, r);
      ph.g.visible = r > 0.001 && p < sP[k] + 0.1;
      if (ph.video) {
        const nearSt = Math.abs(p - sP[k]) < 0.075;
        if (nearSt && !ph.video.src) { ph.video.src = ph.video.dataset.src; ph.video.load(); }
        if (nearSt && ph.video.paused && ph.video.src) ph.video.play().catch(() => {});
        if (!nearSt && !ph.video.paused) ph.video.pause();
        if (!ph.vtex && ph.video.readyState >= 2) { ph.vtex = new THREE.VideoTexture(ph.video); ph.vtex.colorSpace = THREE.NoColorSpace; ph.mat.uniforms.vid.value = ph.vtex; }
        const want = ph.vtex && nearSt && r > .95 ? 1 : 0;
        ph.mix += (want - ph.mix) * Math.min(1, dt * 2.2); ph.mat.uniforms.uMix.value = ph.mix;
      }
      ph.g.rotation.x = -mouse.sy * .05;
      if (!portrait) ph.g.rotation.y = -ph.side * .16 + mouse.sx * .07;
    });

    if (digger) {                                              // plansza znika, zanim kamera zobaczy ją z góry
      const vis = 1 - sstep(0.022, 0.055, p);
      digger.material.opacity = vis; digger.visible = vis > 0.01; digShadow.material.opacity = vis; digShadow.visible = vis > 0.01;
      digger.position.x = 8.4 + mouse.sx * .25;
    }
    backdrop.visible = p < 0.2;
    overlay(p);
    if (sketch.v > 0.002) {                                       // start: scena przechodzi przez filtr szkicu
      uLin.value = 1; postMat.uniforms.uSketch.value = sketch.v; postMat.uniforms.uDraw.value = sketch.draw;
      renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    } else { uLin.value = 0; renderer.render(scene, camera); }
    requestAnimationFrame(frame);
  }

  /* ───────── start ───────── */
  const startEl = $('#start'), loadFill = $('#loadFill'), loadTxt = $('#loadTxt');
  manager.onProgress = (_, done, total) => { const v = done / total; loadFill.style.transform = `scaleX(${1 - v})`; loadTxt.textContent = `Przygotowuję wykop… ${Math.round(v * 100)}%`; };
  manager.onError = (url) => console.warn('Nie wczytano:', url);
  // Film otwierający (Kling): czysta kartka → ołówek rysuje kadr → kolor. Ostatnia klatka = kadr startowy sceny.
  // Gdy filmu nie da się odtworzyć, zostaje zapasowy szkic z filtra.
  const film = $('#film');
  let filmOn = false;
  const filmOut = (dur = .9) => { if (!filmOn) return; filmOn = false; gsap.to(film, { opacity: 0, duration: dur, ease: 'power1.inOut', onComplete: () => { film.pause(); film.hidden = true; } }); };
  const showCopy = (delay) => gsap.to('#startCopy > *', { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out', stagger: .18, delay });
  const startShader = () => {                                  // wariant zapasowy: szkic liczony na żywo
    sketch.v = 1; film.hidden = true;
    gsap.to(sketch, { draw: 1, duration: 3.2, ease: 'power1.inOut', delay: .15 });
    showCopy(1.5);
  };
  manager.onLoad = () => {
    $('#load').hidden = true; $('#startCopy').hidden = false; startEl.classList.add('is-ready');
    $('#wejdz').focus({ preventScroll: true });
    let decided = false;
    const go = (useFilm) => {
      if (decided) return; decided = true;
      if (!useFilm) return startShader();
      sketch.v = 0; filmOn = true; film.hidden = false; film.style.opacity = 1; film.currentTime = 0;
      film.play().then(() => showCopy(3.2)).catch(() => { filmOn = false; startShader(); });
    };
    film.addEventListener('ended', () => filmOut(1.1));
    film.addEventListener('error', () => go(false));
    film.addEventListener('canplay', () => go(true), { once: true });
    film.src = film.dataset.src; film.load();          // film wczytuje się dopiero po zasobach sceny
    setTimeout(() => go(false), 6000);                         // film się nie wczytał: nie każ czekać
  };
  const brandName = document.querySelector('.brand__name');
  brandName.innerHTML = [...brandName.textContent].map((ch, i) => `<span class="${i >= 6 ? 'thin' : ''}">${ch}</span>`).join('');
  $('#wejdz').addEventListener('click', () => {
    startEl.classList.add('is-gone');
    const o = { v: 0 };
    gsap.killTweensOf(sketch); sketch.draw = 1; filmOut(.6);
    gsap.timeline()
      .to(sketch, { v: 0, duration: 1.9, ease: 'power2.inOut' }, 0)                       // kolor rozlewa się po szkicu
      .to('#brand', { opacity: 1, duration: .5 }, .3)
      .fromTo('.brand__mark .draw', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: .14 }, .35)
      .to('.brand__mark .fill', { opacity: 1, duration: .6 }, 1.25)
      .fromTo('.brand__mark .node', { scale: 0 }, { scale: 1, duration: .4, ease: 'back.out(3)', stagger: .09, transformOrigin: 'center', transformBox: 'fill-box' }, 1.35)
      .fromTo('.brand__name span', { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .85, ease: 'power3.out', stagger: .04 }, .6)
      .fromTo('.brand__rod', { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.inOut' }, .95)
      .to('.brand__tag', { opacity: 1, duration: .6 }, 1.5)
      .to(o, { v: 0.07, duration: 2.8, ease: 'power2.inOut', onUpdate: () => { scroll.target = o.v; }, onComplete: () => { scroll.locked = false; scroll.idleAt = performance.now(); } }, 2.9)
      .to('#brand', { opacity: 0, duration: .9 }, 3.1);
  });
  $('#wroc').addEventListener('click', () => { scroll.target = 0.07; scroll.idleAt = performance.now(); });

  // podgląd i testy: ?p=0.4 ustawia postęp od razu
  window.__dig = { set: (v) => { scroll.locked = false; scroll.target = scroll.cur = v; sketch.v = 0; startEl.classList.add('is-gone'); }, scroll, sketch ,
    // klatka startowa w kolorze, bez nakładek: do filmu otwierającego (ostatnia klatka filmu = ten kadr)
    shot: (w, h) => {
      renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = 55; camera.updateProjectionMatrix();
      mouse.x = mouse.y = mouse.sx = mouse.sy = 0; scroll.cur = scroll.target = 0; sketch.v = 0; uLin.value = 0;
      poseAt(0); camera.position.copy(tmpA); camera.lookAt(tmpB); uCamY.value = camera.position.y;
      scene.background.copy(SKY); scene.fog.color.copy(SKY); scene.fog.near = 30; scene.fog.far = 90;
      if (digger) { digger.material.opacity = 1; digger.visible = true; digger.position.x = 8.4; digShadow.material.opacity = 1; digShadow.visible = true; }
      backdrop.visible = true; dust.visible = false;
      renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/png');
      dust.visible = true; layout(); return url;
    } };
  const qp = new URLSearchParams(location.search).get('p');
  if (qp !== null) manager.onLoad = () => { film.hidden = true; window.__dig.set(+qp); };

  requestAnimationFrame(frame);
}
