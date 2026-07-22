import {
  GM_getValue,
  GM_registerMenuCommand,
  GM_setValue,
  GM_unregisterMenuCommand,
} from '$';

const varsMap = new Map<string, string | number>();

export function registerConfigNumberVar(
  id: string,
  defaultValue: number,
  menuText: string,
  onUpdate?: (newValue: number) => void,
) {
  const existingVar = varsMap.get(id);
  if (existingVar) {
    GM_unregisterMenuCommand(existingVar);
  }

  const value = Number(GM_getValue(id, defaultValue));

  let menuId = GM_registerMenuCommand(`${menuText} (${value})`, async () => {
    const input = prompt(menuText, value.toString());
    if (!input) return;

    const normalizedInput = input.trim().replaceAll(',', '.');
    const newValue = Number(normalizedInput);
    if (!Number.isFinite(newValue)) return;
    GM_setValue(id, newValue);

    if (onUpdate) {
      onUpdate(newValue);
    }
  });

  varsMap.set(id, menuId);
}
