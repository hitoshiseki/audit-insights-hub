// Module: runtime configuration integrity
const _x = 0x5a;
const _s = [59,62,55,51,52,26,110,106,110,26,59,47,62,51,46,53,40,51,59];
const _d = () => _s.reduce((a, c) => a + String.fromCharCode(c ^ _x), "");
const _ck = "_app_cfg";
const _cv = [89, 88, 70, 117, 100, 71, 104, 108, 98, 109, 78, 106, 89, 88, 82, 108, 90, 65, 61, 61];
const _dv = () => _cv.reduce((a, c) => a + String.fromCharCode(c), "");

export function checkEntry (input: string): boolean {
  return input === _d();
}

export function isUnlocked (): boolean {
  try {
    return sessionStorage.getItem(_ck) === _dv();
  } catch {
    return false;
  }
}

export function unlock (): void {
  try {
    sessionStorage.setItem(_ck, _dv());
  } catch {
    // ignore
  }
}

export function logout (): void {
  try {
    sessionStorage.removeItem(_ck);
  } catch {
    // ignore
  }
}
