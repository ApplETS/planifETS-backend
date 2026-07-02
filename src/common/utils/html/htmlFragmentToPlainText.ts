import { Cheerio, load } from 'cheerio';
import { Element } from 'domhandler';

export function htmlFragmentToPlainText(fragment: Cheerio<Element>): string {
  const $html = load(fragment.clone().toString());
  const rootNode = $html.root();

  rootNode.find('script, style, noscript').remove();
  rootNode.find('br').replaceWith('\n');
  rootNode.find('li').each((_, element) => {
    const item = $html(element);
    item.prepend('- ');
    item.append('\n');
  });
  rootNode.find('p, div, section, article, blockquote').append('\n\n');
  rootNode.find('ul, ol').prepend('\n').append('\n\n');

  const normalizedLines = rootNode.text()
    .replaceAll('\r\n', '\n')
    .replaceAll(' ', ' ')
    .split('\n')
    .map((line) => line.replaceAll(/[ \t]+/g, ' ').trim());

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
