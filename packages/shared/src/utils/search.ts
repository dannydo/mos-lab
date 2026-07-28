export const removeVietnameseTones = (str: string | number | null | undefined): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

function extractText(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (typeof node === 'object' && node !== null) {
    const obj = node as { props?: { children?: unknown } };
    if (obj.props && obj.props.children !== undefined) {
      return extractText(obj.props.children);
    }
  }
  return '';
}

export const vietnameseSearchFilter = (
  input: string,
  option?: { label?: unknown; children?: unknown; value?: unknown } | Record<string, unknown> | null
): boolean => {
  if (!input) return true;
  const normalizedInput = removeVietnameseTones(input);
  if (!normalizedInput) return true;
  if (!option) return false;

  const opt = option as Record<string, unknown>;
  const labelText = extractText(opt.label);
  const childrenText = extractText(opt.children);
  const valueText = extractText(opt.value);

  const combinedText = `${labelText} ${childrenText} ${valueText}`;
  return removeVietnameseTones(combinedText).includes(normalizedInput);
};
