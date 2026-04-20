const csvModules = import.meta.glob('./teams/*.csv', { query: '?raw', import: 'default', eager: true });

export const builtinTeams: Record<string, string> = Object.fromEntries(
  Object.entries(csvModules).map(([path, content]) => [
    path.replace('./teams/', '').replace('.csv', ''),
    content as string,
  ])
);
