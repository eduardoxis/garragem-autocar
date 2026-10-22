// Keep back navigation inside this app, including when it was opened by a direct link.
const trail = [];
export function rememberRoute(route) {
  if (trail.at(-1) === route) return;
  if (trail.at(-2) === route) trail.pop();
  else trail.push(route);
  if (trail.length > 50) trail.shift();
}

export function previousRoute(home) {
  trail.pop();
  return trail.at(-1) || home;
}

export function goBack(root, home) {
  // Inner views already know how to return without leaving their module.
  const local = root.querySelector('#page-content [data-page-back],#page-content #back,#page-content #cancel-editor');
  if (local) {
    if (!local.disabled) local.click();
    return;
  }
  const target = previousRoute(home);
  if (location.hash !== target) location.replace(target);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

export const homeRoute = role => role === 'admin' ? '#dashboard' : role === 'mecanico' ? '#fila' : role === 'financeiro' ? '#financeiro' : '#clientes';
