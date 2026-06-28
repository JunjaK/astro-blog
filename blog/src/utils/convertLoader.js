import * as fs from 'node:fs';
import { glob } from 'glob';

function convertFrontmatterThumb(input, filePath) {
  const regex = /thumbnail:\s*(\S+)/g;

  const convUrl = filePath.replace('src/content', '/files').split('/').slice(0, -1).join('/');

  return input.replace(regex, (_, url) => {
    let altUrl = '';
    if (url.startsWith('assets')) {
      altUrl = url.replace('assets', `${convUrl}/assets`);
    }
    else if (url.startsWith('./assets')) {
      altUrl = url.replace('./assets', `${convUrl}/assets`);
    }
    else {
      return `thumbnail: ${url}`;
    }
    return `thumbnail: ${altUrl}`;
  });
}

/**
 * Markdown 이미지 마크다운을 <ImageLoader>로 변환
 * @param input - 변환할 문자열
 * @param filePath
 * @returns 변환된 문자열
 */
function convertToImageLoader(input, filePath) {
  const regex = /!\[(.*?)\]\((.*?)\)/g; // 정규식: alt와 url 추출
  const convUrl = filePath.replace('src/content', '/files').split('/').slice(0, -1).join('/');

  return input.replace(regex, (match, alt, url) => {
    let altUrl = '';
    if (url.startsWith('assets')) {
      altUrl = url.replace('assets', `${convUrl}/assets`);
    }
    else if (url.startsWith('./assets')) {
      altUrl = url.replace('./assets', `${convUrl}/assets`);
    }
    else {
      return match;
    }
    return `<ImageLoader src="${altUrl}" alt="${alt}" />`;
  });
}

/**
 * Markdown 비디오 태그를 <VideoLoader>로 변환
 * @param input - 변환할 문자열
 * @param filePath
 * @returns 변환된 문자열
 */
function convertToVideoLoader(input, filePath) {
  const regex = /<video[^>]*src="([^"]*)"[^>]*><\/video>/g;
  const convUrl = filePath.replace('src/content', '/files').split('/').slice(0, -1).join('/');

  return input.replace(regex, (match, url) => {
    let altUrl = '';
    if (url.startsWith('assets')) {
      altUrl = url.replace('assets', `${convUrl}/assets`);
    }
    else if (url.startsWith('./assets')) {
      altUrl = url.replace('./assets', `${convUrl}/assets`);
    }
    else {
      return match;
    }
    return `<VideoLoader src="${altUrl}" />`;
  });
}

/**
 * 특정 폴더 내의 모든 .md 및 .mdx 파일을 처리
 * @param folderPath - 폴더 경로
 */
function processMarkdownFiles(folderPath) {
  const files = glob.sync(folderPath);
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = convertFrontmatterThumb(content, filePath);
    content = convertToImageLoader(content, filePath);
    content = convertToVideoLoader(content, filePath);

    //     const importCode = `import ImageLoader from '@/components/Blog/ImageLoader.astro';
    // import VideoLoader from '@/components/Blog/VideoLoader.astro';
    // import TableOfContents from '@/components/Blog/TableOfContents.astro';`;
    //
    //     if (!content.includes(importCode)) {
    //       const frontmatterEndIndex = content.indexOf('---', 3); // 두 번째 --- 찾기
    //       if (frontmatterEndIndex !== -1) {
    //         content
    //           = `${content.slice(0, frontmatterEndIndex + 3)
    //           }\n${
    //             importCode
    //           }${content.slice(frontmatterEndIndex + 3)}`;
    //       }
    //     }

    // 파일 업데이트
    if (filePath.endsWith('.mdx')) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated file: ${filePath}`);
    }
  }
}

export { convertFrontmatterThumb, convertToImageLoader, convertToVideoLoader };

// CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  processMarkdownFiles('./src/content/blog/**/*.mdx');
}
