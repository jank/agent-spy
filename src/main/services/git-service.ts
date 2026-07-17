import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FileDiffResult {
  original: string;
  modified: string;
  isNew: boolean;
}

export interface BranchStatus {
  /** Files changed between the branch point and HEAD (committed changes on this branch) */
  files: Set<string>;
  /** True when a distinct base branch and branch point could be resolved */
  onBranch: boolean;
  /** The currently checked-out branch name, or null when detached */
  branchName: string | null;
}

export interface FullStatus {
  changed: Set<string>;
  newFiles: Set<string>;
  branchChanged: Set<string>;
  onBranch: boolean;
  branchName: string | null;
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

  /**
   * Files changed since the current branch diverged from its base branch —
   * i.e. everything committed on this branch since the branch point.
   * Returns an empty set (with onBranch: false) when on the default branch,
   * in a detached HEAD, or when no base branch can be resolved.
   */
  async getBranchChangedFiles(): Promise<BranchStatus> {
    try {
      const branchName = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      if (!branchName || branchName === 'HEAD') {
        return { files: new Set(), onBranch: false, branchName: null };
      }
      const base = await this.getBaseBranch(branchName);
      if (!base) {
        return { files: new Set(), onBranch: false, branchName };
      }
      const mergeBase = (await this.git.raw(['merge-base', base, 'HEAD'])).trim();
      if (!mergeBase) {
        return { files: new Set(), onBranch: false, branchName };
      }
      const out = await this.git.raw(['diff', '--name-only', mergeBase, 'HEAD']);
      const files = new Set(
        out
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      );
      return { files, onBranch: true, branchName };
    } catch {
      return { files: new Set(), onBranch: false, branchName: null };
    }
  }

  /** Resolve the branch to diff against — the remote default branch, else a common local base. */
  private async getBaseBranch(current: string): Promise<string | null> {
    // Prefer the remote's default branch (e.g. origin/main)
    try {
      const ref = (
        await this.git.raw(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'])
      ).trim();
      const name = ref.replace('refs/remotes/origin/', '');
      if (name && name !== current) return `origin/${name}`;
    } catch {
      // no origin/HEAD configured
    }
    // Fall back to common base branch names that exist locally
    for (const candidate of ['main', 'master', 'develop']) {
      if (candidate === current) continue;
      try {
        await this.git.revparse(['--verify', candidate]);
        return candidate;
      } catch {
        // candidate branch doesn't exist
      }
    }
    return null;
  }

  /** Working-tree changes plus branch-point changes, gathered together. */
  async getFullStatus(): Promise<FullStatus> {
    const [working, branch] = await Promise.all([
      this.getChangedFiles(),
      this.getBranchChangedFiles(),
    ]);
    return {
      changed: working.changed,
      newFiles: working.newFiles,
      branchChanged: branch.files,
      onBranch: branch.onBranch,
      branchName: branch.branchName,
    };
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
