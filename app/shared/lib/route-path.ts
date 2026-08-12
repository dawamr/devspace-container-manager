import type { FileRoutesByTo } from '#/routeTree.gen'

/**
 * Every path the router can navigate to, as a literal union.
 *
 * Use this for hand-authored link targets in config objects (nav items, tiles).
 * `Link`'s own `to` prop widens to `string` once the value comes from a variable,
 * so a typo'd path would otherwise type-check and only fail as a 404 at runtime.
 */
export type RoutePath = keyof FileRoutesByTo
