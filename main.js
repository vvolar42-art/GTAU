// --- 1. CONFIGURACIÓN DEL MOTOR 3D ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 100, 400); // Niebla para rendimiento y realismo

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); // Antialias false para móviles
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(200, 300, 100);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -300; sunLight.shadow.camera.right = 300;
sunLight.shadow.camera.top = 300; sunLight.shadow.camera.bottom = -300;
scene.add(sunLight);

// --- 2. GENERACIÓN DEL MUNDO (Leyendo la lógica del JSON) ---
// Simulamos la carga del JSON para que funcione directamente sin servidor local
const mapData = {
    "mundo": { "tamano": 1000, "limite_agua": 480 },
    "biomas": [
        { "tipo": "ciudad", "x": 100, "z": 100, "radio": 80, "densidad": 50 },
        { "tipo": "ciudad", "x": -200, "z": -150, "radio": 60, "densidad": 40 },
        { "tipo": "ciudad", "x": 250, "z": -200, "radio": 70, "densidad": 35 },
        { "tipo": "bosque", "x": -250, "z": 100, "radio": 100, "densidad": 80 },
        { "tipo": "desierto", "x": 200, "z": -300, "radio": 150 },
        { "tipo": "aeropuerto", "x": 0, "z": 300, "largo": 200, "ancho": 20 }
    ]
};

// Isla Principal
const groundGeo = new THREE.PlaneGeometry(mapData.mundo.tamano, mapData.mundo.tamano);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x3b5e2b }); // Verde pasto
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Océano (Límites)
const oceanGeo = new THREE.PlaneGeometry(3000, 3000);
const oceanMat = new THREE.MeshBasicMaterial({ color: 0x1c4a75 });
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -2;
scene.add(ocean);

// Arrays para físicas y tráfico
const obstaculos = [];
const vehiculosIA = [];

// Generador Procedural basado en el mapa
const materialEdificio = new THREE.MeshLambertMaterial({ color: 0x888888 });
const materialArbol = new THREE.MeshLambertMaterial({ color: 0x1e4a1a });
const materialDesierto = new THREE.MeshLambertMaterial({ color: 0xc2b280 });
const materialPista = new THREE.MeshLambertMaterial({ color: 0x333333 });

mapData.biomas.forEach(bioma => {
    if (bioma.tipo === "ciudad") {
        const asfaltoGeo = new THREE.PlaneGeometry(bioma.radio * 2, bioma.radio * 2);
        const asfalto = new THREE.Mesh(asfaltoGeo, materialPista);
        asfalto.rotation.x = -Math.PI / 2;
        asfalto.position.set(bioma.x, 0.1, bioma.z);
        scene.add(asfalto);

        for (let i = 0; i < bioma.densidad; i++) {
            const h = Math.random() * 30 + 10; // Altura de edificios
            const bGeo = new THREE.BoxGeometry(10, h, 10);
            const edificio = new THREE.Mesh(bGeo, materialEdificio);
            edificio.position.set(
                bioma.x + (Math.random() * bioma.radio * 2 - bioma.radio),
                h / 2,
                bioma.z + (Math.random() * bioma.radio * 2 - bioma.radio)
            );
            edificio.castShadow = true;
            edificio.receiveShadow = true;
            scene.add(edificio);
            obstaculos.push(edificio);
        }
    } else if (bioma.tipo === "bosque") {
        for (let i = 0; i < bioma.densidad; i++) {
            const tGeo = new THREE.ConeGeometry(3, 10, 5);
            const arbol = new THREE.Mesh(tGeo, materialArbol);
            arbol.position.set(
                bioma.x + (Math.random() * bioma.radio * 2 - bioma.radio),
                5,
                bioma.z + (Math.random() * bioma.radio * 2 - bioma.radio)
            );
            arbol.castShadow = true;
            scene.add(arbol);
        }
    } else if (bioma.tipo === "desierto") {
        const arenaGeo = new THREE.PlaneGeometry(bioma.radio * 2, bioma.radio * 2);
        const arena = new THREE.Mesh(arenaGeo, materialDesierto);
        arena.rotation.x = -Math.PI / 2;
        arena.position.set(bioma.x, 0.2, bioma.z);
        scene.add(arena);
    } else if (bioma.tipo === "aeropuerto") {
        const pistaGeo = new THREE.PlaneGeometry(bioma.ancho, bioma.largo);
        const pista = new THREE.Mesh(pistaGeo, materialPista);
        pista.rotation.x = -Math.PI / 2;
        pista.position.set(bioma.x, 0.3, bioma.z);
        scene.add(pista);
    }
});

// Tráfico IA Aleatorio (Coches simulados moviéndose)
for(let i=0; i<20; i++){
    const iaCarGeo = new THREE.BoxGeometry(2, 1.5, 4);
    const iaCarMat = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
    const iaCar = new THREE.Mesh(iaCarGeo, iaCarMat);
    iaCar.position.set((Math.random() - 0.5) * 400, 0.75, (Math.random() - 0.5) * 400);
    iaCar.castShadow = true;
    scene.add(iaCar);
    vehiculosIA.push({ mesh: iaCar, vel: Math.random() * 0.3 + 0.2, turn: (Math.random()-0.5)*0.02 });
}

// --- 3. JUGADOR (Coche y Avión) ---
let currentVehicle = 'car';

// Coche (Rojo)
const carGroup = new THREE.Group();
const carBody = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshLambertMaterial({color: 0xcc0000}));
carBody.position.y = 0.5;
carBody.castShadow = true;
carGroup.add(carBody);
scene.add(carGroup);

