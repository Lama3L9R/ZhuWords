function appendChildren($element: HTMLElement, children: any) {
  if (children === undefined || children === null || children === false) {
    return;
  }
  if (Array.isArray(children)) {
    children.forEach(child => appendChildren($element, child));
  } else {
    $element.append(children);
  }
}

export function $e(
  tag: string,
  attributes: { [key: string]: any } | null,
  ...children: Array<any>
) {
  const $element = document.createElement(tag);

  if (attributes !== null) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value === null) {
        continue;
      }
      if (key === 'style') {
        for (const [cssKey, cssValue] of Object.entries(value)) {
          ($element.style as any)[cssKey] = cssValue;
        }
      } else {
        if (Array.isArray(value)) {
          ($element as any)[key] = value.join(' ');
        } else {
          ($element as any)[key] = value;
        }
      }
    }
  }
  appendChildren($element, children);
  return $element;
}
