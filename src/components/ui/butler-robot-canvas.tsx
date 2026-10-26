import { useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The member-supplied robot-hero model adapted as Butler's decorative avatar.
 * The existing AskIntrosDock button remains responsible for interaction,
 * keyboard access, opening the conversation, dragging and voice.
 */
export interface ButlerRobotCanvasProps {
  social: boolean;
  visible: boolean;
  reducedMotion: boolean;
  hovered: boolean;
  pointer: RefObject<[number, number]>;
  onLost: () => void;
}

export function robotLookTarget(pointer: readonly [number, number]) {
  const x = THREE.MathUtils.clamp(pointer[0], -1, 1);
  const y = THREE.MathUtils.clamp(pointer[1], -1, 1);
  return {
    headYaw: x * 0.64,
    headPitch: -y * 0.32,
    bodyYaw: x * 0.14,
    bodyRoll: -x * 0.075,
  };
}

function Ear({ side, accent, shell }: { side: -1 | 1; accent: string; shell: string }) {
  return (
    <group position={[side * 0.285, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.046, 0.046, 0.031, 20]} />
        <meshStandardMaterial color={shell} roughness={0.44} metalness={0.34} />
      </mesh>
      <mesh position={[side * 0.023, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.032, 0.008, 8, 24]} />
        <meshStandardMaterial color="#e7eaf1" metalness={0.3} roughness={0.4} />
      </mesh>
      <group position={[side * 0.02, 0.044, 0]} rotation={[0, 0, side * -0.15]}>
        <mesh position={[0, 0.047, 0]}>
          <cylinderGeometry args={[0.0045, 0.006, 0.094, 10]} />
          <meshStandardMaterial color="#b8c2d1" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.098, 0]}>
          <sphereGeometry args={[0.011, 12, 8]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function ButlerRobot({
  social,
  reducedMotion,
  hovered,
  pointer,
}: Pick<ButlerRobotCanvasProps, 'social' | 'reducedMotion' | 'hovered' | 'pointer'>) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const accent = social ? '#74b9ff' : '#ff435d';
  const shell = social ? '#d7e0ee' : '#aeb5c2';

  useFrame(({ clock }, delta) => {
    if (reducedMotion || !body.current || !head.current || !eyes.current) return;
    const dt = Math.min(delta, 0.08);
    const target = robotLookTarget(pointer.current);
    // The mouse is tracked at window level. This keeps the robot looking
    // toward a pointer anywhere on the page, not just over its 60px button.
    head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, target.headYaw, 6.5, dt);
    head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, target.headPitch, 6.5, dt);
    body.current.rotation.y = THREE.MathUtils.damp(body.current.rotation.y, target.bodyYaw, 4.8, dt);
    body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, target.bodyRoll, 4.8, dt);
    const t = clock.getElapsedTime();
    body.current.position.y = Math.sin(t * 1.65) * (hovered ? 0.035 : 0.014);
    const cycle = t % 4.1;
    const blink = cycle < 0.17 ? 1 - 0.93 * Math.sin((cycle / 0.17) * Math.PI) : 1;
    eyes.current.scale.y = Math.max(0.07, blink);
  });

  return (
    <group ref={body} scale={1.09}>
      {/* Rounded chassis, connecting neck and beveled upper rim from robot-hero. */}
      <mesh position={[0, -0.23, 0]} castShadow>
        <sphereGeometry args={[0.38, 40, 28]} />
        <meshStandardMaterial color={shell} roughness={0.55} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.227, 0.023, 12, 36]} />
        <meshStandardMaterial color={shell} metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.095, 0]}>
        <cylinderGeometry args={[0.205, 0.245, 0.095, 36]} />
        <meshStandardMaterial color={shell} metalness={0.23} roughness={0.42} />
      </mesh>

      <group ref={head} position={[0, 0.3, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.27, 40, 28]} />
          <meshPhysicalMaterial color="#121823" roughness={0.21} metalness={0.27} clearcoat={1} />
        </mesh>
        <mesh position={[0, -0.006, 0.085]} scale={[0.97, 0.91, 0.78]}>
          <sphereGeometry args={[0.26, 40, 28]} />
          <meshPhysicalMaterial color="#060a13" roughness={0.08} metalness={0.16} clearcoat={1} />
        </mesh>
        <group ref={eyes} position={[0, -0.012, 0.293]}>
          <mesh position={[-0.09, 0, 0]}>
            <capsuleGeometry args={[0.019, 0.057, 4, 12]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
          <mesh position={[0.09, 0, 0]}>
            <capsuleGeometry args={[0.019, 0.057, 4, 12]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>
        <Ear side={-1} accent={accent} shell={shell} />
        <Ear side={1} accent={accent} shell={shell} />
      </group>
    </group>
  );
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

/** Transparent, lightweight avatar. No full-screen hero, navigation or extra buttons. */
export default function ButlerRobotCanvas(props: ButlerRobotCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.08, 2.9], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      frameloop={!props.visible ? 'never' : props.reducedMotion ? 'demand' : 'always'}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ContextLoss onLost={props.onLost} />
      <ambientLight intensity={1.75} />
      <directionalLight position={[-2, 4, 5]} intensity={2.1} color="#ffffff" />
      <pointLight position={[2, 1.5, 3]} intensity={1.25} color={props.social ? '#5faeff' : '#ff465e'} />
      <ButlerRobot {...props} />
    </Canvas>
  );
}
