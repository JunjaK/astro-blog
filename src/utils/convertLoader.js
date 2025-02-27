import * as fs from 'node:fs';
import { glob } from 'glob';

/**
 * Markdown 이미지 마크다운을 <ImageLoader>로 변환
 * @param input - 변환할 문자열
 * @returns 변환된 문자열
 */
function convertToImageLoader(input, filePath) {
  const regex = /!\[(.*?)\]\((.*?)\)/g; // 정규식: alt와 url 추출
  // <video src="./assets/IMG_3043.MOV"></video>;
  const convUrl = filePath.replace('src/content', '/files');
  return input.replace(regex, (_, alt, url) => {
    let altUrl = '';
    if (url.startsWith('assets')) {
      altUrl = url.replace('assets', `${convUrl}/assets`);
    }
    else if (url.startsWith('./assets')) {
      altUrl = url.replace('./assets', `${convUrl}/assets`);
    }
    return `<ImageLoader src="${altUrl}" alt="${alt}" />`;
  });
}

/**
 * Markdown 비디오 태그를 <VideoLoader>로 변환
 * @param input - 변환할 문자열
 * @returns 변환된 문자열
 */
function convertToVideoLoader(input, filePath) {
  const regex = /<video[^>]*src="([^"]*)"[^>]*><\/video>/g;
  const convUrl = filePath.replace('src/content', '/files');

  return input.replace(regex, (_, url) => {
    let altUrl = '';
    if (url.startsWith('assets')) {
      altUrl = url.replace('assets', `${convUrl}/assets`);
    }
    else if (url.startsWith('./assets')) {
      altUrl = url.replace('./assets', `${convUrl}/assets`);
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
    content = convertToImageLoader(content, filePath);
    content = convertToVideoLoader(content, filePath);

    const importCode
      = `import ImageLoader from '@/components/Blog/ImageLoader.astro';
import VideoLoader from '@/components/Blog/VideoLoader.tsx';
import TableOfContents from '@/components/Blog/TableOfContents.astro';
`;
    if (!content.includes(importCode.trim())) {
      const frontmatterEndIndex = content.indexOf('---', 3); // 두 번째 --- 찾기
      if (frontmatterEndIndex !== -1) {
        content
          = `${content.slice(0, frontmatterEndIndex + 3)
          }\n${
            importCode
          }${content.slice(frontmatterEndIndex + 3)}`;
      }
    }

    // 파일 업데이트
    if (filePath.endsWith('.mdx')) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated file: ${filePath}`);
    }
  }
}

processMarkdownFiles('./src/content/blog/**/*.mdx');
