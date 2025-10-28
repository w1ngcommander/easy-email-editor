import { camelCase } from 'lodash';
import React from 'react';
import { getNodeTypeFromClassName } from 'easy-email-core';

const domParser = new DOMParser();

export function getChildSelector(selector: string, index: number) {
  return `${selector}-${index}`;
}

export function HtmlStringToPreviewReactNodes(
  content: string,
) {
  let doc = domParser.parseFromString(content, 'text/html'); // The average time is about 1.4 ms

  // Instead of rendering the body element itself, render its children
  // This prevents hydration errors where <body> would be a child of <div>
  const bodyElement = doc.body;
  if (!bodyElement || bodyElement.childNodes.length === 0) {
    return <></>;
  }

  // Render the children of the body element instead of the body element itself
  const reactNodes = [...bodyElement.childNodes].map((childNode, index) => (
    <RenderReactNode
      key={index}
      selector={`0-${index}`}
      node={childNode as any}
      index={index}
    />
  ));

  return <>{reactNodes}</>;
}

const RenderReactNode = React.memo(function ({
  node,
  index,
  selector,
}: {
  node: HTMLElement;
  index: number;
  selector: string;
}): React.ReactElement {
  const attributes: { [key: string]: string; } = {
    'data-selector': selector,
  };
  node.getAttributeNames?.().forEach((att) => {
    if (att) {
      attributes[att] = node.getAttribute(att) || '';
    }
  });

  if (node.nodeType === Node.COMMENT_NODE) return <></>;

  if (node.nodeType === Node.TEXT_NODE) {
    // Filter out whitespace-only text nodes to prevent hydration errors
    const textContent = node.textContent || '';
    const isWhitespaceOnly = /^\s*$/.test(textContent);

    // Don't render whitespace-only text nodes as they can cause hydration errors
    // especially when they're children of elements like <head>
    if (isWhitespaceOnly) {
      return <></>;
    }

    return <>{textContent}</>;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'meta') return <></>;

    if (tagName === 'style') {
      return React.createElement(tagName, {
        key: index,
        ...attributes,
        dangerouslySetInnerHTML: { __html: node.textContent },
      });
    }

    const blockType = getNodeTypeFromClassName(node.classList);

    if (attributes['data-contenteditable'] === 'true') {
      return React.createElement(tagName, {
        key: performance.now(),
        ...attributes,
        style: getStyle(node.getAttribute('style')),
        dangerouslySetInnerHTML: { __html: node.innerHTML },
      });
    }

    const reactNode = React.createElement(tagName, {
      key: index,
      ...attributes,
      style: getStyle(node.getAttribute('style')),
      children:
        node.childNodes.length === 0
          ? null
          : [...node.childNodes].map((n, i) => (
            <RenderReactNode
              selector={getChildSelector(selector, i)}
              key={i}
              node={n as any}
              index={i}
            />
          )),
    });

    return <>{reactNode}</>;
  }

  return <></>;
});

function getStyle(styleText: string | null) {
  if (!styleText) return undefined;
  return styleText.split(';').reduceRight((a: any, b: any) => {
    const arr = b.split(/\:(?!\/)/);
    if (arr.length < 2) return a;
    a[camelCase(arr[0])] = arr[1];
    return a;
  }, {});
}
