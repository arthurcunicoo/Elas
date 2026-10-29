import { achievementColors } from './theme';
export const achievements = [
  { id: 'engajada', title: 'Engajada', description: 'Fez 5 avaliações', value: 5, total: 5, completed: true, icon: 'star-outline', color: achievementColors.reviews },
  { id: 'colaboradora', title: 'Colaboradora', description: 'Participou de 3 votações', value: 3, total: 3, completed: true, icon: 'bullseye-arrow', color: achievementColors.votes },
  { id: 'exploradora', title: 'Exploradora', description: 'Avaliou 10 locais diferentes', value: 7, total: 10, completed: false, icon: 'web', color: achievementColors.places },
  { id: 'transformadora', title: 'Transformadora', description: 'Contribuiu para 3 melhorias', value: 1, total: 3, completed: false, icon: 'chart-bar', color: achievementColors.improvements },
  { id: 'referencia', title: 'Referência', description: 'Teve 10 avaliações úteis', value: 3, total: 10, completed: false, icon: 'trophy-outline', color: achievementColors.recognition },
] as const;
export type Achievement = { id: string; title: string; description: string; value: number; total: number; completed: boolean; icon: import('react').ComponentProps<typeof import('@expo/vector-icons').MaterialCommunityIcons>['name']; color: string }; 
