// --- 1. CONFIGURACIÓN DEL MOTOR Y MUNDO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec0ee); // Cielo más estilizado
scene.fog = new THREE.FogExp2(0x7ec0ee, 0.0012); // Niebla atmosférica suave

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminación mejorada (Gráficos mejorados)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 0.9);
sunLight.position.set(300, 800, 400);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 2500;
const d = 600;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

// Suelo Principal (Mundo Grande de 4000x4000)
const groundGeo = new THREE.PlaneGeometry(4000, 4000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d7c3f, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- 2. GENERACIÓN DE LA CIUDAD Y OBJETOS ---
const vehiculos = [];
const obstaculos = [];

// Materiales de edificios y ciudad
const buildingMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x99aab5, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color: 0xd0d5dd, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0x556068, roughness: 0.6 })
];

// Generar una Ciudad Central completa
function generarCiudad(centroX, centroZ, filas, columnas, espacio) {
    const anchoCalle = 14;
    const tamBloque = 22;

    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < columnas; c++) {
            let x = centroX + (c - columnas / 2) * (tamBloque + anchoCalle);
            let z = centroZ + (f - filas / 2) * (tamBloque + anchoCalle);

            // Suelo de asfalto/bloque para la ciudad
            const blockGeo = new THREE.BoxGeometry(tamBloque, 0.1, tamBloque);
            const blockMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
            const block = new THREE.Mesh(blockGeo, blockMat);
            block.position.set(x, 0.05, z);
            block.receiveShadow = true;
            scene.add(block);

            // Edificios variados en el bloque
            let alturaEdificio = Math.floor(Math.random() * 60) + 20;
            let matEdif = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
            const edifGeo = new THREE.BoxGeometry(tamBloque - 4, alturaEdificio, tamBloque - 4);
            const edificio = new THREE.Mesh(edifGeo, matEdif);
            edificio.position.set(x, alturaEdificio / 2, z);
            edificio.castShadow = true;
            edificio.receiveShadow = true;
            scene.add(edificio);
            obstaculos.push(edificio);
        }
    }
}

// Creamos una gran ciudad en el sector central
generarCiudad(0, -200, 6, 6, 15);

// Crear un Coche Aparcado
function crearCoche(x, z, colorHex) {
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 4.2), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    
    // Techo del coche
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.2), bodyMat);
    roof.position.set(0, 1.3, -0.2);
    roof.castShadow = true;
    
    car.add(body, roof);
    car.position.set(x, 0, z);
    scene.add(car);
    
    vehiculos.push({ tipo: 'coche', mesh: car, speed: 0, heading: 0 });
}

// Crear un Avión Aparcado en el Aeropuerto
function crearAvion(x, z, colorHex) {
    const plane = new THREE.Group();
    const planeMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.4, roughness: 0.3 });
    const fuse = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 9), planeMat);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 2.5), planeMat);
    const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1.8), planeMat);
    
    fuse.position.y = 1.1; 
    wings.position.set(0, 1.2, 0.5);
    tailPlane.position.set(0, 1.6, -3.8);
    
    fuse.castShadow = true; wings.castShadow = true;
    plane.add(fuse, wings, tailPlane);
    plane.position.set(x, 0, z);
    scene.add(plane);
    
    vehiculos.push({ tipo: 'avion', mesh: plane, speed: 0, heading: 0, pitch: 0 });
}

// Pista de Aeropuerto y aviones/coches de prueba
const pistaGeo = new THREE.PlaneGeometry(40, 450);
const pistaMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.9 });
const pista = new THREE.Mesh(pistaGeo, pistaMat);
pista.rotation.x = -Math.PI / 2;
pista.position.set(300, 0.1, 100);
scene.add(pista);

crearCoche(15, 0, 0xcc2222); // Coche rojo cerca de la ciudad
crearCoche(-15, 10, 0x2244cc); // Coche azul
crearAvion(300, 150, 0xeeeeee); // Avión en el aeropuerto

// --- 3. JUGADOR (A pie) ---
const playerGroup = new THREE.Group();
const playerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.8, 12),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 })
);
playerBody.position.y = 0.9;
playerBody.castShadow = true;
playerGroup.add(playerBody);
playerGroup.position.set(0, 0, 15);
scene.add(playerGroup);

// --- 4. CONTROLES Y ESTADO ---
let estado = {
    activo: 'a_pie', // 'a_pie' o índice de vehículo
    vehiculoActual: null
};

let input = { joyX: 0, joyY: 0, gas: 0, brake: 0 };

const joystick = nipplejs.create({ 
    zone: document.getElementById('joy-left'), 
    mode: 'static', 
    position: { left: '50%', top: '50%' }, 
    color: 'white' 
});

joystick.on('move', (e, data) => {
    // Invertido el eje Y para que arriba sea hacia adelante y abajo hacia atrás de forma natural
    input.joyX = -Math.cos(data.angle.radian) * Math.min(data.force, 1);
    input.joyY = -Math.sin(data.angle.radian) * Math.min(data.force, 1);
});
joystick.on('end', () => { input.joyX = 0; input.joyY = 0; });

const btnGas = document.getElementById('btn-gas');
const btnBrake = document.getElementById('btn-brake');

const pressGas = () => input.gas = 1;
const releaseGas = () => input.gas = 0;
const pressBrake = () => input.brake = 1;
const releaseBrake = () => input.brake = 0;

