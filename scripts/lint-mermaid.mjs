#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const diagramsDir = resolve(repoRoot, 'docs', 'design', 'diagrams');

const requiredKeys = ['id', 'title', 'description', 'updated', 'tags'];

async function collectMermaidFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMermaidFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.mmd')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function parseValue(raw, context, errors) {
  if (raw === undefined) {
    errors.push(`${context}: missing value`);
    return undefined;
  }
  const value = raw.trim();
  if (!value.length) {
    errors.push(`${context}: empty value`);
    return undefined;
  }

  if (value.startsWith('[')) {
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch (error) {
      errors.push(`${context}: invalid array syntax (${error.message})`);
      return undefined;
    }
  }

  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch (error) {
      errors.push(`${context}: invalid quoted string (${error.message})`);
      return undefined;
    }
  }

  if (value.startsWith("'")) {
    const inner = value.slice(1, -1);
    return inner.replace(/\\'/g, "'");
  }

  return value;
}

function validateFrontMatter(data, relPath, expectedId, errors) {
  for (const key of Object.keys(data)) {
    if (!requiredKeys.includes(key)) {
      errors.push(`${relPath}: unexpected key "${key}" in front matter`);
    }
  }

  for (const key of requiredKeys) {
    if (!(key in data)) {
      errors.push(`${relPath}: missing required field "${key}"`);
    }
  }

  if (typeof data.id !== 'string' || data.id.trim().length === 0) {
    errors.push(`${relPath}: id must be a non-empty string`);
  } else {
    if (!/^[-a-z0-9]+$/.test(data.id)) {
      errors.push(`${relPath}: id must be kebab-case (found "${data.id}")`);
    }
    if (data.id !== expectedId) {
      errors.push(`${relPath}: id should match file name (${expectedId})`);
    }
  }

  if (typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push(`${relPath}: title must be a non-empty string`);
  }

  if (typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push(`${relPath}: description must be a non-empty string`);
  }

  if (typeof data.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) {
    errors.push(`${relPath}: updated must use format YYYY-MM-DD`);
  }

  if (!Array.isArray(data.tags) || data.tags.length === 0) {
    errors.push(`${relPath}: tags must be a non-empty array`);
  } else {
    data.tags.forEach((tag, index) => {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        errors.push(`${relPath}: tag at index ${index} must be a non-empty string`);
      }
    });
  }
}

function extractFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return null;
  }
  return match[1];
}

async function main() {
  const errors = [];
  let files = [];
  try {
    files = await collectMermaidFiles(diagramsDir);
  } catch (error) {
    console.error(`Error leyendo ${diagramsDir}:`, error.message);
    process.exitCode = 1;
    return;
  }

  for (const filePath of files) {
    const relPath = relative(repoRoot, filePath);
    let content;
    try {
      content = await readFile(filePath, 'utf8');
    } catch (error) {
      errors.push(`${relPath}: no se pudo leer el archivo (${error.message})`);
      continue;
    }

    if (/```\s*mermaid/i.test(content)) {
      errors.push(`${relPath}: remove \`\`\`mermaid fences (diagram files are raw Mermaid)`);
    }

    const frontMatterRaw = extractFrontMatter(content);
    if (!frontMatterRaw) {
      errors.push(`${relPath}: missing front matter block delimited by ---`);
      continue;
    }

    const frontMatterLines = frontMatterRaw.split('\n');
    const data = {};
    for (const line of frontMatterLines) {
      const trimmed = line.trim();
      if (!trimmed.length) {
        continue;
      }
      const match = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!match) {
        errors.push(`${relPath}: invalid front matter line "${line}"`);
        continue;
      }
      const [, key, rawValue] = match;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        errors.push(`${relPath}: duplicated key "${key}"`);
        continue;
      }
      const value = parseValue(rawValue, `${relPath}: ${key}`, errors);
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const expectedId = basename(filePath, '.mmd');
    validateFrontMatter(data, relPath, expectedId, errors);
  }

  if (errors.length > 0) {
    console.error('Mermaid lint failed:');
    for (const error of errors) {
      console.error(` - ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Mermaid diagrams look good.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exitCode = 1;
});
