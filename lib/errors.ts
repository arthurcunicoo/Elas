export function friendlyError(error: unknown): string {
  const message = (error as { message?: string })?.message;
  if (message === "Consulta encerrada") return "Enquete encerrada";
  if (message === "Consulta votada ou encerrada: preserve a pergunta e as opções")
    return "Enquete com votos ou encerrada: preserve a pergunta e as opções";
  const businessMessages = new Set([
    "Transfira a administração antes de remover o último administrador.",
    "Escolha um papel diferente.",
    "Você não pode moderar o próprio conteúdo",
    "O autor retirou este registro",
    "Só registros aguardando análise podem ser corrigidos ou retirados",
    "Evento cancelado ou encerrado",
    "Evento cancelado, encerrado ou indisponível",
    "Escolha uma categoria diferente",
    "Escolha um status diferente",
    "Registro indisponível",
    "Lugar indisponível",
    "Notificação indisponível. Atualize a lista.",
    "Informe uma data futura",
    "Esta tentativa já foi usada com outro conteúdo",
    "Atualize a lista antes de decidir.",
    "Push exige uma versão instalada em aparelho compatível.",
    "Push ainda não está disponível nesta versão.",
    "Permita notificações nos ajustes do celular para receber atualizações.",
    "Não foi possível registrar notificações neste aparelho.",
  ]);
  if (message && businessMessages.has(message)) return message;
  const code = (error as { code?: string })?.code;
  if (code === "PGRST202")
    return "Esta função ainda está em atualização no serviço. Tente novamente após a atualização.";
  if (code === "42501") return "Sua conta não tem permissão para esta ação.";
  if (code === "40001")
    return "Este registro foi atualizado. Recarregue e tente novamente.";
  if (code === "23505")
    return "Esse registro já existe. Atualize a lista antes de tentar novamente.";
  if (code === "23514" || code === "22023")
    return "Confira os campos preenchidos e tente novamente.";
  if (code === "otp_expired" || code === "invalid_otp")
    return "Código inválido ou vencido. Solicite outro e tente novamente.";
  if (code === "same_password")
    return "A nova senha precisa ser diferente da atual.";
  if (code === "reauthentication_needed")
    return "Sua sessão precisa ser confirmada novamente. Saia e entre na conta antes de tentar.";
  if (code === "email_exists") return "Este e-mail já pertence a outra conta.";
  if (code === "email_address_not_authorized")
    return "Por enquanto, o e-mail de teste só pode ser enviado para membros da equipe do projeto. Configure o SMTP para liberar outros endereços.";
  if (code === "invalid_credentials") return "E-mail ou senha incorretos.";
  if (code === "email_not_confirmed")
    return "Confirme seu e-mail antes de entrar.";
  if (code === "weak_password")
    return "Escolha uma senha mais forte, com pelo menos 8 caracteres.";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (code === "user_already_exists")
    return "Verifique seu e-mail ou tente entrar na sua conta.";
  const status = (error as { status?: number })?.status;
  const name = (error as { name?: string })?.name;
  if (typeof status === "number" && status >= 500 && status <= 599)
    return `O serviço está temporariamente indisponível (HTTP ${status}). Aguarde e tente novamente.`;
  if (
    name === "AbortError" ||
    message === "A conexão demorou. Tente novamente."
  )
    return "A conexão demorou. Confira sua internet e tente novamente.";
  if (
    name === "AuthRetryableFetchError" ||
    (name === "TypeError" && /fetch|network/i.test(message ?? ""))
  )
    return "Não foi possível conectar ao serviço de login. Confira sua internet e tente novamente.";
  return "Não foi possível concluir. Confira sua conexão e tente novamente. Se persistir, verifique a configuração do projeto.";
}
