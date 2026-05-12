import React, { useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, PointerLockControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// --- CUSTOM HOOK: Movimiento W, A, S, D ---
const usarTeclado = () => {
  const [teclas, setTeclas] = useState({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const manejarTeclaAbajo = (e) => {
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) setTeclas((prev) => ({ ...prev, [e.key.toLowerCase()]: true }));
    };
    const manejarTeclaArriba = (e) => {
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) setTeclas((prev) => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    document.addEventListener('keydown', manejarTeclaAbajo);
    document.addEventListener('keyup', manejarTeclaArriba);
    return () => {
      document.removeEventListener('keydown', manejarTeclaAbajo);
      document.removeEventListener('keyup', manejarTeclaArriba);
    };
  }, []);

  return teclas;
};

// --- EL COMPONENTE QUE CARGA EL MODELO ---
const EscenarioTuristico = () => {
  const { scene } = useGLTF('/turismo.glb');
  
  return (
    // ACÁ ESTÁ LA MAGIA: 
    // position: Lo levantamos 1.5mts del piso y lo tiramos 4 metros para adelante (Z negativo).
    // scale: Lo multiplicamos por 100 para hacerlo gigante y poder verlo bien.
    <primitive object={scene} position={[0, 1.5, -4]} scale={[100, 100, 100]} />
  );
};

// --- EL JUGADOR ---
const Jugador = () => {
  const teclas = usarTeclado();
  const velocidad = 0.15; 
  const vectorDireccion = new THREE.Vector3();
  const vectorFrente = new THREE.Vector3();
  const vectorLado = new THREE.Vector3();

  useFrame((state) => {
    state.camera.getWorldDirection(vectorFrente);
    vectorFrente.y = 0; 
    vectorFrente.normalize();
    vectorLado.crossVectors(state.camera.up, vectorFrente).normalize();

    vectorDireccion.set(0, 0, 0);

    if (teclas.w) vectorDireccion.add(vectorFrente);
    if (teclas.s) vectorDireccion.sub(vectorFrente);
    if (teclas.a) vectorDireccion.add(vectorLado);
    if (teclas.d) vectorDireccion.sub(vectorLado);

    vectorDireccion.normalize().multiplyScalar(velocidad);
    state.camera.position.add(vectorDireccion);
    
    // Altura de los ojos (1.70 metros)
    state.camera.position.y = 1.7; 
  });

  return <PointerLockControls />;
};

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#87CEEB' }}>
      
      {/* Interfaz HTML superpuesta */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px', zIndex: 10,
        background: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px', borderRadius: '10px',
        pointerEvents: 'none'
      }}>
        <h3 className="text-info m-0">Exploración 3D Real</h3>
        <p className="m-0 mt-2">1. Clic para entrar (ESC para salir).</p>
        <p className="m-0">2. Mové el mouse para mirar.</p>
        <p className="m-0">3. Usá W, A, S, D para caminar por el lugar.</p>
      </div>

      {/* El Mundo 3D */}
      <Canvas camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={1} />
        <directionalLight position={[10, 20, 10]} intensity={2} />

        {/* Suspense muestra el cartel mientras carga el archivo pesado */}
        <Suspense fallback={
          <Html center>
            <div style={{ color: 'white', background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
              <h4 className="m-0">Cargando Modelo 3D de Alta Calidad...</h4>
              <small>Esto puede tardar unos segundos dependiendo del peso del archivo.</small>
            </div>
          </Html>
        }>
          <EscenarioTuristico />
        </Suspense>

        <Jugador />
      </Canvas>
    </div>
  );
}

export default App;