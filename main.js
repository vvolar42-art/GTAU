// --- 1. CONFIGURACIÓN DEL MOTOR Y MUNDO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
// Niebla mucho más lejana (menos niebla)
scene.fog = new THREE.Fog(0x87CEEB, 800, 2500); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(500, 1000, 500);
sunLight.castShadow = true;
scene.add(sunLight);

// Mundo más grande (4000x4000)
const groundGeo = new THREE.PlaneGeometry(4000, 4000);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x3b5e2b });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- 2. OBJETOS DEL JUEGO (Jugador y Vehículos) ---

// El Jugador (A pie) - Cilindro amarillo
const playerGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
const playerMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 1, 0); // Empieza en el centro
player.castShadow = true;
scene.add(player);

// Lista de vehículos interactuables
const vehiculos = [];

// Crear un coche y aparcarlo
function crearCoche(x, z, color) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshLambertMaterial({color: color}));
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);
    car.position.set(x, 0, z);
    scene.add(car);
    
    vehiculos.push({ tipo: 'coche', mesh: car, speed: 0, heading: 0 });
}

// Crear un avión y aparcarlo
function crearAvion(x, z, color) {
    const plane = new THREE.Group();
    const fuse = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 8), new THREE.MeshLambertMaterial({color: color}));
    const wings = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 2), new THREE.MeshLambertMaterial({color: color}));
    fuse.position.y = 1; wings.position.set(0, 1, 1);
    fuse.castShadow = true; wings.castShadow = true;
    plane.add(fuse, wings);
    plane.position.set(x, 0, z);
    scene.add(plane);
    
    vehiculos.push({ tipo: 'avion', mesh: plane, speed: 0, heading: 0, pitch: 0 });
}

// Generamos vehículos en el mapa
crearCoche(10, 10, 0xcc0000); // Coche rojo cerca del jugador
crearCoche(-20, 15, 0x00cc00); // Coche verde
crearAvion(50, -50, 0x0000cc); // Avión azul en un "aeropuerto" improvisado

// Base del Aeropuerto (Pista)
const pista = new THREE.Mesh(new THREE.PlaneGeometry(30, 200), new THREE.MeshLambertMaterial({color: 0x333333}));
pista.rotation.x = -Math.PI / 2;
pista.position.set(50, 0.1, -50);
scene.add(pista);

// --- 3. ESTADO Y CONTROLES ---
let estado = {
    activo: 'a_pie', // 'a_pie' o índice del vehículo
    vehiculoActual: null
};

let input = { joyX: 0, joyY: 0, gas: 0, brake: 0 };

// Configurar Joystick Único (Izquierda)
const joystick = nipplejs.create({ zone: document.getElementById('joy-left'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });
joystick.on('move', (e, data) => {
    // joyX: Izquierda/Derecha, joyY: Arriba/Abajo
    input.joyX = -Math.cos(data.angle.radian) * Math.min(data.force, 1);
    input.joyY = Math.sin(data.angle.radian) * Math.min(data.force, 1);
});
joystick.on('end', () => { input.joyX = 0; input.joyY = 0; });

// Botones de Pedales (Soporte para PC y Móvil)
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

// --- 4. MECÁNICA DE ENTRAR Y SALIR DE VEHÍCULOS ---
document.getElementById('btn-action').addEventListener('click', () => {
    if (estado.activo === 'a_pie') {
        // Buscar el vehículo más cercano
        let vehiculoCercano = null;
        let distanciaMin = 10; // Distancia máxima para poder subir

        vehiculos.forEach(v => {
            let dist = player.position.distanceTo(v.mesh.position);
            if (dist < distanciaMin) {
                distanciaMin = dist;
                vehiculoCercano = v;
            }
        });

        if (vehiculoCercano) {
            // Subirse al vehículo
            estado.activo = 'conduciendo';
            estado.vehiculoActual = vehiculoCercano;
            player.visible = false; // Ocultamos al jugador
        }
    } else {
        // Bajarse del vehículo
        // Ponemos al jugador al lado de la puerta izquierda
        player.position.copy(estado.vehiculoActual.mesh.position);
        player.position.x += Math.cos(estado.vehiculoActual.heading) * 3;
        player.position.z -= Math.sin(estado.vehiculoActual.heading) * 3;
        player.position.y = 1; // Altura del suelo
        
        player.visible = true;
        estado.activo = 'a_pie';
        estado.vehiculoActual = null;
    }
});


// --- 5. BUCLE PRINCIPAL Y FÍSICAS ---
let playerHeading = 0;

function animate() {
    requestAnimationFrame(animate);
    
    // Calcular aceleración neta (Gas - Freno)
    let aceleracion = input.gas - input.brake;

    if (estado.activo === 'a_pie') {
        // Mover al jugador con el Joystick
        if (input.joyX !== 0 || input.joyY !== 0) {
            // Rotar al jugador hacia donde apunta el joystick
            playerHeading = Math.atan2(-input.joyX, input.joyY);
            player.rotation.y = playerHeading;
            
            // Avanzar
            let walkSpeed = 0.15;
            player.position.x += Math.sin(playerHeading) * walkSpeed;
            player.position.z += Math.cos(playerHeading) * walkSpeed;
        }

        // Cámara sigue al jugador (Tercera persona)
        camera.position.x = player.position.x;
        camera.position.y = player.position.y + 3;
        camera.position.z = player.position.z + 8;
        camera.lookAt(player.position);

    } else if (estado.vehiculoActual) {
        let v = estado.vehiculoActual;
        
        if (v.tipo === 'coche') {
            // Físicas de Coche (Gas/Freno + Dirección en Joystick X)
            v.speed += aceleracion * 0.02; // Acelerar / Frenar / Reversa
            v.speed *= 0.95; // Fricción
            
            if (Math.abs(v.speed) > 0.01) {
                // Solo gira si se está moviendo
                v.heading += input.joyX * 0.05 * Math.sign(v.speed); 
            }
            
            v.mesh.rotation.y = v.heading;
            v.mesh.position.x += Math.sin(v.heading) * v.speed;
            v.mesh.position.z += Math.cos(v.heading) * v.speed;

        } else if (v.tipo === 'avion') {
            // Físicas de Avión (Gas para hélice, JoyX para giro, JoyY para morro)
            v.speed += aceleracion * 0.05;
            v.speed *= 0.98; // Resistencia
            
            v.heading += input.joyX * 0.03; // Giro (Yaw/Roll)
            v.pitch += input.joyY * 0.03;   // Morro Arriba/Abajo (Pitch)
            v.pitch *= 0.92; // Auto-estabilización
            
            v.mesh.rotation.x = -v.pitch;
            v.mesh.rotation.y = v.heading;
            v.mesh.rotation.z = -input.joyX * 0.5; // Inclinación visual

            // Sustentación vs Gravedad
            let sustentacion = v.speed * 0.25;
            let gravedad = 0.2;
            
            if (v.mesh.position.y > 0 || sustentacion > gravedad) {
                v.mesh.position.y += (sustentacion - gravedad) + (v.pitch * v.speed * 0.5);
            }
            if (v.mesh.position.y < 0) v.mesh.position.y = 0; // Tocar suelo
            
            v.mesh.position.x += Math.sin(v.heading) * v.speed;
            v.mesh.position.z += Math.cos(v.heading) * v.speed;
        }

        // Cámara sigue al vehículo
        camera.position.x = v.mesh.position.x - Math.sin(v.heading) * 15;
        camera.position.y = v.mesh.position.y + 5;
        camera.position.z = v.mesh.position.z - Math.cos(v.heading) * 15;
        camera.lookAt(v.mesh.position);
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
