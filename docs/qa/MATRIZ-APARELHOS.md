# Matriz física — execução pendente

Registrar dispositivo, OS, versão/build instalada, variante, backend, escala real de fonte, horário, resultado e evidências. Não usar apenas Expo Go: validar a build nativa de release/QA.

| Grupo | Execução exigida | Evidência |
| --- | --- | --- |
| Android pequeno | login, mapa, participação, relatos, eventos, impactos, teclado | capturas + relatório Maestro |
| Android intermediário | mesmos fluxos e 50 ciclos de navegação sem limpar o processo | capturas, RAM em seis amostras, gfxinfo e inspeção de freezes |
| iPhone com notch | login, mapa, teclado, safe areas, retorno do background, deep links | capturas físicas + relatório Appium/manual |
| Fonte 130% e 160% | todas as telas principais e formulário com teclado; medir `fontScale` real | capturas específicas por aparelho/escala |
| Localização negada | continuar explorando e informar local por texto | erro amigável, nenhuma tela presa |
| GPS desligado | conceder permissão e desligar serviços do aparelho | mensagem distinta da permissão negada |
| Rede lenta | limitar rede no roteador/proxy ou Network Link Conditioner | tempos, loading e retentativa; registrar perfil da rede |
| Rede cai durante leitura/envio | cortar conexão depois de iniciar operação e voltar | nenhum envio duplicado; rascunho e retentativa preservados |
| Background/retorno | durante mapa, formulário e requisição; matar processo no background | sessão, rascunho e navegação consistentes |
| Login persistido | reiniciar app e aparelho | usuário continua autenticado sem exposição de outra conta |
| Recuperação | receber e-mail real, usar código, trocar senha e entrar | IDs/horários da mensagem de teste e login final; sem guardar o código/senha nos artefatos |
| Upload | adicionar foto pela galeria, negar permissão, salvar/remover | foto lida só pelo titular e confirmação após reiniciar |
| Muitos pins | viewport de staging com centenas/milhares de relatos agrupados | pan/zoom, lista de grupos, responsividade e memória |

## Android físico

Instalar APK QA, autorizar USB e confirmar `adb devices`. Configurar as variáveis de `qa/.env.example` no shell e usar:

```sh
npm run qa:android -- SERIAL android-small 1 critical
npm run qa:android -- SERIAL android-small 1.3 critical
npm run qa:android -- SERIAL android-small 1.6 critical
npm run qa:android -- SERIAL android-mid 1 session
npm run qa:android -- SERIAL android-mid 1 location
```

O runner restaura a escala original no `finally`, inclusive se o fluxo falhar. Emuladores são rejeitados por padrão; `--allow-emulator` existe só para verificações auxiliares e mantém `physical: false` no relatório. A workflow manual `devices.yml` exige runner próprio com label `elas-android`, APK instalado e environment `qa` com segredos/variáveis; as três escalas rodam em sequência.

Localização negada tem fluxo automatizado. GPS desligado/rede lenta/rede interrompida dependem de controle externo real do sistema; não foram simulados como se fossem evidência física. Usar Network Link Conditioner no iPhone ou roteador/proxy de teste no Android. Restaurar as configurações depois.

## iPhone físico e simulador

Os YAMLs podem ser usados em simulador iOS com Maestro. Para o iPhone físico, foi preparado `npm run qa:ios`, usando Appium/XCUITest local em um Mac com Xcode, aparelho confiável, Developer Mode e WebDriverAgent devidamente assinado. Não é um substituto por screenshot web.

Instalar e iniciar Appium conforme a documentação oficial, configurar `APPIUM_UDID`, `QA_DEVICE_KEY` e a conta QA. O app deve começar deslogado na tela de boas-vindas. O script valida que o UDID aparece entre os dispositivos físicos do Xcode, usa apenas Appium em localhost, executa login/mapa/participação e salva screenshots nativos. Os demais cenários continuam na matriz manual. Esse runner não foi executado neste ambiente Linux.

No iPhone, configurar o tamanho do texto no próprio sistema. Categorias do Dynamic Type não correspondem exatamente aos percentuais Android; registrar o `fontScale` exibido em `elas-qa://diagnostico` e a categoria escolhida. Não afirmar “160%” sem medir a escala recebida pelo aplicativo.

## Recuperação real

O app utiliza **código por e-mail**, com cliente de recuperação isolado da sessão normal. A mensagem atual não contém link que autentique e troque a senha automaticamente. Não foi alterado o protocolo de recuperação para encaixar uma hipótese de teste.

1. Executar `npm run qa:android -- SERIAL android-mid 1 recoveryRequest`.
2. Conferir uma mensagem real na caixa QA, prazo, remetente/SMTP e spam.
3. Definir `QA_OTP` e `QA_NEW_PASSWORD` em ambiente temporário e executar `recoveryComplete`, sem limpar a tela entre as duas etapas.
4. Confirmar login final com a senha nova. Depois atualizar a senha QA utilizada nos próximos testes.
5. Testar código vencido, incorreto, reenviado e tentativa anterior; nenhum deles pode autenticar a sessão comum prematuramente.
6. Validar também `elas://recuperar-senha` na build de produção e `elas-qa://recuperar-senha` na QA. O deep link abre a tela; o código continua necessário.

O template em `supabase/templates/recovery.html` precisa estar publicado na configuração Auth, e o SMTP deve estar funcionando. Esses passos dependem de conta/caixa de teste e configuração externa; não foram marcados como testados.

## RAM e frames

Após login e aquecimento do mapa:

```sh
npm run qa:performance -- SERIAL android-mid
```

O runner coleta seis amostras de PSS e cinquenta ciclos de navegação no mesmo processo, além de `gfxinfo ... framestats`. Não reinicia/limpa o app entre amostras. Examinar tendência após aquecimento e pausas de GC; crescimento continuado, freezes de segundos e perda de resposta exigem investigação. `gfxinfo` não mede sozinho todos os frames da superfície do Google Maps; complementar com Perfetto/Android Studio Profiler e inspeção no aparelho. Nenhum FPS/RAM de aparelho foi medido aqui.

O runner iOS agora abre o diagnóstico QA e rejeita backend diferente do staging declarado ou metadados ausentes de fonte/build/OS. Esse protocolo foi testado com fixtures; a execução em iPhone continua pendente.
