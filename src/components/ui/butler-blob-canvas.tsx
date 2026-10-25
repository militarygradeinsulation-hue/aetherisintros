import { R3FBlob } from './r3f-blob';

export interface BlobCanvasProps {
  social: boolean;
  reducedMotion: boolean;
  visible: boolean;
  hovered: boolean;
  pointer: [number, number];
  onLost: () => void;
}

/** One R3F implementation; the launcher supplies its palette and motion state. */
export default function ButlerBlobCanvas({ social, ...props }: BlobCanvasProps) {
  return <R3FBlob {...props} color={social ? '#2f4be0' : '#e31c32'} />;
}
