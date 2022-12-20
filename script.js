import * as THREE from "./lib/three.module.min.js";
import { gsap } from "./lib/gsap.js";

// 定义一个场景类
class World {
  // 初始传入参数画布canvas、高宽、相机位置。透视相机的视野范围，近平面和远平面
  constructor({
    canvas,
    width,
    height,
    cameraPosition,
    fieldOfView = 85,
    nearPlane = 0.1,
    farPlane = 100,
  }) {
    // 定义光点数量
    this.parameters = {
      count: 2000,
      max: 92.5 * Math.PI,
      a: 2,
      c: 4.5,
    };

    // 初始化场景
    this.scene = new THREE.Scene();
    // 创建一个时钟
    this.clock = new THREE.Clock();
    // TODO：
    this.data = 0;
    // 定义一个时间对象 TODO：
    this.time = { current: 0, t0: 0, t1: 0, t: 0, frequency: 0.0005 };
    // 旋转角度 TODO：
    this.angle = { x: 0, z: 0 };
    // 画布高宽，设置为填满整个屏幕
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    // 宽高比，用于设置透视相机参数
    this.aspectRatio = this.width / this.height;
    // 相机视野范围
    this.fieldOfView = fieldOfView;
    // 创建透视相机
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      this.aspectRatio,
      nearPlane,
      farPlane
    );

    // 设置相机位置
    this.camera.position.set(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z
    );

    // 将相机加入到场景里面
    this.scene.add(this.camera);

    // 创建一个渲染器，用来显示制作的场景
    this.renderer = new THREE.WebGLRenderer({
      canvas, // 渲染到传入的画布
      powerPreference: "high-performance", // 使用高性能模式
      alpha: true,
    });

