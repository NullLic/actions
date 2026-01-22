import{S as y,P as _,W as E,O as M,b as u,M as D,a as f,C as N,g as b,G,h as L,i as W}from"./OrbitControls-DiHyoYJg.js";import{d as z,o as V,c as R,e as B,b as U,_ as F}from"./index-D6Undgkb.js";const O=z({__name:"EarthCloudPage",setup(I){return V(()=>{const a=document.getElementById("target-canvas"),e=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),o={sphereSegments:e?32:64,cloudSpeed:e?.08:.1,cloudDensity:e?4:5,antialias:!e,precision:"mediump"},l=new y,n=new _(75,a.clientWidth/a.clientHeight,.1,1e3),i=new E({canvas:a,antialias:o.antialias,powerPreference:e?"high-performance":"default",precision:o.precision,alpha:!1}),p=e?Math.min(window.devicePixelRatio,1.5):window.devicePixelRatio;i.setPixelRatio(p),i.setSize(a.clientWidth,a.clientHeight),document.body.appendChild(i.domElement);const r=new M(n,i.domElement);n.position.set(0,0,1.2),r.enableDamping=!0,r.dampingFactor=e?.1:.05,r.maxDistance=2,r.minDistance=1.05;const m=new u(1,o.sphereSegments,o.sphereSegments),v=new D({color:1719133,wireframe:!1}),h=new f(m,v);l.add(h);const g=`
  #ifdef GL_ES
  precision ${o.precision} float;
  precision ${o.precision} int;
  #endif

  varying vec3 vWorldPosition;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,w=`
  #ifdef GL_ES
  precision ${o.precision} float;
  precision ${o.precision} int;
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
`,s={uTime:{value:0},uCloudColor:{value:new N(16777215)},uCloudSpeed:{value:o.cloudSpeed},uCloudDensity:{value:o.cloudDensity},uNoiseScale:{value:e?1:2}},S=new b({vertexShader:g,fragmentShader:w,uniforms:s,transparent:!0,blending:W,depthWrite:!1,polygonOffset:e,polygonOffsetFactor:e?1:0,glslVersion:i.capabilities.isWebGL2?G:L}),x=new u(1.01,o.sphereSegments,o.sphereSegments),C=new f(x,S);l.add(C);let c=0;const P=e?16:8;function d(t){requestAnimationFrame(d),!(t-c<P)&&(c=t,s.uTime.value+=e?.008:.01,r.update(),i.render(l,n))}d(0),window.addEventListener("resize",()=>{n.aspect=window.innerWidth/window.innerHeight,n.updateProjectionMatrix();const t=e?Math.min(window.devicePixelRatio,1.5):window.devicePixelRatio;i.setPixelRatio(t),i.setSize(window.innerWidth,window.innerHeight)}),i.domElement.addEventListener("touchstart",t=>{t.preventDefault()},{passive:!1}),i.domElement.addEventListener("touchmove",t=>{t.preventDefault()},{passive:!1})}),(a,e)=>(U(),R("div",null,[...e[0]||(e[0]=[B("canvas",{id:"target-canvas"},null,-1)])]))}}),A=F(O,[["__scopeId","data-v-38281c92"]]);export{A as default};
