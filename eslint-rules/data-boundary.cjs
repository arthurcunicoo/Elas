module.exports = {
  meta: { type: 'problem', schema: [], messages: { direct: 'Keep Supabase clients in services/lib. Screens and providers must use a service function.' } },
  create(context) {
    return { ImportDeclaration(node) {
      if (!/\/lib\/supabase$/.test(node.source.value)) return;
      for (const specifier of node.specifiers) {
        if (['supabase', 'requireBackend'].includes(specifier.imported?.name)) context.report({ node: specifier, messageId: 'direct' });
      }
    } };
  },
};
