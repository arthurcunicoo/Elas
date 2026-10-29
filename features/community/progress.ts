import type { Achievement } from "../../constants/achievements";
import { achievementColors } from "../../constants/theme.ts";
export function originalAchievementProgress(data: {
  avaliacoes: number;
  votos: number;
  melhorias: number;
}): Achievement[] {
  const items = [
    {
      id: "engajada",
      title: "Engajada",
      description: "Fez 5 avaliações",
      total: 5,
      value: data.avaliacoes,
      icon: "star-outline",
      color: achievementColors.reviews,
    },
    {
      id: "colaboradora",
      title: "Colaboradora",
      description: "Participou de 3 votações",
      total: 3,
      value: data.votos,
      icon: "bullseye-arrow",
      color: achievementColors.votes,
    },
    {
      id: "exploradora",
      title: "Exploradora",
      description: "Avaliou 10 locais diferentes",
      total: 10,
      value: data.avaliacoes,
      icon: "web",
      color: achievementColors.places,
    },
    {
      id: "transformadora",
      title: "Transformadora",
      description: "Enviou 3 solicitações de melhoria",
      total: 3,
      value: data.melhorias,
      icon: "chart-bar",
      color: achievementColors.improvements,
    },
    {
      id: "referencia",
      title: "Referência",
      description: "Avaliou 20 locais diferentes",
      total: 20,
      value: data.avaliacoes,
      icon: "trophy-outline",
      color: achievementColors.recognition,
    },
  ] as const;
  return items.map((item) => ({
    ...item,
    value: Math.max(0, Math.min(item.value, item.total)),
    completed: item.value >= item.total,
  }));
}
