import barbellImg from '@/assets/equipment/barbell.png';
import dumbbellImg from '@/assets/equipment/dumbbell.png';
import kettlebellImg from '@/assets/equipment/kettlebell.png';
import cableImg from '@/assets/equipment/cable.png';
import machineImg from '@/assets/equipment/machine.png';
import bodyweightImg from '@/assets/equipment/bodyweight.png';
import cardioImg from '@/assets/equipment/cardio.png';
import pullUpBarImg from '@/assets/equipment/pull_up_bar.png';
import benchImg from '@/assets/equipment/bench.png';
import resistanceBandImg from '@/assets/equipment/resistance_band.png';

import type { EquipmentType, Exercise } from '@/types/exercise';

export const EQUIPMENT_IMAGES: Record<string, string> = {
  barbell: barbellImg,
  dumbbell: dumbbellImg,
  kettlebell: kettlebellImg,
  cable: cableImg,
  machine: machineImg,
  bodyweight: bodyweightImg,
  cardio_machine: cardioImg,
  pull_up_bar: pullUpBarImg,
  bench: benchImg,
  resistance_band: resistanceBandImg,
  // Fallbacks for equipment without specific images
  suspension: bodyweightImg,
  medicine_ball: dumbbellImg,
  dip_bars: pullUpBarImg,
  box: benchImg,
  none: bodyweightImg,
};

export function getExerciseImage(exercise: Exercise): string | null {
  // If exercise has its own image, use that
  if (exercise.image_url) {
    return exercise.image_url;
  }
  
  // For cardio, use cardio image
  if (exercise.type === 'cardio') {
    return cardioImg;
  }
  
  // For strength, use first equipment image
  const equipment = exercise.equipment || [];
  if (equipment.length > 0) {
    return EQUIPMENT_IMAGES[equipment[0]] || bodyweightImg;
  }
  
  // Default fallback
  return bodyweightImg;
}

export function getEquipmentImage(equipment: EquipmentType): string {
  return EQUIPMENT_IMAGES[equipment] || bodyweightImg;
}
