export const rolePriorities: Map<string, number> = new Map();

const rolesInOrder = [
  '作者',
  '画师',
  '编辑',
];

rolesInOrder.reverse().forEach((role, index) => rolePriorities.set(role, index));

export function getRolePriority(role: string) {
  return rolePriorities.get(role) ?? -1;
}
