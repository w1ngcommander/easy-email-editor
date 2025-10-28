
export function copy(text: string) {
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.append(input);
  input.select();
  document.execCommand('Copy');
  input.parentNode && input.parentNode.removeChild(input);
}