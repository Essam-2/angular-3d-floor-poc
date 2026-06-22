import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type DeviceStatus = 'online' | 'offline' | 'alarm';

interface FloorDevice {
  id: string;
  name: string;
  x: number;
  z: number;
  status: DeviceStatus;
  mesh?: THREE.Mesh;
}

@Component({
  selector: 'app-floor-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floor-3d.component.html',
  styleUrl: './floor-3d.component.scss',
})
export class Floor3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewer', { static: true }) viewerRef!: ElementRef<HTMLDivElement>;

  devices: FloorDevice[] = [
    { id: 'temp-1', name: 'Temperature Sensor', x: -4, z: -2, status: 'online' },
    { id: 'meter-1', name: 'Energy Meter', x: 2, z: 0, status: 'offline' },
    { id: 'valve-1', name: 'Water Valve', x: 4, z: 2, status: 'alarm' },
  ];

  selectedDevice?: FloorDevice;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private animationId = 0;
  private statusTimer?: number;
  private isDragging = false;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.initScene();
      this.createFloor();
      this.createWalls();
      this.createDevices();
      this.attachEvents();
      this.animate();
    });

    this.startFakeLiveStatus();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.clearInterval(this.statusTimer);
    this.renderer?.dispose();
  }

  addRandomDevice(): void {
    const id = crypto.randomUUID();
    const device: FloorDevice = {
      id,
      name: `New Device ${this.devices.length + 1}`,
      x: Math.round((Math.random() * 10 - 5) * 10) / 10,
      z: Math.round((Math.random() * 6 - 3) * 10) / 10,
      status: 'online',
    };

    this.devices = [...this.devices, device];
    this.zone.runOutsideAngular(() => this.addDeviceMesh(device));
  }

  focusDevice(id: string): void {
    const device = this.devices.find((item) => item.id === id);
    if (!device) return;
    this.selectedDevice = device;
    this.updateDeviceSelection();
    this.controls.target.set(device.x, 0, device.z);
  }

  private initScene(): void {
    const container = this.viewerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.camera.position.set(8, 8, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 8);
    this.scene.add(directional);

    window.addEventListener('resize', this.onResize);
  }

  private createFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0x263449, roughness: 0.85 })
    );
    floor.position.y = -0.075;
    floor.name = 'floor';
    this.scene.add(floor);

    const grid = new THREE.GridHelper(12, 12, 0x94a3b8, 0x334155);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  private createWalls(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });

    const addWall = (x: number, z: number, width: number, depth: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 1.8, depth), wallMaterial);
      wall.position.set(x, 0.9, z);
      this.scene.add(wall);
    };

    addWall(0, -4, 12, 0.18);
    addWall(0, 4, 12, 0.18);
    addWall(-6, 0, 0.18, 8);
    addWall(6, 0, 0.18, 8);
    addWall(0, 0, 0.18, 8);
    addWall(-3, 0, 6, 0.16);
    addWall(3.2, 1.8, 5.6, 0.16);
  }

  private createDevices(): void {
    this.devices.forEach((device) => this.addDeviceMesh(device));
  }

  private addDeviceMesh(device: FloorDevice): void {
    const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 32);
    const material = new THREE.MeshStandardMaterial({ color: this.getStatusColor(device.status) });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(device.x, 0.25, device.z);
    mesh.userData['deviceId'] = device.id;
    device.mesh = mesh;
    this.scene.add(mesh);
  }

  private attachEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  private onPointerDown = (event: PointerEvent): void => {
    const hitDevice = this.pickDevice(event);
    if (!hitDevice) return;

    this.zone.run(() => {
      this.selectedDevice = hitDevice;
      this.updateDeviceSelection();
    });

    this.isDragging = true;
    this.controls.enabled = false;
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.selectedDevice?.mesh) return;

    const point = this.getFloorPoint(event);
    if (!point) return;

    const x = THREE.MathUtils.clamp(point.x, -5.5, 5.5);
    const z = THREE.MathUtils.clamp(point.z, -3.5, 3.5);

    this.selectedDevice.x = x;
    this.selectedDevice.z = z;
    this.selectedDevice.mesh.position.set(x, 0.25, z);
  };

  private onPointerUp = (): void => {
    this.isDragging = false;
    this.controls.enabled = true;
  };

  private pickDevice(event: PointerEvent): FloorDevice | undefined {
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.devices.map((device) => device.mesh).filter(Boolean) as THREE.Mesh[];
    const hits = this.raycaster.intersectObjects(meshes);
    const deviceId = hits[0]?.object.userData['deviceId'];
    return this.devices.find((device) => device.id === deviceId);
  }

  private getFloorPoint(event: PointerEvent): THREE.Vector3 | undefined {
    this.setPointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const point = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.floorPlane, point) ?? undefined;
  }

  private setPointerFromEvent(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateDeviceSelection(): void {
    this.devices.forEach((device) => {
      if (!device.mesh) return;
      const material = device.mesh.material as THREE.MeshStandardMaterial;
      material.color.set(device.id === this.selectedDevice?.id ? 0xfacc15 : this.getStatusColor(device.status));
    });
  }

  private startFakeLiveStatus(): void {
    const statuses: DeviceStatus[] = ['online', 'offline', 'alarm'];
    this.statusTimer = window.setInterval(() => {
      const index = Math.floor(Math.random() * this.devices.length);
      const device = this.devices[index];
      device.status = statuses[Math.floor(Math.random() * statuses.length)];

      if (device.mesh && this.selectedDevice?.id !== device.id) {
        const material = device.mesh.material as THREE.MeshStandardMaterial;
        material.color.set(this.getStatusColor(device.status));
      }
    }, 2500);
  }

  private getStatusColor(status: DeviceStatus): number {
    if (status === 'online') return 0x22c55e;
    if (status === 'alarm') return 0xef4444;
    return 0x94a3b8;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = (): void => {
    const container = this.viewerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
