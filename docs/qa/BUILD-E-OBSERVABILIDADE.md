# Build e observabilidade

## Configuração de build

`eas.json` fixa EAS CLI 25.3.0 e define:

- `qa`: release interna, APK Android, identificadores `br.com.elasnacidade.app.qa` e scheme `elas-qa`.
- `qa-simulator`: mesma configuração, build iOS de simulador.
- `production`: AAB Android / build iOS de loja, versão de build incrementada pelo EAS.
- `production-apk`: APK interno para instalar e testar a configuração de produção.

AAB não instala diretamente no aparelho. A validação Android usa APK interno e, antes da loja, teste interno do Play com o AAB correspondente. No iPhone usar instalação ad hoc/TestFlight conforme o provisionamento da conta Apple.

Configurar os ambientes **preview** e **production** no EAS, com URLs/chaves públicas correspondentes e credenciais nativas. `.env` e arquivos de evidência não são enviados ao EAS. QA recusa o backend de produção conhecido; é preciso um Supabase de staging com as 20 migrações e massa representativa.

Variáveis: `EAS_PROJECT_ID`, URL/chave publicável Supabase, `EXPO_PUBLIC_APP_ENV`, `GOOGLE_MAPS_ANDROID_API_KEY` para Android, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`. O token de upload é segredo do build, nunca variável `EXPO_PUBLIC_*`. Restringir a chave Maps pelo pacote e SHA de assinatura corretos, incluindo o pacote QA e a assinatura Play quando aplicável.

`app.config.js` injeta a chave Maps pelo plugin instalado do `react-native-maps` e habilita o plugin Sentry quando organização/projeto estão definidos. O hook `eas-build-post-install` rejeita build production sem a configuração exigida e build QA apontando ao banco real. Os builds não foram iniciados na conta Expo: faltam projeto/credenciais de assinatura e ambiente de staging.

Depois de configurar e conferir os ambientes:

```sh
npx eas-cli@25.3.0 build --platform android --profile qa
npx eas-cli@25.3.0 build --platform ios --profile qa
npx eas-cli@25.3.0 build --platform android --profile production-apk
npx eas-cli@25.3.0 build --platform android --profile production
npx eas-cli@25.3.0 build --platform ios --profile production
```

Esses comandos são instruções de operação, não execuções já realizadas. Não habilitamos submissão automática às lojas.

## Sentry no aplicativo

SDK `@sentry/react-native` **7.11.0**, correspondente à faixa recomendada pelo Expo SDK 55 instalado, e `expo-application` **55.0.19**. `expo-system-ui` **55.0.22** foi incluído para aplicar o tema claro na build nativa. Integração no root, navegação Expo Router, Metro e plugin de build. O SDK fica desabilitado sem DSN e em demonstração/desenvolvimento; produção só passa no preflight com DSN e configuração de upload.

Crashes/exceções carregam versão nativa, build e ambiente; navegação adiciona a tela. As leituras HTTP do Supabase registram operação, status, duração e resultado. Timeout e cancelamento voluntário são distintos: cancelamentos não geram incidentes. Erros 5xx, rede e timeout são agrupados por operação/resultado; validações comuns 4xx não geram uma exceção manual adicional. Traces têm amostragem de 10%; contagens amostradas não são o número exato de todas as requisições.

Payloads de formulário, cabeçalhos de autenticação, códigos e identidade de usuário não são adicionados pelo monitor de rede. Não foi habilitado replay de sessões. A integração não configura sozinha alertas do projeto Sentry nem comprova recebimento de um crash real.

A build QA tem `elas-qa://diagnostico`, com escala de fonte real, envio de exceção identificada como `ELAS_QA_PROBE` e crash nativo mediante confirmação. A página não oferece essas ações na build production; o preflight rejeita a flag QA no release. Testar em build nativa, receber o evento, confirmar stack trace simbolicado, versão/build/tela e reabrir o app após o crash. Registrar o resultado real antes de marcar `crash-received` como aprovado.

Configurar alertas no Sentry por release/ambiente: novo crash nativo, regressão na taxa de sessões sem crash, frequência de exceções por operação e p95 de leitura. Definir responsáveis e verificar um alerta de teste. Nenhuma mensagem foi enviada a terceiros nesta etapa.

## Edge Functions: parte aplicada

`observeEdge` foi publicado em `lugares-osm` v15 e `catalog-refresh` v3. Registra `service`, `release`, status, duração e UUID de requisição, devolvido em `x-elas-request-id`. Preserva o JWT no primeiro endpoint e a autenticação por segredo/hash no job. Não imprime headers nem body.

Uma chamada intencional **sem credencial** ao job recebeu HTTP 401 e seu registro apareceu na consulta de logs com release `1.1.0-observability.2`. Essa verificação comprova correlação/ingestão de logs; não comprova desempenho sob carga. A chamada não executou importação nem escreveu conteúdo comunitário.

As consultas ClickHouse em `qa/monitoring-queries.sql` foram verificadas no stream real. Selecionar a janela de incidente no painel/tool de logs. Agregações permitem acompanhar contagens por função/status/release e p95. Para observabilidade contínua, configurar retenção/exportação e alertas no provedor; o arquivo SQL não cria um alerta por si só.

## Limites medidos

As exportações Expo Android/iOS/web passaram. Depois da instrumentação, o bundle Hermes ficou aproximadamente **6,0 MB Android / 5,9 MB iOS**, contra cerca de 4,4 / 4,3 MB na entrega anterior. O SDK traz custo de tamanho; RAM, FPS, inicialização e estabilidade continuam dependendo dos aparelhos da matriz. Não foi afirmado que exportar equivale a compilar, assinar e instalar APK/IPA.
