# Baselines reais pendentes

Nenhuma imagem sintética ou screenshot web foi aceita como baseline nativa. Execute os fluxos no aparelho e revise as capturas em fonte 100%, 130% e 160% antes de aprovar.

Organização: `DEVICE_KEY/1/`, `DEVICE_KEY/1.3/`, `DEVICE_KEY/1.6/`. Cada pasta deve conter PNGs reais e `manifest.json`, com `approvedBy`, `approvedAt`, `appVersion`, `build`, `os`, `screens`.

Cada tela tem `name`, `maxChangedRatio` (padrão 0.0001 — 0,01%) e `masks` opcionais em pixels (`x`, `y`, `width`, `height`). Mascarar só relógio/conteúdo variável indispensável; nunca controles, textos, safe areas ou todos os pins. Máscaras acima de 50% da tela são rejeitadas. Para mapa, preferir um dataset de staging e viewport fixos e revisar também pins manualmente.

A comparação falha se a baseline não existir, estiver sem aprovação, faltar captura ou mudar a resolução. Atualizar baseline exige revisão humana da imagem; não há comando para aprovar tudo automaticamente.

Execuções também exigem versão/build conhecidas e o mesmo OS da baseline. Uma imagem igual não compensa metadados ausentes ou outra versão de sistema.
