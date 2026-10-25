import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, MathUtils, Mesh } from 'three';
import { vertexShader, fragmentShader } from './butler-blob-shaders';

export interface BlobCanvasProps {
  social: boolean;
  reducedMotion: boolean;
  visible: boolean;
  hovered: boolean;
  pointer: [number, number];
  onLost: () => void;
}
function Blob({ social, reducedMotion, hovered, pointer }: BlobCanvasProps) {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(() => ({
    u_time: { value: 0.8 },
    u_intensity: { value: 0.5 },
    u_color: { value: new Color(social ? '#08080b' : '#e31c32') },
  }), [social]);
  useFrame(({ clock }, delta) => {
    if (!mesh.current || reducedMotion) return;
    uniforms.u_time.value = 0.4 * clock.getElapsedTime();
    uniforms.u_intensity.value = MathUtils.damp(uniforms.u_intensity.value, hovered ? 0.7 : 0.5, 4, delta);
    mesh.current.position.x = MathUtils.damp(mesh.current.position.x, pointer[0] * 0.22, 6, delta);
    mesh.current.position.y = MathUtils.damp(mesh.current.position.y, pointer[1] * 0.22, 6, delta);
  });
  return <mesh ref={mesh} scale={1.3}>
    <icosahedronGeometry args={[2, 5]} />
    <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
  </mesh>;
}
function ContextLoss({ onLost }: { onLost: () => void }) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}
export default function ButlerBlobCanvas(props: BlobCanvasProps) {
  return <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 1.5]}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    frameloop={!props.visible ? 'never' : props.reducedMotion ? 'demand' : 'always'}
    onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
    onContextMenu={event => event.preventDefault()}>
    <ContextLoss onLost={props.onLost} />
    <Blob {...props} />
  </Canvas>;
}
