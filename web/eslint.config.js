import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
    { ignores: ['dist', 'node_modules', 'coverage'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // 事件处理器里直接传 async 函数是 React 的惯用法，放开 void 返回位置的检查
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
        },
    },
    {
        // 测试里大量 mock，放宽不安全类型规则
        files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'src/test-setup.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/unbound-method': 'off',
        },
    },
);
