import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert, Badge, ButtonGroup } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, StreetViewPanorama } from '@react-google-maps/api';
import { FaPlay, FaPause, FaEye, FaStepForward, FaStepBackward, FaStop, FaHistory, FaExpand } from 'react-icons/fa'; 
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const estiloContenedorMapa = { width: '100%', height: '100vh' };
const centroInicial = { lat: -25.274398, lng: 133.775136 };
const libreriasMapa = ['geometry'];

const formatearTiempo = (segundosTotales) => {
  const minutos = Math.floor(segundosTotales / 60);
  const segundos = Math.floor(segundosTotales % 60);
  return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
};

function App() {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  
  // NUEVO ESTADO: Tiempo de espera configurable
  const [tiempoEspera, setTiempoEspera] = useState(15); 

  const [puntoActual, setPuntoActual] = useState(null); 
  const [modoTour, setModoTour] = useState(false); 
  const [caminoCompleto, setCaminoCompleto] = useState([]); 
  const [indiceActual, setIndiceActual] = useState(0); 
  const [reproduciendo, setReproduciendo] = useState(false); 
  
  const panoRef = useRef(null);
  const contenedorPrincipalRef = useRef(null); 

  const [povActual, setPovActual] = useState({ heading: 0, pitch: 0 });

  const [tiempoRestante, setTiempoRestante] = useState(0); 
  const [efectoFade, setEfectoFade] = useState(false); 

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libreriasMapa 
  });

  const interpolarRuta = (puntosOriginales) => {
    const rutaSuavizada = [];
    for (let i = 0; i < puntosOriginales.length - 1; i++) {
      const actual = puntosOriginales[i];
      const siguiente = puntosOriginales[i + 1];
      rutaSuavizada.push(actual);
      const puntoMedio = window.google.maps.geometry.spherical.interpolate(
        new window.google.maps.LatLng(actual.lat, actual.lng),
        new window.google.maps.LatLng(siguiente.lat, siguiente.lng),
        0.5 
      );
      rutaSuavizada.push({ lat: puntoMedio.lat(), lng: puntoMedio.lng() });
    }
    rutaSuavizada.push(puntosOriginales[puntosOriginales.length - 1]);
    return rutaSuavizada;
  };

  const manejarBusqueda = async (evento) => {
    evento.preventDefault();
    setCargando(true); setError(''); setModoTour(false); setReproduciendo(false); 

    try {
      const respuesta = await axios.post('http://localhost:5000/api/obtener-ruta', { origen, destino });
      const datosRuta = respuesta.data;

      if (datosRuta.status === 'OK' && datosRuta.routes.length > 0) {
        
        // El tiempo restante ahora depende del tiempo de espera que elegiste por la cantidad de puntos
        const polylineCodificada = datosRuta.routes[0].overview_polyline.points;
        const rutaDecodificada = window.google.maps.geometry.encoding.decodePath(polylineCodificada);

        const puntosBase = rutaDecodificada
          .map(punto => ({ lat: punto.lat(), lng: punto.lng() }))
          .filter((_, indice) => indice % 2 === 0); 
          
        const rutaFinal = interpolarRuta(puntosBase);

        setCaminoCompleto(rutaFinal); 
        setIndiceActual(0); 
        setPuntoActual(rutaFinal[0]); 
        setTiempoRestante(rutaFinal.length * tiempoEspera); 
        
        if (rutaFinal.length > 1) {
          const anguloInicial = window.google.maps.geometry.spherical.computeHeading(
            new window.google.maps.LatLng(rutaFinal[0].lat, rutaFinal[0].lng),
            new window.google.maps.LatLng(rutaFinal[1].lat, rutaFinal[1].lng)
          );
          setPovActual({ heading: anguloInicial, pitch: 0 });
        }
        setModoTour(true); 
      } else {
        setError('No se encontró una ruta.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const cambiarPunto = (nuevoIndice, conFade = false) => {
    if (nuevoIndice >= 0 && nuevoIndice < caminoCompleto.length) {
      
      if (conFade) {
        setEfectoFade(true); // Oscurecemos la pantalla
        
        // Esperamos 600ms para que esté 100% negra antes de mover la cámara
        setTimeout(() => {
          const puntoViejo = caminoCompleto[indiceActual];
          const puntoNuevo = caminoCompleto[nuevoIndice];
          const nuevoAngulo = window.google.maps.geometry.spherical.computeHeading(
            new window.google.maps.LatLng(puntoViejo.lat, puntoViejo.lng),
            new window.google.maps.LatLng(puntoNuevo.lat, puntoNuevo.lng)
          );
          
          setPovActual({ heading: nuevoAngulo, pitch: 0 });
          setPuntoActual(puntoNuevo);
          setIndiceActual(nuevoIndice);
          
          // Agregamos 800ms EXTRA de pantalla negra para ocultar el "arrastre" nativo de Google
          setTimeout(() => {
            setEfectoFade(false); // Levantamos el telón
          }, 800); 
          
        }, 600); 
      } else {
        const puntoViejo = caminoCompleto[indiceActual];
        const puntoNuevo = caminoCompleto[nuevoIndice];
        const nuevoAngulo = window.google.maps.geometry.spherical.computeHeading(
          new window.google.maps.LatLng(puntoViejo.lat, puntoViejo.lng),
          new window.google.maps.LatLng(puntoNuevo.lat, puntoNuevo.lng)
        );
        setPovActual({ heading: nuevoAngulo, pitch: 0 });
        setPuntoActual(puntoNuevo);
        setIndiceActual(nuevoIndice);
      }
    }
  };

  const irAlSiguiente = () => { setReproduciendo(false); cambiarPunto(indiceActual + 1); };
  const irAlAnterior = () => { setReproduciendo(false); cambiarPunto(indiceActual - 1); };
  const reiniciarTour = () => { setReproduciendo(false); cambiarPunto(0); setTiempoRestante(caminoCompleto.length * tiempoEspera); };

  // Avance automático con la variable 'tiempoEspera'
  useEffect(() => {
    let intervalo;
    if (reproduciendo && caminoCompleto.length > 0) {
      intervalo = setInterval(() => {
        setIndiceActual((indiceAnterior) => {
          const siguienteIndice = indiceAnterior + 1;
          if (siguienteIndice >= caminoCompleto.length) {
            setReproduciendo(false);
            return indiceAnterior;
          }
          cambiarPunto(siguienteIndice, true);
          return siguienteIndice;
        });
      }, tiempoEspera * 1000); 
    }
    return () => clearInterval(intervalo);
  }, [reproduciendo, caminoCompleto, tiempoEspera]);

  // Paneo mucho más lento (0.2 grados)
  useEffect(() => {
    let animacionCamara;
    if (reproduciendo && panoRef.current) {
      animacionCamara = setInterval(() => {
        const povUsuario = panoRef.current.getPov();
        panoRef.current.setPov({
          heading: povUsuario.heading + 0.2, 
          pitch: povUsuario.pitch
        });
      }, 50); 
    }
    return () => clearInterval(animacionCamara);
  }, [reproduciendo]);

  useEffect(() => {
    let cronometro;
    if (reproduciendo && modoTour && tiempoRestante > 0) {
      cronometro = setInterval(() => {
        setTiempoRestante(tiempoAnterior => Math.max(0, tiempoAnterior - 1));
      }, 1000);
    }
    return () => clearInterval(cronometro);
  }, [reproduciendo, modoTour, tiempoRestante]);

  const alternarPantallaCompleta = () => {
    if (!contenedorPrincipalRef.current) return;
    if (!document.fullscreenElement) {
      contenedorPrincipalRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  if (!isLoaded) return <div className="p-4 text-center text-white bg-dark" style={{ height: '100vh' }}>Cargando el motor de Google Maps...</div>;

  return (
    <Container fluid className="p-0" ref={contenedorPrincipalRef}>
      <Row className="g-0">
        
        <Col md={3} className="bg-dark text-white p-4 d-flex flex-column" style={{ height: '100vh', zIndex: 10, overflowY: 'auto' }}>
          <h2 className="mb-4 text-center text-info">Tour <FaEye/> 360</h2>
          
          <Form onSubmit={manejarBusqueda}>
            <Form.Group className="mb-3">
              <Form.Label>Punto de Partida</Form.Label>
              <Form.Control type="text" value={origen} onChange={(e) => setOrigen(e.target.value)} disabled={cargando}/>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Destino</Form.Label>
              <Form.Control type="text" value={destino} onChange={(e) => setDestino(e.target.value)} disabled={cargando}/>
            </Form.Group>

            {/* INPUT DE TIEMPO CONFIGURABLE */}
            <Form.Group className="mb-4">
              <Form.Label>Tiempo por parada (Seg.)</Form.Label>
              <Form.Control 
                type="number" 
                min="15" 
                value={tiempoEspera} 
                onChange={(e) => setTiempoEspera(Math.max(15, parseInt(e.target.value) || 15))} 
                disabled={cargando || reproduciendo}
              />
              <Form.Text className="text-light" style={{ fontSize: '0.75rem' }}>
                *Mínimo 15s. Tip: 35-40s logra una vuelta completa a velocidad lenta.
              </Form.Text>
            </Form.Group>

            <Button variant="info" type="submit" className="w-100 fw-bold" disabled={cargando}>
              {cargando ? 'Cargando...' : 'Trazar Ruta'}
            </Button>
          </Form>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          
          {modoTour && caminoCompleto.length > 0 && (
            <div className="mt-4 p-3 bg-secondary rounded border border-info">
              
              <div className="text-center mb-3 text-info d-flex align-items-center justify-content-center" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                <FaHistory className="me-2"/>
                {formatearTiempo(tiempoRestante)}
              </div>

              <p className="small mb-3 text-center text-light">Punto: {indiceActual + 1} / {caminoCompleto.length}</p>
              
              <Button 
                variant={reproduciendo ? "warning" : "success"} 
                className="w-100 fw-bold mb-3"
                onClick={() => setReproduciendo(!reproduciendo)}
              >
                {reproduciendo ? <><FaPause className="me-2"/> Pausar Auto-Tour</> : <><FaPlay className="me-2"/> Iniciar Auto-Tour</>}
              </Button>

              <ButtonGroup className="w-100 mb-3">
                <Button variant="outline-light" onClick={irAlAnterior} disabled={indiceActual === 0} title="Punto Anterior"><FaStepBackward /></Button>
                <Button variant="danger" onClick={reiniciarTour} title="Reiniciar Recorrido"><FaStop /></Button>
                <Button variant="outline-light" onClick={irAlSiguiente} disabled={indiceActual === caminoCompleto.length - 1} title="Siguiente Punto"><FaStepForward /></Button>
              </ButtonGroup>

              <Button variant="dark" className="w-100 border-light d-flex align-items-center justify-content-center" onClick={alternarPantallaCompleta}>
                <FaExpand className="me-2"/> Pantalla Completa
              </Button>
            </div>
          )}
        </Col>

        <Col md={9} style={{ position: 'relative' }}>
          
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'black', zIndex: 6, transition: 'opacity 0.6s ease-in-out',
            opacity: efectoFade ? 1 : 0, pointerEvents: 'none' 
          }} />

          {modoTour && reproduciendo && (
            <div style={{
              position: 'absolute', top: '20px', left: '20px', zIndex: 5,
              background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '10px',
              color: '#0dcaf0', border: '1px solid #0dcaf0', pointerEvents: 'none'
            }}>
              <h5 className="m-0 text-uppercase" style={{ letterSpacing: '2px' }}>Auto-Tour Active</h5>
              <small className="text-white">Paneo lento cinematográfico</small><br/>
              <Badge bg="danger" className="mt-2 animate__animated animate__flash">● ON AIR</Badge>
            </div>
          )}

          <GoogleMap
            mapContainerStyle={estiloContenedorMapa}
            center={puntoActual || centroInicial}
            zoom={modoTour ? 18 : 4}
            options={{ disableDefaultUI: true }}
          >
            {modoTour && puntoActual && (
              <StreetViewPanorama
                onLoad={(pano) => { panoRef.current = pano; }} 
                position={puntoActual}
                pov={povActual} 
                visible={true}
                options={{
                  enableCloseButton: false, addressControl: false, linksControl: false, 
                  panControl: false, clickToGo: false, fullscreenControl: false, zoomControl: false
                }}
              />
            )}
          </GoogleMap>
        </Col>
      </Row>
    </Container>
  );
}

export default App;