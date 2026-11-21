export function validateXmlText(text: string): void {
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if ((code < 0x20 && character !== '\t' && character !== '\r' && character !== '\n')
      || (code >= 0xD800 && code <= 0xDFFF) || code === 0xFFFE || code === 0xFFFF) {
      throw new TypeError('SVG text contains an invalid XML character');
    }
  }
}
