import React, { useEffect, useState } from 'react';
// Resium nos da los componentes de React, Cesium es el motor puro
import { Viewer, Primitive, CameraFlyTo } from 'resium';
import * as Cesium from 'cesium';

// IMPORTANTE: Los estilos base de Cesium
import "cesium/Build/Cesium/Widgets/widgets.css";

// Le pasamos la llave maestra de Google a Cesium para que nos preste sus edificios
Cesium.GoogleMaps.defaultApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function App() {
  const [googleTileset, setGoogleTileset] = useState(null);

  // Cargamos los Mosaicos 3D de Google al iniciar la app
  useEffect(() => {
    const cargarCiudad3D = async () => {
      try {
        // Le pedimos a Google el mundo entero en 3D
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        setGoogleTileset(tileset);
      } catch (error) {
        console.error("Error al cargar el 3D de Google:", error);
      }
    };
    cargarCiudad3D();
  }, []);

  return (
    // Sacamos todos los márgenes para que el mundo ocupe toda la pantalla
    <div style={{ width: "100vw", height: "100vh", margin: 0, overflow: "hidden" }}>
      
      {/* Viewer es el "Canvas" principal. Le apagamos todos los botones por defecto para que quede limpio */}
      <Viewer
        full
        timeline={false}
        animation={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        infoBox={false}
      >
        {/* Si Google ya nos mandó los datos, renderizamos la geometría */}
        {googleTileset && <Primitive object={googleTileset} />}

        {/* EFECTO DE VUELO: Aterrizamos la cámara */}
        <CameraFlyTo
          // Coordenadas: Longitud, Latitud, y Altura en metros (ej: 300 metros de altura)
          
          // --- Vuelo a Dublín, Irlanda ---
          //destination={Cesium.Cartesian3.fromDegrees(-6.2603, 53.3450, 300)} 
          
          // --- Vuelo a San Miguel de Tucumán (Descomentá esta y comentá la de arriba para probar) ---
          destination={Cesium.Cartesian3.fromDegrees(-65.2072, -26.8309, 400)} 
          
          duration={5} // El viaje desde el espacio dura 5 segundos
          orientation={{
            heading: Cesium.Math.toRadians(0.0), // Mirando hacia el norte
            pitch: Cesium.Math.toRadians(-30.0), // Inclinación de la cámara (para no mirar al piso derecho)
            roll: 0.0
          }}
        />
      </Viewer>
    </div>
  );
}

export default App;