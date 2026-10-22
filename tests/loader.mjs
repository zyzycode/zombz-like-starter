import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'phaser') {
    return { url: new URL('./fixtures/phaser.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier === '@/game/session/createLevelRuntime') {
    return { url: new URL('./fixtures/runtime.mjs', import.meta.url).href, shortCircuit: true };
  }
  if (specifier.startsWith('@/')) {
    return { url: pathToFileURL(resolvePath('src', `${specifier.slice(2)}.ts`)).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const source = ts.transpileModule(await readFile(new URL(url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
      fileName: url,
    }).outputText;
    return { format: 'module', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
