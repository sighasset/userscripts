import {
  GM_getValue,
  GM_registerMenuCommand,
  GM_setValue,
  GM_unregisterMenuCommand,
} from '$';

type VarData = {
  id: string;
  menuId: string | number;
  value: number;
  menuText: string;
  onUpdate?: (newValue: number) => void;
};

const varsMap = new Map<string, VarData>();

export function registerConfigNumberVar(
  id: string,
  value: number,
  menuText: string,
  onUpdate?: (newValue: number) => void,
) {
  const existingVar = varsMap.get(id);
  if (existingVar) {
    GM_unregisterMenuCommand(existingVar.menuId);
  }

  GM_setValue(id, value);

  const menuId = GM_registerMenuCommand(`${menuText} (${value})`, async () =>
    updateVar(numVar),
  );
  const numVar: VarData = {
    id,
    menuId,
    value,
    menuText,
    onUpdate,
  };

  varsMap.set(id, numVar);
}

export function updateVar(numVar: VarData) {
  const input = prompt(numVar.menuText, numVar.value.toString());
  if (!input) return;

  const normalizedInput = input.trim().replaceAll(',', '.');
  const newValue = Number(normalizedInput);
  if (!Number.isFinite(newValue)) return;

  GM_setValue(numVar.id, newValue);
  rebuildConfigMenu();
  if (numVar.onUpdate) {
    numVar.onUpdate(newValue);
  }
}

function rebuildConfigMenu() {
  for (const [id, varData] of varsMap.entries()) {
    GM_unregisterMenuCommand(varData.menuId);
    registerConfigNumberVar(
      id,
      GM_getValue(id),
      varData.menuText,
      varData.onUpdate,
    );
  }
}
