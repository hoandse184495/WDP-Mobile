import type { SurfaceLocation } from '../model/surface-location';
export interface HorseCanvasProps {
  channel: string;
  marker: SurfaceLocation | null;
  editable: boolean;
  onMessage: (text: string) => void;
}
