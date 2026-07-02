import { Cheerio, load } from 'cheerio';
import { Element } from 'domhandler';

// Marker for structural line breaks (br/li/block tags), distinct from
// incidental whitespace in how the HTML source happens to be wrapped —
// browsers collapse that whitespace, so it carries no line-break meaning
// and must not be confused with a real one.
const LINE_BREAK = '';

export function htmlFragmentToPlainText(fragment: Cheerio<Element>): string {
  const $html = load(fragment.clone().toString());
  const rootNode = $html.root();

  rootNode.find('script, style, noscript').remove();
  rootNode.find('br').replaceWith(LINE_BREAK);
  rootNode.find('li').each((_, element) => {
    const item = $html(element);
    item.prepend('- ');
    item.append(LINE_BREAK);
  });
  rootNode.find('p, div, section, article, blockquote').append(LINE_BREAK + LINE_BREAK);
  rootNode.find('ul, ol').prepend(LINE_BREAK).append(LINE_BREAK + LINE_BREAK);

  const normalizedLines = rootNode.text()
    .replaceAll(' ', ' ')
    .split(LINE_BREAK)
    .map((line) => line.replaceAll(/\s+/g, ' ').trim());

  const result: string[] = [];
  for (const line of normalizedLines) {
    const isEmpty = line.length === 0;

    if (isEmpty) {
      if (result.length === 0 || result.at(-1) === '') {
        continue;
      }
      result.push('');
      continue;
    }

    result.push(line);
  }

  while (result.at(-1) === '') {
    result.pop();
  }

  const compactedResult = result.filter((line, index, lines) => {
    if (line !== '') {
      return true;
    }

    const previousLine = lines[index - 1] ?? null;
    const nextLine = lines[index + 1] ?? null;

    return !(
      previousLine?.startsWith('- ') && nextLine?.startsWith('- ')
    );
  });

  return compactedResult.join('\n');
}
