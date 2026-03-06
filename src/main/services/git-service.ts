import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FileDiffResult {
  original: string;
  modified: string;
  isNew: boolean;
}

export class GitService {
  private git: SimpleGit;

  constructor(private repoPath: string) {
    this.git = simpleGit(repoPath);
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getChangedFiles(): Promise<Set<string>> {
    try {
      const status = await this.git.status();
      const changed = new Set<string>();
      for (const f of [...status.modified, ...status.created, ...status.not_added, ...status.renamed.map(r => r.to)]) {
        changed.add(f);
      }
      return changed;
    } catch {
      return new Set();
    }
  }

  async getFileDiff(absolutePath: string): Promise<FileDiffResult> {
    const relativePath = path.relative(this.repoPath, absolutePath);
    const modified = await fs.promises.readFile(absolutePath, 'utf-8');

    try {
      const original = await this.git.show([`HEAD:${relativePath}`]);
      return { original, modified, isNew: false };
    } catch {
      return { original: '', modified, isNew: true };
    }
  }
}
