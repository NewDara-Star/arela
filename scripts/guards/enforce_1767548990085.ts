import fs from 'fs-extra';
import { glob } from 'glob';

const checkCircularImports = async () => {
  const files = await glob('src/**/*.js'); // Adjust the glob pattern according to your codebase structure
  const importMap = new Map();

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const imports = extractImports(content, file);
    
    importMap.set(file, imports);
    if (imports.includes(file)) {
      console.error(`Circular import: ${file} imports itself.`);
      process.exit(1);
    }
  }

  const visited = new Set();

  for (const file of files) {
    if (hasCycle(file, importMap, visited)) {
      console.error(`Circular import detected involving: ${file}`);
      process.exit(1);
    }
  }

  console.log('No circular imports detected.');
  process.exit(0);
};

const extractImports = (content, filePath) => {
  const regex = /import\s+[^\s]+\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(resolveImportPath(match[1], filePath));
  }
  return imports;
};

const resolveImportPath = (importPath, filePath) => {
  // Simplistic resolution logic; may need enhancement to deal with relative paths
  return importPath.endsWith('.js') ? importPath : `${importPath}.js`;
};

const hasCycle = (file, importMap, visited) => {
  if (visited.has(file)) return true;
  visited.add(file);

  const imports = importMap.get(file) || [];
  for (const imp of imports) {
    if (hasCycle(imp, importMap, visited)) {
      return true;
    }
  }

  visited.delete(file);
  return false;
};

checkCircularImports();