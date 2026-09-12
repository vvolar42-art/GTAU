// --- 1. CONFIGURACIÓN DEL MOTOR Y MUNDO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec0ee);
scene.fog = new THREE.FogExp2(0x7ec0ee, 0.001); 

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 6000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 0.9);
sunLight.position.set(500, 1000, 600);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 3500;
const d = 800;
sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

// Suelo Principal 
const groundGeo = new THREE.PlaneGeometry(6000, 6000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d7c3f, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- 2. GENERACIÓN PROCEDURAL (Montañas y Múltiples Ciudades) ---
const vehiculos = [];

function generarMontanas() {
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2d4c2a, roughness: 0.95 });
    for (let i = 0; i < 70; i++) {
        let angle = (i / 70) * Math.PI * 2;
        let radius = 2000 + Math.random() * 400; 
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;
        let h = 400 + Math.random() * 500; 
        let r = 250 + Math.random() * 150; 
        let mGeo = new THREE.ConeGeometry(r, h, 6);
        let mountain = new THREE.Mesh(mGeo, mountainMat);
        mountain.position.set(x, h/2, z);
        mountain.rotation.y = Math.random() * Math.PI;
        mountain.castShadow = true;
        scene.add(mountain);
    }
}
generarMontanas();

const buildingMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x99aab5, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0xd0d5dd, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0x556068, roughness: 0.6 })
];

function generarCiudad(centroX, centroZ, filas, columnas, tamBloque, anchoCalle) {
    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < columnas; c++) {
            let x = centroX + (c - columnas / 2) * (tamBloque + anchoCalle);
            let z = centroZ + (f - filas / 2) * (tamBloque + anchoCalle);

            const blockGeo = new THREE.BoxGeometry(tamBloque, 0.1, tamBloque);
            const blockMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            const block = new THREE.Mesh(blockGeo, blockMat);
            block.position.set(x, 0.05, z);
            block.receiveShadow = true;
            scene.add(block);

            let alturaEdificio = Math.floor(Math.random() * 80) + 30; 
            let matEdif = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
            const edifGeo = new THREE.BoxGeometry(tamBloque - 8, alturaEdificio, tamBloque - 8); 
            const edificio = new THREE.Mesh(edifGeo, matEdif);
            edificio.position.set(x, alturaEdificio / 2, z);
            edificio.castShadow = true;
            edificio.receiveShadow = true;
            scene.add(edificio);
        }
    }
}

// Ciudad Principal 
generarCiudad(0, -200, 8, 8, 45, 25);
// Ciudad Secundaria 
generarCiudad(800, 400, 5, 5, 35, 18);
// Pueblo Secundario 
generarCiudad(-900, -600, 4, 4, 40, 20);

// --- 3. VEHÍCULOS Y JUGADOR ---
function crearCoche(x, z, colorHex) {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 4.2), bodyMat);
    body.position.y = 0.6; body.castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.2), bodyMat);
    roof.position.set(0, 1.3, -0.2); roof.castShadow = true;
    car.add(body, roof);
    car.position.set(x, 0, z);
    scene.add(car);
    vehiculos.push({ tipo: 'coche', mesh: car, speed: 0, heading: 0 });
}

function crearAvion(x, z, colorHex) {
    const plane = new THREE.Group();
    const planeMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.4, roughness: 0.3 });
    const fuse = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 9), planeMat);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 2.5), planeMat);
    const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1.8), planeMat);
    fuse.position.y = 1.1; wings.position.set(0, 1.2, 0.5); tailPlane.position.set(0, 1.6, -3.8);
    fuse.castShadow = true; wings.castShadow = true;
    plane.add(fuse, wings, tailPlane);
    plane.position.set(x, 0, z);
    scene.add(plane);
    vehiculos.push({ tipo: 'avion', mesh: plane, speed: 0, heading: 0, pitch: 0 });
}

const pistaGeo = new THREE.PlaneGeometry(50, 600);
const pistaMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 });
const pista = new THREE.Mesh(pistaGeo, pistaMat);
pista.rotation.x = -Math.PI / 2; pista.position.set(300, 0.1, 200);
scene.add(pista);

crearCoche(20, 0, 0xcc2222); 
crearCoche(-30, 25, 0x2244cc); 
crearAvion(300, 300, 0xeeeeee); 

const playerGroup = new THREE.Group();
const playerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
playerBody.position.y = 0.9; playerBody.castShadow = true;
playerGroup.add(playerBody);
playerGroup.position.set(0, 0, 25);
scene.add(playerGroup);

// --- 4. CONTROLES Y ESTADO ---
let estado = { activo: 'a_pie', vehiculoActual: null };
let input = { joyX: 0, joyY: 0, gas: 0, brake: 0 };

