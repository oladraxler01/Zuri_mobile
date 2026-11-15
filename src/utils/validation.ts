/** Matric numbers look like 2021/12345, VUG/CSC/21/1234, U2021/5570012 … */
export function looksLikeMatric(v: string) {
  const t = v.trim();
  return t.length >= 6 && /\d{2,}/.test(t) && /^[A-Za-z0-9/\-.]+$/.test(t);
}
