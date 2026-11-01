export const APEX_POINTS_TO_HANDLE = true;

export function hingeSide(apex: 'left' | 'right'): 'left' | 'right' {
  const opposite = apex === 'left' ? 'right' : 'left';
  return APEX_POINTS_TO_HANDLE ? opposite : apex;
}