btnGas.addEventListener('mousedown', pressGas); btnGas.addEventListener('touchstart', pressGas);
window.addEventListener('mouseup', releaseGas); window.addEventListener('touchend', releaseGas);
btnBrake.addEventListener('mousedown', pressBrake); btnBrake.addEventListener('touchstart', pressBrake);
window.addEventListener('mouseup', releaseBrake); window.addEventListener('touchend', releaseBrake);

// --- 5. INTERACCIÓN (Entrar / Salir de Vehículos) ---
document.getElementById('btn-action').addEventListener('click', () => {
    if (estado.activo === 'a_pie') {
        let vehiculoCercano = null;
        let distanciaMin = 8;

        vehiculos.forEach(v => {
            let dist = playerGroup.position.distanceTo(v.mesh.position);
            if (dist < distanciaMin) {
                distanciaMin = dist;
                vehiculoCercano = v;
            }
        });

        if (vehiculoCercano) {
            estado.activo = 'conduciendo';
            estado.vehiculoActual = vehiculoCercano;
            playerGroup.visible = false;
        }
    } else {
        let v = estado.vehiculoActual;
        playerGroup.position.copy(v.mesh.position);
        playerGroup.position.x += Math.cos(v.heading) * 3;
        playerGroup.position.z -= Math.sin(v.heading) * 3;
        playerGroup.position.y = 0;
        
        playerGroup.visible = true;
        estado.activo = 'a_pie';
        estado.vehiculoActual = null;
    }
});

// --- 6. BUCLE PRINCIPAL Y FÍSICAS ---
let playerHeading = 0;

function animate() {
    requestAnimationFrame(animate);
    
    let aceleracion = input.gas - input.brake;

    if (estado.activo === 'a_pie') {
        // Movimiento del personaje adaptado al joystick (Arriba = Adelante, Abajo = Atrás)
        if (input.joyX !== 0 || input.joyY !== 0) {
            playerHeading = Math.atan2(input.joyX, input.joyY);
            playerGroup.rotation.y = playerHeading;
            
            let walkSpeed = 0.16;
            playerGroup.position.x += Math.sin(playerHeading) * walkSpeed;
            playerGroup.position.z += Math.cos(playerHeading) * walkSpeed;
        }

        // Cámara en tercera persona para el personaje
        camera.position.x = playerGroup.position.x - Math.sin(playerHeading) * 8;
        camera.position.y = playerGroup.position.y + 3.5;
        camera.position.z = playerGroup.position.z - Math.cos(playerHeading) * 8;
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z);

    } else if (estado.vehiculoActual) {
        let v = estado.vehiculoActual;
        
        if (v.tipo === 'coche') {
            // Bug del coche solucionado: Inercia suave y control constante sin bloqueos
            if (aceleracion !== 0) {
                v.speed += aceleracion * 0.025;
            } else {
                v.speed *= 0.96; // Fricción suave natural
            }
            
            // Limitar velocidad máxima
            if (v.speed > 1.2) v.speed = 1.2;
            if (v.speed < -0.4) v.speed = -0.4;

            if (Math.abs(v.speed) > 0.01) {
                v.heading += input.joyX * 0.045 * Math.sign(v.speed); 
            }
            
            v.mesh.rotation.y = v.heading;
            v.mesh.position.x += Math.sin(v.heading) * v.speed;
            v.mesh.position.z += Math.cos(v.heading) * v.speed;

            // Cámara del coche fluida
            camera.position.x = v.mesh.position.x - Math.sin(v.heading) * 14;
            camera.position.y = v.mesh.position.y + 4.5;
            camera.position.z = v.mesh.position.z - Math.cos(v.heading) * 14;
            camera.lookAt(v.mesh.position.x, v.mesh.position.y + 1, v.mesh.position.z);

        } else if (v.tipo === 'avion') {
            // Manejabilidad del avión mejorada (muy ágil)
            v.speed += aceleracion * 0.04;
            v.speed *= 0.98;
            if (v.speed > 2.5) v.speed = 2.5;
            if (v.speed < 0) v.speed = 0;
            
            v.heading += input.joyX * 0.04; // Giro rápido
            v.pitch += input.joyY * 0.045;   // Control de altura inmediato
            v.pitch *= 0.95;
            
            v.mesh.rotation.x = -v.pitch;
            v.mesh.rotation.y = v.heading;
            v.mesh.rotation.z = -input.joyX * 0.6; // Inclinación acentuada al girar

            let sustentacion = v.speed * 0.35;
            let gravedad = 0.18;
            
            if (v.mesh.position.y > 0 || sustentacion > gravedad) {
                v.mesh.position.y += (sustentacion - gravedad) + (v.pitch * v.speed * 0.8);
            }
            if (v.mesh.position.y < 0) v.mesh.position.y = 0;
            
            v.mesh.position.x += Math.sin(v.heading) * v.speed;
            v.mesh.position.z += Math.cos(v.heading) * v.speed;

            // Cámara del avión amplia y dinámica
            camera.position.x = v.mesh.position.x - Math.sin(v.heading) * 22;
            camera.position.y = v.mesh.position.y + 7;
            camera.position.z = v.mesh.position.z - Math.cos(v.heading) * 22;
            camera.lookAt(v.mesh.position.x, v.mesh.position.y + 1, v.mesh.position.z);
        }
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
