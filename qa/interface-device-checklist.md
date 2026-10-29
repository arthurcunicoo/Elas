# Validação física de interface — ainda pendente

Registrar aparelho, versão do app/build, SO, fonte, resultado e evidência real. Nenhum item abaixo foi executado nesta rodada.

| Cenário | Conferir |
| --- | --- |
| Android pequeno e intermediário | Abrir app/mapa, navegar e retornar; nenhuma animação bloqueia toque; observar fluidez sem alegar FPS sem medição |
| iPhone com notch | Header, botões do sheet, safe areas, rolagem do footer e retorno do teclado |
| Fonte 130% e 160% | Filtros, senha/multilinha, cabeçalhos, botões longos, mensagens e confirmação de decisão legíveis |
| Teclado aberto | Buscar no admin, editar razão, mostrar/ocultar senha, rolar até ações e sair sem perder campos |
| Rede lenta e interrupção | Skeleton somente na carga inicial; conteúdo existente continua utilizável; retry visível ao falhar |
| Lista vazia e filtros sem resultado | Copy específica; limpar busca/status; nenhuma mensagem de vazio aparece como sucesso de uma consulta que falhou |
| Moderador e administrador | Tipos de registro corretos; status selecionado reconhecível sem cor; limpar filtros; abrir detalhe e voltar sem perder busca |
| Web estreito e tablet/desktop | Largura máxima, quebra de texto, teclado Tab/Shift+Tab/Enter/Space e foco visível inclusive no header |
| VoiceOver/TalkBack | Ordem de foco, nomes das ações, progresso anunciado uma vez, erros próximos aos campos e skeleton fora da árvore acessível |
| Movimento reduzido | Pin/cidade estáticos conforme preferência; pressionamento sem escala/timing; sheet sem deslocamento |

Capturar antes/depois reais dos fluxos essenciais para regressão visual e relacionar à evidência do build. Não marcar como aprovado por inspeção do código ou teste de host simulado.
