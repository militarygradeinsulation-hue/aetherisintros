'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Color, IcosahedronGeometry, MathUtils, Mesh, Vector3 } from 'three';
import { vertexShader, fragmentShader } from './butler-blob-shaders';

extend({ IcosahedronGeometry });

export interface R3FBlobProps {
  color?: string;
  reducedMotion?: boolean;
  visible?: boolean;
  hovered?: boolean;
  pointer?: [number, number];
  environment?: boolean;
  onLost?: () => void;
}

/** Supplied Perlin-displaced icosahedron, shared by the full demo and Butler. */
export function Blob({ color = '#000000', reducedMotion = false, hovered = false, pointer }: R3FBlobProps) {
  const mesh = useRef<Mesh>(null);
  const hover = useRef(false);
  const uniforms = useMemo(() => ({
    u_time: { value: 0.8 },
    u_intensity: { value: 0.3 },
    u_color: { value: new Color(color) },
  }), [color]);
  const targetPosition = useRef(new Vector3());
  const currentPosition = useRef(new Vector3());
  useFrame(({ clock, pointer: scenePointer }) => {
    if (!mesh.current || reducedMotion) return;
    uniforms.u_time.value = 0.4 * clock.getElapsedTime();
    uniforms.u_intensity.value = MathUtils.lerp(uniforms.u_intensity.value, hovered || hover.current ? 0.7 : 0.5, 0.02);
    // The small launcher receives bounded input from its existing button.
    // Full-screen use follows the scene pointer as in the supplied component.
    targetPosition.current.set(pointer ? pointer[0] * 0.22 : scenePointer.x, pointer ? pointer[1] * 0.22 : scenePointer.y, 0);
    currentPosition.current.lerp(targetPosition.current, 0.1);
    mesh.current.position.copy(currentPosition.current);
  });
  return <mesh ref={mesh} scale={1.5} position={[0, 0, 0]}
    onPointerOver={() => { hover.current = true; }} onPointerOut={() => { hover.current = false; }}>
    <icosahedronGeometry args={[2, 20]} />
    <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
  </mesh>;
}

function ContextLoss({ onLost }: Pick<R3FBlobProps, 'onLost'>) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onLost?.(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onLost]);
  return null;
}

function StudioEnvironment() {
  return <Suspense fallback={null}>
    <Environment preset="studio" environmentIntensity={0.5} />
    <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dancing_hall_1k.hdr" resolution={1024}>
      <group rotation={[-Math.PI / 3, 0, 0]}>
        <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
        {[2, 0, 2, 0, 2, 0, 2, 0].map((x, i) => <Lightformer key={i} form="circle" intensity={4}
          rotation={[Math.PI / 2, 0, 0]} position={[x, 4, i * 4]} scale={[4, 1, 1]} />)}
        <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />
        <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />
      </group>
    </Environment>
  </Suspense>;
}

/** Parent-sized canvas; the decorative Butler keeps its existing click target. */
export function R3FBlob(props: R3FBlobProps) {
  return <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 1.5]}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    frameloop={props.visible === false ? 'never' : props.reducedMotion ? 'demand' : 'always'}
    onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}>
    <ContextLoss {...(props.onLost ? { onLost: props.onLost } : {})} />
    <Blob {...props} />
    {props.environment && <StudioEnvironment />}
  </Canvas>;
}

/** Standalone version of the supplied demo. The app uses R3FBlob in the Butler. */
export function Home() {
  return <div className="h-screen w-screen flex items-center justify-center"><R3FBlob environment /></div>;
}