const joystick = nipplejs.create({ zone: document.getElementById('joy-left'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });

joystick.on('move', (e, data) => {
    input.joyX = Math.cos(data.angle.radian) * Math.min(data.force, 1);
    input.joyY = Math.sin(data.angle.radian) * Math.min(data.force, 1);
});
joystick.on('end', () => { input.joyX = 0; input.joyY = 0; });

const btnGas = document.getElementById('btn-gas');
const btnBrake = document.getElementById('btn-brake');

const pressGas = (e) => { e.preventDefault(); input.gas = 1; };
const releaseGas = (e) => { e.preventDefault(); input.gas = 0; };
const pressBrake = (e) => { e.preventDefault(); input.brake = 1; };
const releaseBrake = (e) => { e.preventDefault(); input.brake = 0; };

['mousedown', 'touchstart'].forEach(evt => {
    btnGas.addEventListener(evt, pressGas, {passive: false});
    btnBrake.addEventListener(evt, pressBrake, {passive: false});
});
['mouseup', 'touchend', 'mouseleave', 'touchcancel'].forEach(evt => {
    btnGas.addEventListener(evt, releaseGas, {passive: false});
    btnBrake.addEventListener(evt, releaseBrake, {passive: false});
});

document.getElementById('btn-action').addEventListener('click', () => {
    if (estado.activo === 'a_pie') {
        let vehiculoCercano = null; let distanciaMin = 8;
        vehiculos.forEach(v => {
            if (playerGroup.position.distanceTo(v.mesh.position) < distanciaMin) {
                distanciaMin = playerGroup.position.distanceTo(v.mesh.position); vehiculoCercano = v;
            }
        });
        if (vehiculoCercano) {
            estado.activo = 'conduciendo'; estado.vehiculoActual = vehiculoCercano; playerGroup.visible = false;
        }
    } else {
        let v = estado.vehiculoActual;
        playerGroup.position.copy(v.mesh.position);
        playerGroup.position.x += Math.cos(v.heading) * 3; playerGroup.position.z -= Math.sin(v.heading) * 3; playerGroup.position.y = 0;
        playerGroup.visible = true; estado.activo = 'a_pie'; estado.vehiculoActual = null;
    }
});

// --- 5. FÍSICAS MEJORADAS DE MOVIMIENTO ---
let playerHeading = 0;

function animate() {
    requestAnimationFrame(animate);
    let aceleracion = input.gas - input.brake;

    if (estado.activo === 'a_pie') {
        if (input.joyX !== 0) {
            playerHeading -= input.joyX * 0.05;
            playerGroup.rotation.y = playerHeading;
        }
        if (input.joyY !== 0) {
            let walkSpeed = input.joyY * 0.18; 
            playerGroup.position.x += Math.sin(playerHeading) * walkSpeed;
            playerGroup.position.z += Math.cos(playerHeading) * walkSpeed;
        }

        camera.position.x = playerGroup.position.x - Math.sin(playerHeading) * 8;
        camera.position.y = playerGroup.position.y + 3.5;
        camera.position.z = playerGroup.position.z - Math.cos(playerHeading) * 8;
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z);

    } else if (estado.vehiculoActual) {
        let v = estado.vehiculoActual;
        
        if (v.tipo === 'coche') {
            if (aceleracion !== 0) { v.speed += aceleracion * 0.03; } 
            else { v.speed *= 0.95; }
            
            if (v.speed > 1.3) v.speed = 1.3;
            if (v.speed < -0.5) v.speed = -0.5;

            if (Math.abs(v.speed) > 0.01 && input.joyX !== 0) {
                v.heading -= input.joyX * 0.05 * Math.sign(v.speed); 
            }
            
            v.mesh.rotation.y = v.heading;
            v.mesh.position.x += Math.sin(v.heading) * v.speed;
            v.mesh.position.z += Math.cos(v.heading) * v.speed;

            camera.position.x = v.mesh.position.x - Math.sin(v.heading) * 14;
            camera.position.y = v.mesh.position.y + 4.5;
            camera.position.z = v.mesh.position.z - Math.cos(v.heading) * 14;
            camera.lookAt(v.mesh.position.x, v.mesh.position.y + 1, v.mesh.position.z);

        // ===== INICIO DE CAMBIOS DEL AVIÓN =====
        } else if (v.tipo === 'avion') {
            // Físicas base de aceleración
            v.speed += aceleracion * 0.04;
            v.speed *= 0.98; // Fricción del aire
            if (v.speed > 2.5) v.speed = 2.5; 
            if (v.speed < 0) v.speed = 0;
            
            // COPIAR EL JOYSTICK: Rotación continua e ininterrumpida
            if (input.joyX !== 0) {
                v.heading -= input.joyX * 0.05; // Gira a los lados constantemente
            }
            if (input.joyY !== 0) {
                v.pitch += input.joyY * 0.05; // Cabecea arriba/abajo constantemente
            }
            
            v.pitch *= 0.92; // Retorno suave al centro si sueltas el joystick
            
            // Aplicar rotaciones
            v.mesh.rotation.x = -v.pitch;
            v.mesh.rotation.y = v.heading;
            v.mesh.rotation.z = input.joyX * 0.6; // Alabeo (inclinación lateral visual)

            // Físicas de vuelo (sustentación y gravedad)
            let sustentacion = v.speed * 0.35;
            let gravedad = 0.18;
            
            if (v.mesh.position.y > 0 || sustentacion > gravedad) {
                v.mesh.position.y += (sustentacion - gravedad) + (v.pitch * v.speed * 0.8);
            }
            if (v.mesh.position.y < 0) v.mesh.position.y = 0; // Suelo
            
            // Movimiento espacial
            v.mesh.position.x += Math.sin(v.heading) * v.speed;
            v.mesh.position.z += Math.cos(v.heading) * v.speed;

            // Seguimiento de cámara
            camera.position.x = v.mesh.position.x - Math.sin(v.heading) * 22;
            camera.position.y = v.mesh.position.y + 7;
            camera.position.z = v.mesh.position.z - Math.cos(v.heading) * 22;
            camera.lookAt(v.mesh.position.x, v.mesh.position.y + 1, v.mesh.position.z);
        }
        // ===== FIN DE CAMBIOS DEL AVIÓN =====
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
