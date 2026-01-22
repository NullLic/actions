<!-- ThreePage.vue -->
<template>
  <!-- 页面中已存在的 Canvas 元素 -->
  <canvas id="threeCanvas" ref="canvasRef" class="three-canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 脚本顶层变量声明
const canvasRef = ref<HTMLCanvasElement | null>(null);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let animationId: number | null = null;
let cube: THREE.Mesh | null = null; // ✅ 核心：标注 cube 类型
let sphere: THREE.Mesh | null = null; // 球体

let modelCurve: THREE.CatmullRomCurve3; // 模型运动路径
let cameraCurve: THREE.CatmullRomCurve3; // 摄像机运动路径

// 帧率控制相关变量
const targetFPS = 60; // 目标帧率：60 FPS
const frameInterval = 1000 / targetFPS; // 每帧间隔：≈16.666ms
let lastFrameTime = 0; // 上一帧时间戳
const fps = ref(0); // 实时帧率（调试用）
let fpsUpdateTime = 0; // FPS更新时间戳
let frameCount = 0; // 帧数计数器

let cameraTime = 0; // 用于路径动画的时间变量
let modelTime = 0;


onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) {
    console.error('未找到 Canvas 元素');
    return;
  }
  initThree(canvas);
});

onMounted(() => {
    console.log('ThreePage mounted');
});

function initThree(canvas: HTMLCanvasElement) {
  // 初始化场景/相机/渲染器（和之前一致）
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 40, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setPixelRatio(window.devicePixelRatio);

  controls = new OrbitControls(camera, canvas);
  controls.target = new THREE.Vector3(0, 0, 0); // 控制器目标点 = 相机看向的点
  controls.update(); // 必须调用 update 生效
  controls.enableDamping = true;

   // ✅ 创建立方体并赋值给全局 cube
  const geometry = new THREE.BoxGeometry(4, 4, 4);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  cube = new THREE.Mesh(geometry, material);
  cube.position.y = 5;
  scene.add(cube);

  // 创建球体
  const sphereGeometry = new THREE.SphereGeometry(1, 10, 10);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // 辅助区：

  // 创建坐标轴辅助器（参数为轴线长度，默认1）
  const axesHelper = new THREE.AxesHelper(5); 
  scene.add(axesHelper);

  // 平面物块
  const planeGeometry = new THREE.PlaneGeometry(10, 10);
  planeGeometry.rotateX(-Math.PI / 2);

  // 模型运动路径
        const cameraPoints = [
            new THREE.Vector3(10, 5, 10),
            new THREE.Vector3(5, 10, -10),
            new THREE.Vector3(-10, 5, 0),
        ];
        

        // 摄像机运动路径（高于模型路径，形成俯视跟随视角）
        const modelPoints = [
            new THREE.Vector3(-40, 30, 20),
            new THREE.Vector3(-20, 40, 30),
            new THREE.Vector3(0, 30, 40),
            new THREE.Vector3(20, 40, 30),
            new THREE.Vector3(40, 30, 20),
            new THREE.Vector3(20, 20, 0),
            new THREE.Vector3(0, 30, -20),
            new THREE.Vector3(-20, 20, 0)
        ];

        cameraCurve = new THREE.CatmullRomCurve3(cameraPoints, true); // 闭合路径
        modelCurve = new THREE.CatmullRomCurve3(modelPoints, true); // 闭合路径

        // 可视化两条路径（调试用，可删除）
        const modelCurveLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(modelCurve.getPoints(100)),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
        );
        scene.add(modelCurveLine);

        const cameraCurveLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(cameraCurve.getPoints(100)),
            new THREE.LineBasicMaterial({ color: 0xff0000 })
        );
        scene.add(cameraCurveLine);
  
  scene.add(new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ color: 0x999999, side: THREE.DoubleSide })));

  // 窗口自适应
  window.addEventListener('resize', () => {
    if (!camera || !renderer || !canvas) return;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  });

  // 启动固定帧率的动画循环
  lastFrameTime = performance.now();
  fpsUpdateTime = lastFrameTime;
  animate(performance.now());
}

// 固定帧率的动画循环核心函数
function animate(currentTime: number) {
  // 1. 记录当前动画帧ID（用于销毁）
  animationId = requestAnimationFrame(animate);

  // 2. 计算时间差：当前时间 - 上一帧时间
  const deltaTime = currentTime - lastFrameTime;

  // 3. 只有当时间差 ≥ 每帧间隔时，才执行渲染
  if (deltaTime >= frameInterval) {
    // 更新上一帧时间（补偿误差，避免帧率漂移）
    lastFrameTime = currentTime - (deltaTime % frameInterval);

    // 执行动画逻辑（立方体旋转）
    if (cube) {
      // 基于时间差计算旋转速度（保证不同帧率下动画速度一致）
      const rotationSpeed = 0.001 * frameInterval; // 每帧旋转固定角度
      cube.rotation.x += rotationSpeed;
      cube.rotation.y += rotationSpeed;
    }

    // 运动路径逻辑
    if (cube && camera) {
        cameraTime += 0.0005 * frameInterval; // 基于时间差增加时间变量
        modelTime += 0.00005 * frameInterval;
        const tCamera = cameraTime % 1; // 循环在 [0,1] 之间
        const tModel = modelTime % 1;

        // 更新视线小球位置
        const modelPosition = modelCurve.getPointAt(tModel);
        

        // 更新摄像机位置
        const cameraPosition = cameraCurve.getPointAt(tCamera);
        camera.position.copy(modelPosition);
        sphere!.position.copy(cameraPosition);


        // 让摄像机始终看向立方体
        controls?.target.copy(cameraPosition);
        controls?.update();
    }

    // 更新控制器 + 渲染场景
    controls?.update();
    renderer?.render(scene!, camera!);

    // 4. 计算实时帧率（调试用，可选）
    frameCount++;
    if (currentTime - fpsUpdateTime >= 1000) {
      fps.value = Math.round(frameCount);
      frameCount = 0;
      fpsUpdateTime = currentTime;
    }
  }
}

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (controls) controls.dispose();
  if (renderer) renderer.dispose();
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
});
</script>

<style scoped>
.three-canvas {
  width: 100%;
  height: 100vh;
  display: block;
}
</style>