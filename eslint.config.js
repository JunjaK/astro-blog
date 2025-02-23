import antfu from '@antfu/eslint-config';

export default antfu({
  astro: true,
  react: true,
  typescript: true,
  stylistic: {
    indent: 2, // 4, or 'tab'
    quotes: 'single', // or 'double'
    semi: true,
  },
  formatters: {
    /**
     * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
     * By default uses Prettier
     */
    css: true,
    /**
     * Format HTML files
     * By default uses Prettier
     */
    html: true,
    /**
     * Format Markdown files
     * Supports Prettier and dprint
     * By default uses Prettier
     */
    markdown: 'prettier',
  },
}, {
  rules: {
    'style/arrow-parens': ['error', 'always'], // arrow function 괄호 사용 설정
    'node/prefer-global/process': 'off', // process.env 사용을 위해 off
    'eslint-disable-next-line': 'off', // eslint-disable 사용을 위해 off
    'ts/no-namespace': 'off',
    'ts/no-use-before-define': 'off',
    'ts/ban-ts-comment': 'off',
    'no-unused-vars': 'warn',
    'no-underscore-dangle': 'off',
    'unused-imports/no-unused-imports': 'warn',
    'no-console': 'warn',
    'no-debugger': 'warn',
    'ts/consistent-type-definitions': ['off'],
    'unused-imports/no-unused-vars': ['warn'],
    'unused-imports/no-unused-imports': ['warn'],
  },
});
