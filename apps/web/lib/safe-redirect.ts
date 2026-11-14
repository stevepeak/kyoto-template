/** Only same-origin paths — never bounce to an attacker-supplied URL. */
export function safeRedirect(value: string | null | undefined): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/'
}
