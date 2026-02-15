/* eslint-disable no-cond-assign */

import fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';

// 마크다운 파일에서 이미지 경로를 추출하는 함수
function extractImagePathsFromMarkdown(markdownContent) {
  const regex = /!\[.*?\]\((.*?)\)/g; // Markdown 이미지 링크 패턴
  const regexImageLoader = /<ImageLoader\s+src=["']([^"']+)["']\s+alt=["'](?:[^"']+)["']\s*\/?>/g;
  const regexThumb = /thumbnail:\s*(\S+)/g;
  const paths = [];
  let match;

  while ((match = regex.exec(markdownContent)) !== null) {
    paths.push(match[1]); // 이미지 경로 추가
  }
  if (paths.length === 0) {
    while ((match = regexImageLoader.exec(markdownContent)) !== null) {
      paths.push(match[1]); // 이미지 경로 추가
    }
  }
  if (paths.length === 0) {
    while ((match = regexThumb.exec(markdownContent)) !== null) {
      paths.push(match[1]); // 이미지 경로 추가
    }
  }
  return paths;
}

// 폴더 내 참조되지 않은 이미지 찾기
async function findUnusedImages(markdownGlob, imageFolder, imageExtensions = ['png', 'jpg', 'jpeg', 'gif']) {
  // 모든 마크다운 파일 찾기
  const markdownFiles = glob.sync(markdownGlob);

  // 마크다운 파일 내 참조된 이미지 경로 모아오기
  const referencedImages = new Set();
  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePaths = extractImagePathsFromMarkdown(content);
    for (const relPath of relativePaths) {
      referencedImages.add(relPath);
    }
  }

  // 폴더 내 모든 이미지 파일 찾기
  const allImageFiles = glob.sync(`${imageFolder}/**/*.{${imageExtensions.join(',')}}`);

  // 참조되지 않은 이미지 필터링
  const unusedImages = allImageFiles.filter((imagePath) => {
    let check = false;
    for (const refPath of referencedImages) {
      const convPath = refPath.replace('./assets', '/assets').replace('/files/blog', 'blog-assets');
      if (imagePath.includes(convPath)) {
        check = true;
        break;
      }
    }

    return !check;
  });

  return unusedImages;
}
// 이 함수로 이미지를 삭제합니다.
async function deleteUnusedImages(imagePaths) {
  for (const imagePath of imagePaths) {
    fs.unlinkSync(path.resolve(imagePath));
    console.log(`Deleted: ${imagePath}`);
  }
}

// 실행
(async () => {
  const markdownGlob = './src/content/blog/**/*.{md,mdx}'; // 모든 마크다운 파일 탐색
  const imageFolder = './blog-assets'; // 이미지 폴더 설정 (수정 가능)

  const unusedImages = await findUnusedImages(markdownGlob, imageFolder);

  console.log('Unused Images:', unusedImages);

  // 확인 후 삭제
  if (unusedImages.length > 0) {
    await deleteUnusedImages(unusedImages);
    console.log('참조되지 않은 이미지를 삭제했습니다.');
  }
  else {
    console.log('삭제할 이미지가 없습니다.');
  }
})();
