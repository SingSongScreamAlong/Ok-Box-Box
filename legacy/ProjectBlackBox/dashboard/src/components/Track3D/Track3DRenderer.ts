import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

export interface Track3DConfig {
    container: HTMLElement;
    width: number;
    height: number;
    isDarkTheme?: boolean;
}

export class Track3DRenderer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private composer: EffectComposer;
    private animationId: number | null = null;
    // Camera State
    private cameraMode: 'orbit' | 'follow' | 'cockpit' = 'orbit';
    private targetCarId: string | null = null;
    private cameraOffset = new THREE.Vector3(0, 10, -20);
    private cameraLookAt = new THREE.Vector3(0, 0, 0);

    // Scene objects
    private trackMesh: THREE.Mesh | null = null;
    private carMeshes: Map<string, THREE.Mesh> = new Map();
    private gridHelper: THREE.GridHelper | null = null;

    constructor(config: Track3DConfig) {
        // 1. Initialize Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(config.isDarkTheme ? 0x111111 : 0xf0f0f0);
        this.scene.fog = new THREE.Fog(config.isDarkTheme ? 0x111111 : 0xf0f0f0, 100, 1000);

        // 2. Initialize Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            config.width / config.height,
            0.1,
            5000
        );
        this.camera.position.set(0, 50, 50);

        // 3. Initialize Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(config.width, config.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        config.container.appendChild(this.renderer.domElement);

        // 4. Initialize Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground

        // 5. Initialize Post-Processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(config.width, config.height),
            1.5, // Strength
            0.4, // Radius
            0.85 // Threshold
        );
        this.composer.addPass(bloomPass);

        // 6. Add Lighting
        this.setupLighting();

        // 7. Add Helpers
        this.gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);

        // Start loop
        this.animate();
    }

    public setCameraMode(mode: 'orbit' | 'follow' | 'cockpit', targetDriverId?: string) {
        this.cameraMode = mode;
        if (targetDriverId) this.targetCarId = targetDriverId;

        if (mode === 'orbit') {
            this.controls.enabled = true;
        } else {
            this.controls.enabled = false;
        }
    }

    private setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(100, 200, 100);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);

        // Add rim light for better 3D definition
        const rimLight = new THREE.SpotLight(0x4444ff, 2.0);
        rimLight.position.set(-100, 50, -100);
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);
    }

    public updateDimensions(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    public updateCarPosition(driverId: string, position: { x: number, y: number, z: number }, rotationY: number = 0) {
        let carMesh = this.carMeshes.get(driverId);

        if (!carMesh) {
            // Create a more detailed car representation
            const carGroup = new THREE.Group();

            // Body
            const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4.5);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: driverId === 'driver-1' ? 0xff0000 : 0x0000ff,
                roughness: 0.2,
                metalness: 0.7
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.4;
            body.castShadow = true;
            carGroup.add(body);

            // Cabin
            const cabinGeo = new THREE.BoxGeometry(1.4, 0.6, 2);
            const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
            const cabin = new THREE.Mesh(cabinGeo, cabinMat);
            cabin.position.y = 1.0;
            cabin.position.z = -0.5;
            carGroup.add(cabin);

            // Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
            wheelGeo.rotateZ(Math.PI / 2);
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

            const fl = new THREE.Mesh(wheelGeo, wheelMat); fl.position.set(1.1, 0.4, 1.5); carGroup.add(fl);
            const fr = new THREE.Mesh(wheelGeo, wheelMat); fr.position.set(-1.1, 0.4, 1.5); carGroup.add(fr);
            const rl = new THREE.Mesh(wheelGeo, wheelMat); rl.position.set(1.1, 0.4, -1.5); carGroup.add(rl);
            const rr = new THREE.Mesh(wheelGeo, wheelMat); rr.position.set(-1.1, 0.4, -1.5); carGroup.add(rr);

            // Wrapper mesh for type compatibility
            // In a real app we'd load a GLTF model here
            carMesh = carGroup as unknown as THREE.Mesh;

            this.scene.add(carMesh);
            this.carMeshes.set(driverId, carMesh);
        }

        // Update position
        carMesh.position.set(position.x, position.y, position.z);

        // Update rotation (look at next point or use yaw)
        carMesh.rotation.y = rotationY;

        // Update camera if following this car
        if (this.targetCarId === driverId && this.cameraMode !== 'orbit') {
            this.updateCameraFollow(carMesh);
        }
    }

    private updateCameraFollow(target: THREE.Object3D) {
        const targetPos = target.position.clone();
        const rotation = target.rotation.y;

        if (this.cameraMode === 'follow') {
            // Smooth follow camera
            const offset = new THREE.Vector3(0, 8, -15);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            const desiredPos = targetPos.clone().add(offset);
            this.camera.position.lerp(desiredPos, 0.1);
            this.camera.lookAt(targetPos);
        } else if (this.cameraMode === 'cockpit') {
            // Cockpit view
            const offset = new THREE.Vector3(0, 0.8, 0.5);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            this.camera.position.copy(targetPos.clone().add(offset));

            const lookOffset = new THREE.Vector3(0, 0.8, 10);
            lookOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            this.camera.lookAt(targetPos.clone().add(lookOffset));
        }
    }

    public renderTrack(coordinates: { x: number, y: number, z: number }[]) {
        if (this.trackMesh) {
            this.scene.remove(this.trackMesh);
            if (this.trackMesh.geometry) this.trackMesh.geometry.dispose();
            if (Array.isArray(this.trackMesh.material)) {
                this.trackMesh.material.forEach(m => m.dispose());
            } else {
                this.trackMesh.material.dispose();
            }
        }

        if (coordinates.length < 2) return;

        // Create the curve from points
        const points = coordinates.map(c => new THREE.Vector3(c.x, c.y, c.z));
        // Close the loop if it's a circuit (distance between first and last point is small)
        const isClosed = points[0].distanceTo(points[points.length - 1]) < 20;
        const curve = new THREE.CatmullRomCurve3(points, isClosed);

        // Create Tube Geometry
        const tubularSegments = coordinates.length * 5;
        const radius = 8; // Track width approx 16m
        const radialSegments = 12;
        const closed = isClosed;

        const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);

        // Create Material (Asphalt look)
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        this.trackMesh = new THREE.Mesh(geometry, material);
        this.trackMesh.receiveShadow = true;
        this.trackMesh.castShadow = true;
        this.scene.add(this.trackMesh);

        // Center camera on track
        const box = new THREE.Box3().setFromObject(this.trackMesh);
        const center = box.getCenter(new THREE.Vector3());
        this.controls.target.copy(center);

        // Adjust camera position to see the whole track
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
        cameraZ *= 1.5; // Zoom out a bit

        this.camera.position.set(center.x, center.y + cameraZ, center.z + cameraZ);
        this.camera.lookAt(center);
        this.controls.update();
    }

    private animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        this.controls.update();
        this.composer.render();
    }

    public dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.renderer.dispose();
        this.controls.dispose();

        // Dispose scene objects
        if (this.trackMesh) {
            this.scene.remove(this.trackMesh);
            this.trackMesh.geometry.dispose();
            (this.trackMesh.material as THREE.Material).dispose();
        }

        this.carMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        });

        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
        }
    }
}
