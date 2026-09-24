import { colors } from './theme';
export const achievements = [
  { id: 'engajada', title: 'Engajada', description: 'Fez 5 avaliações', value: 5, total: 5, completed: true, icon: 'star-outline', color: '#FF438B' },
  { id: 'colaboradora', title: 'Colaboradora', description: 'Participou de 3 votações', value: 3, total: 3, completed: true, icon: 'bullseye-arrow', color: '#40A68C' },
  { id: 'exploradora', title: 'Exploradora', description: 'Avaliou 10 locais diferentes', value: 7, total: 10, completed: false, icon: 'web', color: colors.achievement },
  { id: 'transformadora', title: 'Transformadora', description: 'Contribuiu para 3 melhorias', value: 1, total: 3, completed: false, icon: 'chart-bar', color: '#FF5752' },
  { id: 'referencia', title: 'Referência', description: 'Teve 10 avaliações úteis', value: 3, total: 10, completed: false, icon: 'trophy-outline', color: '#FFAD25' },
] as const;
export type Achievement = (typeof achievements)[number];
