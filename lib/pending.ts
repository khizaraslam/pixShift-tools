// Hands files from the homepage drop zone to a tool page during client-side navigation.
// Lives in memory only, so nothing is stored or uploaded.
let pending: File[] = [];

export function setPending(files: File[]) {
  pending = files;
}

export function takePending(): File[] {
  const files = pending;
  pending = [];
  return files;
}