// Avión (Azul) - Oculto al inicio
const planeGroup = new THREE.Group();
const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 8), new THREE.MeshLambertMaterial({color: 0x0000cc}));
const wings = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 2), new THREE.MeshLambertMaterial({color: 0x0000cc}));
const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1.5), new THREE.MeshLambertMaterial({color: 0x0000cc}));
fuselage.position.y = 1;
wings.position.set(0, 1, 1);
tail.position.set(0, 1, -3);
planeGroup.add(fuselage, wings, tail);
planeGroup.position.set(0, 0, 300); // Aparece en el aeropuerto
planeGroup.visible = false;
scene.add(planeGroup);

// --- 4. CONTROLES Y FÍSICAS REALISTAS ---
let input = { throttle: 0, steer: 0, pitch: 0 };
let physics = { 
    speed: 0, heading: 0, 
    planeSpeed: 0, altitude: 0, pitch: 0, roll: 0 
};

// Joysticks
const joyLeft = nipplejs.create({ zone: document.getElementById('joy-left'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });
const joyRight = nipplejs.create({ zone: document.getElementById('joy-right'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });

joyLeft.on('move', (e, data) => { input.steer = -Math.cos(data.angle.radian) * (data.force > 1 ? 1 : data.force); input.pitch = Math.sin(data.angle.radian) * (data.force > 1 ? 1 : data.force); });
joyLeft.on('end', () => { input.steer = 0; input.pitch = 0; });
joyRight.on('move', (e, data) => { input.throttle = Math.sin(data.angle.radian) * (data.force > 1 ? 1 : data.force); });
joyRight.on('end', () => { input.throttle = 0; });

// Cambiar Vehículo
document.getElementById('vehicle-btn').addEventListener('click', () => {
    if (currentVehicle === 'car') {
        currentVehicle = 'plane';
        carGroup.visible = false;
        planeGroup.visible = true;
        document.getElementById('vehicle-btn').innerText = "Subir al Coche";
    } else {
        currentVehicle = 'car';
        planeGroup.visible = false;
        carGroup.visible = true;
        document.getElementById('vehicle-btn').innerText = "Subir al Avión";
    }
});

// --- 5. BUCLE DE JUEGO (ANIMACIÓN Y FÍSICAS) ---
function animate() {
    requestAnimationFrame(animate);

    // Físicas del Coche (Inercia y Fricción)
    if (currentVehicle === 'car') {
        physics.speed += input.throttle * 0.02; // Aceleración
        physics.speed *= 0.95; // Fricción
        if (Math.abs(physics.speed) > 0.05) {
            physics.heading += input.steer * 0.05 * Math.sign(physics.speed);
        }
        
        carGroup.rotation.y = physics.heading;
        carGroup.position.x += Math.sin(physics.heading) * physics.speed;
        carGroup.position.z += Math.cos(physics.heading) * physics.speed;

        // Limite Isla
        if (Math.abs(carGroup.position.x) > mapData.mundo.limite_agua) carGroup.position.x = Math.sign(carGroup.position.x) * mapData.mundo.limite_agua;
        if (Math.abs(carGroup.position.z) > mapData.mundo.limite_agua) carGroup.position.z = Math.sign(carGroup.position.z) * mapData.mundo.limite_agua;

        // Cámara sigue al coche
        camera.position.x = carGroup.position.x - Math.sin(physics.heading) * 15;
        camera.position.z = carGroup.position.z - Math.cos(physics.heading) * 15;
        camera.position.y = 5;
        camera.lookAt(carGroup.position);
    } 
    // Físicas de Vuelo (Sustentación, Gravedad, Cabeceo)
    else if (currentVehicle === 'plane') {
        physics.planeSpeed += input.throttle * 0.05;
        physics.planeSpeed *= 0.98; // Resistencia del aire
        
        physics.heading += input.steer * 0.03;
        physics.pitch += input.pitch * 0.02;
        physics.pitch *= 0.9; // Auto-estabilización
        planeGroup.rotation.x = -physics.pitch;
        planeGroup.rotation.y = physics.heading;
        planeGroup.rotation.z = -input.steer * 0.5; // Alabeo visual

        // Sustentación vs Gravedad
        const lift = physics.planeSpeed * 0.2;
        const gravity = 0.15;
        if (planeGroup.position.y > 0 || lift > gravity) {
            planeGroup.position.y += (lift - gravity) + (physics.pitch * physics.planeSpeed * 0.5);
        }
        if (planeGroup.position.y < 0) planeGroup.position.y = 0; // Suelo

        planeGroup.position.x += Math.sin(physics.heading) * physics.planeSpeed;
        planeGroup.position.z += Math.cos(physics.heading) * physics.planeSpeed;

        // Cámara sigue al avión
        camera.position.x = planeGroup.position.x - Math.sin(physics.heading) * 20;
        camera.position.z = planeGroup.position.z - Math.cos(physics.heading) * 20;
        camera.position.y = planeGroup.position.y + 10;
        camera.lookAt(planeGroup.position);
    }

    // Mover Tráfico IA
    vehiculosIA.forEach(ia => {
        ia.mesh.rotation.y += ia.turn;
        ia.mesh.position.x += Math.sin(ia.mesh.rotation.y) * ia.vel;
        ia.mesh.position.z += Math.cos(ia.mesh.rotation.y) * ia.vel;
        // Si se salen del mapa, rebotan hacia el centro
        if (Math.abs(ia.mesh.position.x) > 400 || Math.abs(ia.mesh.position.z) > 400) {
            ia.mesh.rotation.y += Math.PI; // Dar la vuelta
        }
    });

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
