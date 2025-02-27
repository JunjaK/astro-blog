import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator.tsx';
import React from 'react';

type Props = {
  children?: React.ReactElement;
};

function parseHtmlToReactElements(htmlString: string): React.ReactElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const createSlug = (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, '-');
  };

  const convertToReactElement = (node: Element, index = 0): React.ReactElement => {
    if (node.nodeName === 'UL') {
      return React.createElement(
        'ul',
        null,
        Array.from(node.children).map((child, index) =>
          convertToReactElement(child as Element),
        ),
      );
    }

    if (node.nodeName === 'LI') {
      const childNodes = Array.from(node.childNodes);
      const textContent = childNodes
        .find((node) => node.nodeType === Node.TEXT_NODE)
        ?.textContent
        ?.trim() || '';

      const anchor = textContent
        ? React.createElement(
            'a',
            { href: `#${createSlug(textContent)}` },
            textContent,
          )
        : null;

      const subList = childNodes
        .find((node) => node.nodeName === 'UL');

      return React.createElement(
        'li',
        null,
        [
          anchor,
          subList && convertToReactElement(subList as Element),
        ].filter(Boolean),
      );
    }

    return React.createElement('div');
  };

  return convertToReactElement(doc.body.firstElementChild as Element);
}

export default function TableOfContents({ children }: Props) {
  const tableOfContents = React.useMemo(() => {
    if (typeof children?.props?.value === 'string') {
      return parseHtmlToReactElements(children.props.value);
    }
    return children;
  }, [children]);

  return (
    <Card className="post-table-of-contents">
      <CardHeader className="py-1">
        <h3>Table of Contents</h3>
      </CardHeader>
      <Separator className="mb-4" />
      <CardContent>
        {tableOfContents}

      </CardContent>
    </Card>
  );
}
