// A note in this browser that the admin logged in here. It's not a security
// check (the server decides that); it only lets /admin show the normal 404
// page to everyone else without making any admin request first.
const KEY = 'cb-admin'

export function hasAdminHint() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setAdminHint() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked: the admin just won't get past /admin until it's allowed */
  }
}

export function clearAdminHint() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage blocked */
  }
}
