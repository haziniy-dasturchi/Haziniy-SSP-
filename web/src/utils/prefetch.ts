// Route prefetching utilities for instant page transitions

const pageModules = {
  scorecard: () => import('../pages/Scorecard'),
  facts: () => import('../pages/FactsEntry'),
  plans: () => import('../pages/PlansGrid'),
  bonus: () => import('../pages/Bonus'),
  ai: () => import('../pages/AIAnalysis'),
  branches: () => import('../pages/Branches'),
  structure: () => import('../pages/Structure'),
  roles: () => import('../pages/Roles'),
  users: () => import('../pages/Users'),
  evaluation: () => import('../pages/Evaluation'),
  import: () => import('../pages/ImportCSV'),
  audit: () => import('../pages/AuditLog'),
  profile: () => import('../pages/Profile'),
  metric: () => import('../pages/MetricDetail'),
};

const prefetched = new Set<string>();

export function prefetchRoute(routePath: string) {
  let key: keyof typeof pageModules | null = null;

  if (routePath === '/') key = 'scorecard';
  else if (routePath.startsWith('/facts')) key = 'facts';
  else if (routePath.startsWith('/plans')) key = 'plans';
  else if (routePath.startsWith('/bonus')) key = 'bonus';
  else if (routePath.startsWith('/ai')) key = 'ai';
  else if (routePath.startsWith('/branches')) key = 'branches';
  else if (routePath.startsWith('/structure')) key = 'structure';
  else if (routePath.startsWith('/roles')) key = 'roles';
  else if (routePath.startsWith('/users')) key = 'users';
  else if (routePath.startsWith('/evaluation')) key = 'evaluation';
  else if (routePath.startsWith('/import')) key = 'import';
  else if (routePath.startsWith('/audit')) key = 'audit';
  else if (routePath.startsWith('/profile')) key = 'profile';
  else if (routePath.startsWith('/metric/')) key = 'metric';

  if (key && !prefetched.has(key)) {
    prefetched.add(key);
    pageModules[key]().catch(() => {
      // Ignore background prefetch errors (will retry on actual navigation)
      prefetched.delete(key!);
    });
  }
}

// Warm up top essential routes immediately in idle time
export function warmUpCoreRoutes() {
  if (typeof window === 'undefined') return;

  const prefetchCore = () => {
    prefetchRoute('/');
    prefetchRoute('/facts');
    prefetchRoute('/plans');
    prefetchRoute('/bonus');
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetchCore, { timeout: 2000 });
  } else {
    setTimeout(prefetchCore, 1000);
  }
}
