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

  async getChangedFiles(): Promise<{ changed: Set<string>; newFiles: Set<string> }> {
    try {
      const status = await this.git.status();
      const changed = new Set<string>();
      const newFiles = new Set<string>();
      for (const f of status.created) {
        changed.add(f);
        newFiles.add(f);
      }
      for (const f of status.not_added) {
        changed.add(f);
        newFiles.add(f);
      }
      for (const f of status.modified) {
        changed.add(f);
      }
      for (const f of status.renamed.map((r) => r.to)) {
        changed.add(f);
      }
      return { changed, newFiles };
    } catch {
      return { changed: new Set(), newFiles: new Set() };
    }
  }

  async getCommittedContent(absolutePath: string): Promise<string | null> {
    const relativePath = path.relative(this.repoPath, absolutePath);
    try {
      return await this.git.show([`HEAD:${relativePath}`]);
    } catch {
      return null;
    }
  }

  async getFileDiff(absolutePath: string): Promise<FileDiffResult> {
    const modified = await fs.promises.readFile(absolutePath, 'utf-8');
    const original = await this.getCommittedContent(absolutePath);
    return { original: original ?? '', modified, isNew: original === null };
  }
}
