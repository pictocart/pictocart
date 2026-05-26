export interface TourStep {
  element: string; // CSS selector
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export interface TourDefinition {
  key: string;
  steps: TourStep[];
  match: (pathname: string) => boolean;
  /** Human-friendly label shown in Help replay list */
  label: string;
}
