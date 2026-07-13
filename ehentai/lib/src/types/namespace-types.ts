export const NamespaceGroups = {
  artist: ['artist:', 'a:'],
  character: ['character:', 'c:', 'char:'],
  cosplayer: ['cosplayer:', 'cos:'],
  female: ['female:', 'f:'],
  group: ['group:', 'g:'],
  circle: ['circle:'],
  language: ['language:', 'l:', 'lang:'],
  location: ['location:', 'loc:'],
  male: ['male:', 'm:'],
  mixed: ['mixed:', 'x:'],
  other: ['other:', 'o:'],
  parody: ['parody:', 'p:'],
  series: ['series:'],
  reclass: ['reclass:', 'r:'],
} as const;

const GroupedNamespaces = Object.values(NamespaceGroups);

// sort in desc length order is needed for example to check group: before p:
export const Namespaces = GroupedNamespaces.flat().sort(
  (a, b) => b.length - a.length,
);
export type Namespace = (typeof Namespaces)[number];

export const ExpandNamespace = Object.fromEntries(
  GroupedNamespaces.flatMap((namespaces) => {
    const [full] = namespaces;
    return namespaces.map((ns) => [ns, full]);
  }),
) as Record<Namespace, Namespace>;

export const ShortenNamespace = Object.fromEntries(
  GroupedNamespaces.flatMap((namespaces) => {
    const [full, short = full] = namespaces;
    return namespaces.map((ns) => [ns, short]);
  }),
) as Record<Namespace, Namespace>;

const NamespaceMap = new Map(
  GroupedNamespaces.flatMap((group) => group.map((ns) => [ns, group] as const)),
);

export function isNamespace(value: string): value is Namespace {
  return NamespaceMap.has(value as Namespace);
}
