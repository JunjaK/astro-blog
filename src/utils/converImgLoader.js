import * as fs from 'node:fs';
import * as path from 'node:path';

let folderPath;
let convName;

process.argv.forEach((val, index) => {
  if (index === 2) {
    folderPath = val;
  }
  else if (index === 3) {
    convName = val;
  }
  console.log(`${index}: ${val}`);
});

/**
 * Markdown 이미지 마크다운을 <ImageLoader>로 변환
 * @param input - 변환할 문자열
 * @returns 변환된 문자열
 */
function convertToImageLoader(input) {
  const regex = /!\[(.*?)\]\((.*?)\)/g; // 정규식: alt와 url 추출
  return input.replace(regex, (_, alt, url) => {
    let altUrl = '';
    if (url.startsWith('assets')) {
      altUrl = url.replace('assets', convName);
    }
    else if (url.startsWith('./assets')) {
      altUrl = url.replace('./assets', convName);
    }
    return `<ImageLoader src="${altUrl}" alt="${alt}" />`;
  });
}

/**
 * 특정 폴더 내의 모든 .md 및 .mdx 파일을 처리
 * @param folderPath - 폴더 경로
 */
function processMarkdownFiles(folderPath) {
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);

    // 파일인지 디렉토리인지 확인
    if (fs.statSync(filePath).isFile() && (file.endsWith('.md') || file.endsWith('.mdx'))) {
      console.log(`Processing file: ${file}`);

      // 파일 읽기
      let content = fs.readFileSync(filePath, 'utf-8');

      // 이미지 마크다운 변환
      content = convertToImageLoader(content);

      // Frontmatter 바로 아래에 import 구문 추가
      const importCode = `
import ImageLoader from '@/components/Blog/ImageLoader.tsx';
import VideoLoader from '@/components/Blog/VideoLoader.tsx';

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

      // 파일 확장자가 .md이면 .mdx로 변경
      if (file.endsWith('.md')) {
        const newFilePath = filePath.replace(/\.md$/, '.mdx');
        fs.writeFileSync(newFilePath, content, 'utf-8');
        fs.unlinkSync(filePath); // 기존 .md 파일 삭제
        console.log(`Renamed file: ${file} -> ${path.basename(newFilePath)}`);
      }
      else {
        // 기존 .mdx 파일은 덮어쓰기만 수행
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated file: ${file}`);
      }
    }
  });
}

processMarkdownFiles(folderPath);