    // 根据设备分辨力，缩放渲染器的大小，避免显示模糊
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);

    this.timer = 0;
    this.addToScene();
    this.addButton();

    // 开始渲染场景
    this.render();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  loop() {
    this.time.elapsed = this.clock.getElapsedTime();
    this.time.delta = Math.min(
      60,
      (this.time.current - this.time.elapsed) * 1000
    );

    // 如果播放器已存在，并且正在运行
    if (this.analyser && this.isRunning) {
      this.time.t = this.time.elapsed - this.time.t0 + this.time.t1;
      this.data = this.analyser.getAverageFrequency();
      this.data *= this.data / 2000;
      // 根据时间在X和Z轴旋转相机角度
      this.angle.x += this.time.delta * 0.001 * 0.63;
      this.angle.z += this.time.delta * 0.001 * 0.39;
      const justFinished = this.isRunning && !this.sound.isPlaying;
      // 如果已经完成整个音乐的播放
      if (justFinished) {
        // 重置时间、文本、按钮状态、运行状态等
        this.time.t1 = this.time.t;
        this.audioBtn.textContent = "Play again";
        this.audioBtn.disabled = false;
        this.isRunning = false;
        const tl = gsap.timeline();
        this.angle.x = 0;
        this.angle.z = 0;
        // 重置相机位置
        tl.to(this.camera.position, {
          x: 0,
          z: 4.5,
          duration: 4,
          ease: "expo.in",
        });
        // 重置按按钮状态
        tl.to(this.audioBtn, {
          opacity: () => 1,
          duration: 1,
          ease: "power1.out",
        });
      } else {
        // 否则正在运行，则按正余弦路径旋转相机角度
        this.camera.position.x = Math.sin(this.angle.x) * this.parameters.a;
        this.camera.position.z = Math.min(
          Math.max(Math.cos(this.angle.z) * this.parameters.c, -4.5),
          4.5
        );
      }
    }
    // 渲染相机在新位置观察场景
    this.camera.lookAt(this.scene.position);
    // 改变光点位置
    this.spiralMaterial1.uniforms.uTime.value +=
      this.time.delta * this.time.frequency * (1 + this.data * 0.2);
    // 改变反向选装的光点位置
    this.spiralMaterial.uniforms.uTime.value +=
      this.time.delta * this.time.frequency * (1 + this.data * 0.2);
    // 改变背景网络的网格大小;
    this.extMaterial.uniforms.uTime.value +=
      this.time.delta * this.time.frequency;
    // 改变以太方块角度
    for (const octa of this.octas.children) {
      octa.rotation.y += this.data
        ? (0.001 * this.time.delta * this.data) / 5
        : 0.001 * this.time.delta;
    }
    this.octas.rotation.y -= 0.0002 * this.time.delta;
    // 旋转背景网络;
    this.externalSphere.rotation.y += 0.0001 * this.time.delta;
    // 重新渲染场景
    this.render();

    this.time.current = this.time.elapsed;
    requestAnimationFrame(this.loop.bind(this));
  }
  // 创建光点，并把它们加入到场景里面
  addSpiral(reverse) {
    // 使用自定义shader渲染的材质
    const spiralM = new THREE.ShaderMaterial({
      // 使用GLSL创建的顶点着色器的字符转
      vertexShader: document.getElementById(
        reverse ? "vertexShader1" : "vertexShader"
      ).textContent,
      // 使用GLSL创建的片元着色器的字符转
      fragmentShader: document.getElementById(
        reverse ? "fragmentShader" : "fragmentShader"
      ).textContent,
      // 传递值到Shader内部供其实用
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.045 },
      },
      blending: THREE.AdditiveBlending, // 材质混合模式使用，使用附加模式。边缘模糊
    });
    if (reverse) {
      this.spiralMaterial1 = spiralM;
    } else {
      this.spiralMaterial = spiralM;
    }

    // 光点数量
    const count = this.parameters.count; //2000

    // 定义每个光点缩放颜色大小等值，传入顶点着色器的字符转中去执行
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const phis = new Float32Array(count);
    const randoms = new Float32Array(count);
    const colorChoices = ["pink", "green", "cyan", "wheat", "red"];

    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.instancedGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach((attr) => {
      this.instancedGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.instancedGeometry.index = squareGeometry.index;
    this.instancedGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const i3 = 3 * i;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      phis[i] = Math.random() * this.parameters.max;
      randoms[i] = Math.random();
      scales[i] = Math.random();
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    this.instancedGeometry.setAttribute(
      "phi",
      new THREE.InstancedBufferAttribute(phis, 1, false)
    );

    this.instancedGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false)
    );

    this.instancedGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false)
    );

    this.instancedGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false)
    );

    // 根据描述生成光点物
    const mySpiral = new THREE.Mesh(this.instancedGeometry, spiralM);
    mySpiral.rotateY(2.25);
    // 将光点加入到场景中
    this.scene.add(mySpiral);
  }

  // 生成背后的网状结构，并加入到场景中
  addExternalSphere() {
    this.extMaterial = new THREE.ShaderMaterial({
      vertexShader: document.getElementById("vertexShaderExt").textContent,
      fragmentShader: document.getElementById("fragmentShaderExt").textContent,
      uniforms: {
        uTime: { value: 0 },
      },

      wireframe: true, //网状结构
      transparent: true, //透明
    });

    const geometry = new THREE.SphereGeometry(6, 128, 128);
    // 生成材质
    this.externalSphere = new THREE.Mesh(geometry, this.extMaterial);
    this.scene.add(this.externalSphere);
  }
  addOctahedron({ color = "white", scale, position = [0, 0, 0] }) {
    const octa = new THREE.Mesh(
      this.octaGeometry,
      new THREE.MeshBasicMaterial({
        wireframe: true,
        color,
      })
    );

    octa.scale.set(...scale);
    octa.position.set(...position);
    this.octas.add(octa);
  }

  // 分别加入五个以太方块
  addOctahedrons() {
    this.octas = new THREE.Group();
    // 调用原生方法生成八面缓冲几何体
    this.octaGeometry = new THREE.OctahedronGeometry(0.2, 0);
    this.addOctahedron({ color: "red", scale: [1, 1.4, 1] });
    this.addOctahedron({
      color: "tomato",
      position: [0, 0.85, 0],
      scale: [0.5, 0.7, 0.5],
    });

    this.addOctahedron({
      color: "red",
      position: [1, -0.75, 0],
      scale: [0.5, 0.7, 0.5],
    });

    this.addOctahedron({
      color: "tomato",
      position: [-0.75, -1.75, 0],
      scale: [1, 1.2, 1],
    });

    this.addOctahedron({
      color: "red",
      position: [0.5, -1.2, 0.5],
      scale: [0.25, 0.37, 0.25],
    });
    // 将五个以太加入到场景
    this.scene.add(this.octas);
  }
  addToScene() {
    // 加入光点到场景
    this.addSpiral();
    // 加入反向旋转的光点
    this.addSpiral(true);
    // 加入背景网格
    this.addExternalSphere();
    // 加入以太方块
    this.addOctahedrons();
  }
  // 未按钮添加绑定事件
  addButton() {
    this.audioBtn = document.querySelector("button");
    this.audioBtn.addEventListener("click", () => {
      // 点击后设置按钮不可用
      this.audioBtn.disabled = true;
      // 如果已经有了音频播放器就直接播放
      if (this.analyser) {
        this.sound.play();
        this.time.t0 = this.time.elapsed;
        this.data = 0;
        this.isRunning = true;
        gsap.to(this.audioBtn, {
          opacity: 0,
          duration: 1,
          ease: "power1.out",
        });
      } else {
        // 否则第一次就加载音乐
        this.audioBtn.textContent = "Loading...";
        this.loadMusic();
      }
    });
  }

  loadMusic() {
    // 为相机添加音频监听
    const listener = new THREE.AudioListener();
    this.camera.add(listener);
    this.sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(
      "./res/Mistletoe.mp3",
      (buffer) => {
        // 设置音频数据
        this.sound.setBuffer(buffer);
        // 设置音乐循环
        this.sound.setLoop(false);
        // 设置音量大小
        this.sound.setVolume(0.1);
        // 播放
        this.sound.play();
        // 赋值音频管理器
        this.analyser = new THREE.AudioAnalyser(this.sound, 32);
        this.isRunning = true;
        this.t0 = this.time.elapsed;
      },
      (progress) => {
        // 资源加载完成后，隐藏按钮
        gsap.to(this.audioBtn, {
          opacity: () => 0,
          duration: 1,
          ease: "power1.out",
        });
      }
    );
  }
}

// 创建场景，定义相机位置
const world = new World({
  canvas: document.querySelector("canvas.webgl"),
  cameraPosition: { x: 0, y: 0, z: 4.5 },
});

// 开始执行
world.loop();
