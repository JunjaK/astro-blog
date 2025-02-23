import * as fs from 'node:fs';
import * as glob from 'glob';

/**
 * 개행 문자 앞에 스페이스 두 개를 추가하는 함수
 * @param {string} content - 파일 내용
 * @returns {string} - 변환된 내용
 */
function addSpacesToEndOfLines(input) {
  // 입력 문자열을 줄 단위로 나누고, 각 줄 끝에 스페이스 두 개 추가
  return input
    .split('\n') // 개행 문자 기준으로 줄 나누기
    .map((line) => `${line.trimEnd()}  `) // 각 줄 끝에 스페이스 두 개 추가
    .join('\n'); // 다시 개행 문자로 합치기
}

/**
 * 폴더 내 모든 .md 및 .mdx 파일을 처리
 * @param {string} markdownGlob - 마크다운 파일의 glob 패턴
 */
async function processMarkdownFiles(markdownGlob) {
  // 모든 마크다운 파일 찾기
  const markdownFiles = glob.sync(markdownGlob);

  if (markdownFiles.length === 0) {
    console.log('처리할 Markdown 파일이 없습니다.');
    return;
  }

  for (const file of markdownFiles) {
    console.log(`Processing file: ${file}`);

    // 파일 읽기
    const content = fs.readFileSync(file, 'utf-8');

    // 개행 문자 앞에 스페이스 두 개 추가
    const updatedContent = addSpacesToEndOfLines(content);

    // 변경된 내용 덮어쓰기
    fs.writeFileSync(file, updatedContent, 'utf-8');
    console.log(`Updated file: ${file}`);
  }
}

// 실행
(async () => {
  const markdownGlob = './src/content/blog/**/*.{md,mdx}'; // 모든 .md 및 .mdx 파일 탐색

  await processMarkdownFiles(markdownGlob);
})();
