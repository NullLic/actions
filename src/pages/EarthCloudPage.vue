<template>
  <div>
    <canvas id="target-canvas"></canvas>
  </div>
</template>
<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onMounted } from 'vue'

onMounted(() => {
  const canvas = document.getElementById('target-canvas') as HTMLCanvasElement
  // ===================== 设备检测与全局配置 =====================
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
  // 根据设备动态调整参数
  const RENDER_CONFIG = {
    // 移动端降低细分度和速度，提升性能
    sphereSegments: isMobile ? 32 : 64,
    cloudSpeed: isMobile ? 0.08 : 0.1,
    cloudDensity: isMobile ? 4.0 : 5.0,
    // 移动端关闭抗锯齿（性能优先），桌面保留
    antialias: !isMobile,
    // 统一精度为mediump（移动端兼容，桌面适配）
    precision: 'mediump',
  }

  // ===================== 场景初始化（适配版） =====================
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000,
  )
  // 渲染器适配：优先高性能模式，兼容WebGL1/2
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: RENDER_CONFIG.antialias,
    powerPreference: isMobile ? 'high-performance' : 'default', // 移动端优先高性能
    precision: RENDER_CONFIG.precision,
    alpha: false, // 关闭透明背景，降低移动端开销
  })
  // 适配移动端DPR（避免模糊）
  const dpr = isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio
  renderer.setPixelRatio(dpr)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  document.body.appendChild(renderer.domElement)

  // 控制器适配：移动端简化交互
  const controls = new OrbitControls(camera, renderer.domElement)
  camera.position.set(0, 0, 1.2)
  controls.enableDamping = true
  controls.dampingFactor = isMobile ? 0.1 : 0.05 // 移动端阻尼更大，更易操作
  controls.maxDistance = 2.0 // 限制摄像机距离，避免过度拉伸
  controls.minDistance = 1.05

  // ===================== 地球本体（适配细分度） =====================
  const earthGeometry = new THREE.SphereGeometry(
    1,
    RENDER_CONFIG.sphereSegments,
    RENDER_CONFIG.sphereSegments,
  )
  const earthMaterial = new THREE.MeshBasicMaterial({
    color: 0x1a3b5d,
    wireframe: false,
  })
  const earth = new THREE.Mesh(earthGeometry, earthMaterial)
  scene.add(earth)

  // ===================== 云层着色器（全设备兼容版） =====================
  // 顶点着色器：精简逻辑，仅传递必要参数
  const vertexShader = `
  #ifdef GL_ES
  precision ${RENDER_CONFIG.precision} float;
  precision ${RENDER_CONFIG.precision} int;
  #endif

  varying vec3 vWorldPosition;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

  // 片元着色器：优化噪声计算，适配移动端精度
  const fragmentShader = `
  #ifdef GL_ES
  precision ${RENDER_CONFIG.precision} float;
  precision ${RENDER_CONFIG.precision} int;
  #endif

  varying vec3 vWorldPosition;
  uniform float uTime;
  uniform vec3 uCloudColor;
  uniform float uCloudSpeed;
  uniform float uCloudDensity;
  // 新增：适配不同设备的噪声缩放（移动端降低计算量）
  uniform float uNoiseScale;

  // 优化版2D噪声：减少计算量，适配移动端
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // 简化插值公式，降低移动端计算开销
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    p = fract(p * 0.31830988618);
    p += dot(p, p + 33.33);
    float n = fract((p.x + p.y) * 0.14285714285);
    return mix(mix(n, fract(n + 0.1), f.x), mix(fract(n + 0.2), fract(n + 0.3), f.x), f.y);
  }

  // 分形噪声：移动端减少迭代次数（从4次→3次）
  float fractalNoise(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    int iterations = uNoiseScale > 1.0 ? 4 : 3; // 动态迭代次数
    for (int i = 0; i < 4; i++) {
      if (i >= iterations) break; // 移动端只执行3次
      total += noise2D(p * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return total;
  }

  void main() {
    // 归一化球面坐标（兼容低精度计算）
    vec3 normalizedPos = normalize(vWorldPosition);
    float lat = asin(clamp(normalizedPos.y, -1.0, 1.0)); // 限制范围，避免NaN
    float lon = atan(normalizedPos.z, normalizedPos.x);

    // 云层UV：适配噪声缩放
    vec2 cloudUV = vec2(lon, lat) * uCloudDensity;
    // 时间偏移：移动端速度稍慢，减少计算量
    cloudUV.x += uTime * uCloudSpeed + fractalNoise(cloudUV * 0.5) * 0.08;
    cloudUV.y += fractalNoise(cloudUV * 0.8) * 0.04;

    // 生成云层透明度：平滑边缘，兼容低精度
    float cloudNoise = fractalNoise(cloudUV);
    float alpha = smoothstep(0.38, 0.62, cloudNoise); // 扩大平滑范围，适配精度

    // 输出颜色：避免高精度运算
    gl_FragColor = vec4(uCloudColor * alpha, alpha);
    // 移动端强制关闭浮点精度溢出
    #ifdef GL_ES
    gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
    #endif
  }
`

  // 云层Uniforms（动态适配设备）
  const cloudUniforms = {
    uTime: { value: 0 },
    uCloudColor: { value: new THREE.Color(0xffffff) },
    uCloudSpeed: { value: RENDER_CONFIG.cloudSpeed },
    uCloudDensity: { value: RENDER_CONFIG.cloudDensity },
    uNoiseScale: { value: isMobile ? 1.0 : 2.0 }, // 移动端噪声缩放=1（少迭代）
  }

  // 云层材质：兼容WebGL1的配置
  const cloudMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: cloudUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // 关闭移动端的不必要特性
    polygonOffset: isMobile,
    polygonOffsetFactor: isMobile ? 1.0 : 0.0,
    // 兼容WebGL1（移动端多为WebGL1）
    glslVersion: renderer.capabilities.isWebGL2 ? THREE.GLSL3 : THREE.GLSL1,
  })

  // 云层网格：适配细分度
  const cloudGeometry = new THREE.SphereGeometry(
    1.01,
    RENDER_CONFIG.sphereSegments,
    RENDER_CONFIG.sphereSegments,
  )
  const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial)
  scene.add(clouds)

  // ===================== 动画与适配逻辑 =====================
  // 动态帧率控制：移动端降低帧率，减少功耗
  let lastTime = 0
  const frameInterval = isMobile ? 16 : 8 // 移动端≈60fps，桌面≈120fps
  function animate(currentTime: number) {
    requestAnimationFrame(animate)
    // 帧率节流
    if (currentTime - lastTime < frameInterval) return
    lastTime = currentTime

    // 更新时间参数（平滑增量，避免移动端卡顿）
    cloudUniforms.uTime.value += isMobile ? 0.008 : 0.01

    controls.update()
    renderer.render(scene, camera)
  }
  animate(0)

  // 窗口适配：兼容移动端横竖屏切换
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    // 适配移动端DPR
    const newDpr = isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio
    renderer.setPixelRatio(newDpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  // 移动端触摸优化：防止默认行为（如滚动）干扰
  renderer.domElement.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault()
    },
    { passive: false },
  )
  renderer.domElement.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault()
    },
    { passive: false },
  )
})
</script>
<style scoped>
#target-canvas {
  width: 100%;
  height: 100vh;
  display: block;
}
</style>
