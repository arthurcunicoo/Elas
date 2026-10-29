// Enforce the design language at authoring time, not only in a one-off cleanup.
module.exports = {
  meta: { type: 'suggestion', schema: [], messages: { color: 'Use a semantic color from constants/theme; artwork/map palettes belong in constants.', font: 'Product text must be at least 12. Use typography tokens.', radius: 'Use radius.small/medium/large/pill. Keep geometric exceptions in illustration/map components.' } },
  create(context) {
    const geometric = /\/(CitySkyline|Logo|CommunityIcon|MoodSelector|PlaceMarker|CityMap(?:\.native)?)\.tsx$/.test(context.filename.replaceAll('\\', '/'));
    return {
      Literal(node) {
        if (typeof node.value === 'string' && /^#[\da-f]{3,8}$/i.test(node.value)) context.report({ node, messageId: 'color' });
      },
      TemplateElement(node) {
        if (/#[\da-f]{3,8}\b/i.test(node.value.raw)) context.report({ node, messageId: 'color' });
      },
      Property(node) {
        const key = node.key.name ?? node.key.value;
        if (key === 'fontSize' && typeof node.value.value === 'number' && node.value.value < 12) context.report({ node, messageId: 'font' });
        if (!geometric && /^border.*Radius$/.test(key) && typeof node.value.value === 'number' && node.value.value !== 0) context.report({ node, messageId: 'radius' });
      },
    };
  },
};
