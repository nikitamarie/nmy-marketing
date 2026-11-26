// Dezente 3D-Szene (Platzhalter): weiche Form mit sanftem Glanz – prüft three.js, R3F, drei und postprocessing.
import { Canvas } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export default function Scene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 35 }} gl={{ antialias: true }}>
      <color attach="background" args={['#F1ECE8']} />
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh><torusKnotGeometry args={[0.9, 0.28, 220, 32]} /><MeshTransmissionMaterial thickness={0.6} roughness={0.15} color="#E4DAD2" /></mesh>
      </Float>
      <ambientLight intensity={0.9} /><directionalLight position={[3, 4, 5]} intensity={2.2} /><directionalLight position={[-4, -2, 2]} intensity={0.6} color="#E9D8CC" />
      <EffectComposer><Bloom intensity={0.25} luminanceThreshold={0.8} /></EffectComposer>
    </Canvas>
  );
}
