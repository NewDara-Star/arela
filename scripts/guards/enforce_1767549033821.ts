import fs from 'fs-extra';
import path from 'path';

const checkAgentsFile = async () => {
  const agentsFilePath = path.join(process.cwd(), 'AGENTS.md');

  try {
    const exists = await fs.pathExists(agentsFilePath);

    if (!exists) {
      console.error('Error: AGENTS.md must exist');
      process.exit(1);
    } else {
      console.log('AGENTS.md exists. All good!');
      process.exit(0);
    }
  } catch (error) {
    console.error('An error occurred while checking for AGENTS.md:', error);
    process.exit(1);
  }
};

checkAgentsFile();