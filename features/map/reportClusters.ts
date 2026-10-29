import type { MapRegion } from "../../constants/places";
import type { Report, ReportMapNode, ReportBounds } from "../../services/reports";
export function reportGroupBounds(node: ReportMapNode): ReportBounds {
  const b = node.bounds,
    epsilon = 1e-8;
  return {
    south: b.south === b.north ? b.south - epsilon : b.south,
    north: b.south === b.north ? b.north + epsilon : b.north,
    west: b.west === b.east ? b.west - epsilon : b.west,
    east: b.west === b.east ? b.east + epsilon : b.east,
  };
}
export function reportClusterRegion(
  node: ReportMapNode,
  current: MapRegion,
): MapRegion | null {
  if (
    Math.max(current.latitudeDelta, current.longitudeDelta) <= 0.0005 ||
    Math.max(
      node.bounds.north - node.bounds.south,
      node.bounds.east - node.bounds.west,
    ) < 1e-7
  )
    return null;
  return {
    latitude: node.latitude,
    longitude: node.longitude,
    latitudeDelta: Math.max(current.latitudeDelta * 0.4, 0.00015),
    longitudeDelta: Math.max(current.longitudeDelta * 0.4, 0.00015),
  };
}
export function nodesWithSelection(
  nodes: ReportMapNode[],
  selected: Report | null,
): ReportMapNode[] {
  if (
    !selected ||
    selected.latitude == null ||
    selected.longitude == null ||
    nodes.some((node) => node.report?.id === selected.id)
  )
    return nodes;
  return [
    ...nodes,
    {
      id: selected.id,
      count: 1,
      latitude: selected.latitude,
      longitude: selected.longitude,
      bounds: {
        south: selected.latitude,
        north: selected.latitude,
        west: selected.longitude,
        east: selected.longitude,
      },
      report: selected,
    },
  ];
}
export function reportNodeLabel(node: ReportMapNode, canZoom = true) {
  return node.report
    ? `Relato: ${node.report.categoria}, ${node.report.local_texto}${node.report.status === "pendente" ? ". Seu relato, aguardando verificação" : ""}`
    : `${canZoom ? "Ampliar grupo de" : "Ver"} ${node.count} relatos`;
}
