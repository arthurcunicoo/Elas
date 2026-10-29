# Auditoria de dependências — 25/10/2026

`npm audit --json` na árvore instalada: 15 entradas (1 crítica, 8 altas, 6 moderadas) na base 24; 7 entradas altas após a correção, sem críticas ou moderadas. Entradas propagadas pela árvore não representam sete vulnerabilidades distintas: restam dois advisories de origem, node-forge e zod.

## Correções seletivas

- shell-quote 1.10.0 → 1.12.0: corrige o alerta crítico GHSA-pqg4-j6r4-53mv, em ferramentas Expo.
- source-map-js 1.2.1 → 1.2.2: correção do alerta alto GHSA-68fv-2mgg-jv7q.
- @expo/config-plugins 55.0.11 → 55.0.12: atualização oficial dentro do SDK; trouxe xcode 3.0.1 → 4.0.0 e substituiu uuid vulnerável. Houve major transitiva em xcode; não houve migração de Expo, React ou React Native.
- decode-uri-component: o 0.5.1 corrigido é ESM, enquanto query-string 7/Expo Router exige CommonJS. Foi incluído em `vendor/decode-uri-component` com a única troca de export default por module.exports. Fonte upstream, licença MIT e integridade ficam ao lado. Não foi apenas alterado o número da versão antiga. `tests/system-dependencies.mjs` prova a transformação, resolução da dependência e compatibilidade com query-string.
- expo-secure-store 55.0.18 adicionado para a proteção local, compatível com SDK 55.

O lockfile resolve a implementação vendorizada como dependência local direta e usa override `$decode-uri-component`. `npm ci --ignore-scripts --no-audit` em diretório limpo instalou 962 pacotes. Scripts de instalação nativos não foram executados nesse ensaio. Exportação separada Android/iOS/web e prebuild isolado foram executados com sucesso.

## Justificativa individual dos sete alertas restantes

| Entrada | Origem e uso observado | Decisão/mitigação e pendência |
|---|---|---|
| node-forge 1.4.0 | GHSA-86w9-cpqp-85rv: validação RSA PKCS#1 v1.5; transitivo de CLI/certificados Expo. Nenhum import na UI/serviços. Não apareceu nos source maps exportados. | Mantido na cadeia compatível SDK 55. Não processar certificados/artifacts não confiáveis em desenvolvimento/CI. A ausência do bundle não elimina a exposição de ferramentas; acompanhar patch oficial. Não foi declarada correção desse advisory. |
| zod 3.x | GHSA-mrhx-c7xc-m3w5: coleções restritas grandes podem esgotar memória. Schemas no CLI Expo; sem uso direto no produto e sem fonte nos bundles. | Não impor override para Zod 4, incompatível com a API esperada do CLI. Usar dev server local (`npm start -- --localhost`) e ferramentas/inputs confiáveis; acompanhar a correção compatível. Não foi declarado risco zero. |
| @expo/cli | Propaga node-forge, certificados e zod. Ferramenta Node de desenvolvimento/build, embora instalada pela dependência Expo em dependencies. | Mantido o SDK 55; não executar `npm audit fix --force`. O audit sugere Expo 44, regressão de arquitetura, não uma atualização segura. Dev/CI ainda têm risco residual. |
| @expo/code-signing-certificates | Propagação de node-forge, utilizada na cadeia de certificados do CLI. | Sem fluxo novo de assinatura/validação de certificado no app. Aguardar correção da biblioteca e revalidar comandos de assinatura antes de usá-los com entrada externa. |
| expo | Entrada direta marcada por depender do CLI vulnerável. O runtime exportado não incluiu as fontes dos dois advisories de origem. | Preservado SDK 55; a classificação npm prod/dev isoladamente não demonstra alcance em runtime. Reavaliar o SDK em atualização planejada e compatível. |
| @react-native-community/datetimepicker | Propagação pelo vínculo com Expo; o audit não atribui aqui advisory próprio ao código do seletor. | Mantida a versão nativa compatível. Não aplicar downgrade sugerido 8.1.1 só para alterar a árvore de peers. |
| @sentry/react-native | Propagação pelo vínculo com Expo; sem advisory próprio do SDK Sentry neste relatório. | Mantida a versão 7.11.0. Não regredir para 5.15.2 conforme sugestão automática, pois perderia compatibilidade e comportamento. |

Essas mitigações operacionais são instruções de uso, não uma política de rede implantada por esta entrega. Os sete alertas continuam no audit e devem ser acompanhados. A conclusão é ausência de alertas críticos conhecidos na árvore auditada, não ausência de vulnerabilidades exploráveis em todo o sistema.

Os source maps das três plataformas foram inspecionados: `bundle-reachability.json`. Eles medem alcance no bundle e não auditam binários nativos ou todos os caminhos Node. A versão do Zod e os caminhos exatos estão no lockfile/audit. Avisos de pacote depreciado e aviso de proxy npm permanecem no log de instalação; não equivalem aos alertas de segurança contados acima.

Referências dos advisories: [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [decoder](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
