import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper function to check if a path exists
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to safely read JSON files
async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Helper function to safely read text files
async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Check if a directory is a project (has package.json)
async function isProject(dirPath) {
  return await pathExists(path.join(dirPath, 'package.json'));
}

// Read node version info from various sources
async function getNodeVersionInfo(dirPath) {
  const info = {
    nvmrc: null,
    npmrc: null,
    engines: null,
    strictness: null
  };

  // Check .nvmrc
  const nvmrcPath = path.join(dirPath, '.nvmrc');
  if (await pathExists(nvmrcPath)) {
    const content = await readTextFile(nvmrcPath);
    info.nvmrc = content?.trim() || null;
  }

  // Check .npmrc for engine-strict
  const npmrcPath = path.join(dirPath, '.npmrc');
  if (await pathExists(npmrcPath)) {
    const content = await readTextFile(npmrcPath);
    info.npmrc = content;
    if (content && content.includes('engine-strict=true')) {
      info.strictness = 'strict';
    } else if (content) {
      info.strictness = 'not strict';
    }
  }

  // Check package.json engines
  const packageJsonPath = path.join(dirPath, 'package.json');
  const packageJson = await readJsonFile(packageJsonPath);
  if (packageJson?.engines) {
    info.engines = packageJson.engines;
  }

  return info;
}

// Get project info from a directory
async function getProjectInfo(dirPath) {
  const packageJsonPath = path.join(dirPath, 'package.json');
  const packageJson = await readJsonFile(packageJsonPath);

  if (!packageJson) {
    return null;
  }

  const nodeVersionInfo = await getNodeVersionInfo(dirPath);

  // Find README file
  let readmePath = null;
  const readmeVariants = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];
  for (const variant of readmeVariants) {
    const candidatePath = path.join(dirPath, variant);
    if (await pathExists(candidatePath)) {
      readmePath = variant;
      break;
    }
  }

  return {
    name: packageJson.name || 'Unknown',
    version: packageJson.version || 'Unknown',
    description: packageJson.description || null,
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    peerDependencies: packageJson.peerDependencies || {},
    nodeVersionInfo,
    hasReadme: !!readmePath,
    readmeFile: readmePath
  };
}

// API endpoint to scan a directory
app.post('/api/scan-directory', async (req, res) => {
  try {
    const { rootDirectory } = req.body;

    if (!rootDirectory) {
      return res.status(400).json({ error: 'Root directory is required' });
    }

    // Expand ~ to home directory
    const expandedPath = rootDirectory.replace(/^~/, process.env.HOME || process.env.USERPROFILE);

    // Check if directory exists
    if (!(await pathExists(expandedPath))) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // Read directory contents
    const entries = await fs.readdir(expandedPath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    const results = [];

    for (const dir of directories) {
      const dirPath = path.join(expandedPath, dir.name);
      const isProj = await isProject(dirPath);

      if (isProj) {
        const projectInfo = await getProjectInfo(dirPath);
        results.push({
          directoryName: dir.name,
          isProject: true,
          projectInfo
        });
      } else {
        // Check if this directory has subdirectories that might be projects
        try {
          const subEntries = await fs.readdir(dirPath, { withFileTypes: true });
          const hasSubDirs = subEntries.some(entry => entry.isDirectory());

          results.push({
            directoryName: dir.name,
            isProject: false,
            hasSubDirectories: hasSubDirs
          });
        } catch {
          results.push({
            directoryName: dir.name,
            isProject: false,
            hasSubDirectories: false
          });
        }
      }
    }

    res.json({ directories: results });
  } catch (error) {
    console.error('Error scanning directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to read a README file
app.post('/api/read-readme', async (req, res) => {
  try {
    const { rootDirectory, directoryName, readmeFile } = req.body;

    if (!rootDirectory || !directoryName || !readmeFile) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const expandedPath = rootDirectory.replace(/^~/, process.env.HOME || process.env.USERPROFILE);
    const readmePath = path.join(expandedPath, directoryName, readmeFile);

    const content = await readTextFile(readmePath);

    if (!content) {
      return res.status(404).json({ error: 'README file not found or cannot be read' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Error reading README:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
