import { codeToHtml } from 'shiki';

export async function highlightCode(code: string, language: string = 'tsx') {
  const html = await codeToHtml(code, {
    lang: language,
    theme: 'github-dark',
    transformers: [
      {
        pre(node) {
          node.properties['class'] =
            'no-scrollbar min-w-0 overflow-x-auto px-4 py-3.5 outline-none has-[[data-highlighted-line]]:px-0 has-[[data-line-numbers]]:px-0 has-[[data-slot=tabs]]:p-0 !bg-transparent';
        },
        code(node) {
          // Access the original source code through the transformer context
          const raw = code;
          node.properties['__raw__'] = raw;
          node.properties['data-line-numbers'] = '';

          if (raw.startsWith('npm install')) {
            node.properties['__npm__'] = raw;
            node.properties['__yarn__'] = raw.replace(
              'npm install',
              'yarn add'
            );
            node.properties['__pnpm__'] = raw.replace(
              'npm install',
              'pnpm add'
            );
            node.properties['__bun__'] = raw.replace('npm install', 'bun add');
          }

          if (raw.startsWith('npx create-')) {
            node.properties['__npm__'] = raw;
            node.properties['__yarn__'] = raw.replace(
              'npx create-',
              'yarn create '
            );
            node.properties['__pnpm__'] = raw.replace(
              'npx create-',
              'pnpm create '
            );
            node.properties['__bun__'] = raw.replace('npx', 'bunx --bun');
          }

          if (raw.startsWith('npm create')) {
            node.properties['__npm__'] = raw;
            node.properties['__yarn__'] = raw.replace(
              'npm create',
              'yarn create'
            );
            node.properties['__pnpm__'] = raw.replace(
              'npm create',
              'pnpm create'
            );
            node.properties['__bun__'] = raw.replace(
              'npm create',
              'bun create'
            );
          }

          if (raw.startsWith('npx')) {
            node.properties['__npm__'] = raw;
            node.properties['__yarn__'] = raw.replace('npx', 'yarn');
            node.properties['__pnpm__'] = raw.replace('npx', 'pnpm dlx');
            node.properties['__bun__'] = raw.replace('npx', 'bunx --bun');
          }

          if (raw.startsWith('npm run')) {
            node.properties['__npm__'] = raw;
            node.properties['__yarn__'] = raw.replace('npm run', 'yarn');
            node.properties['__pnpm__'] = raw.replace('npm run', 'pnpm');
            node.properties['__bun__'] = raw.replace('npm run', 'bun');
          }
        },
        line(node) {
          node.properties['data-line'] = '';
        }
      }
    ]
  });

  return html;
}
