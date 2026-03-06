import * as fs from 'node:fs';
import * as path from 'node:path';

export class StarredStore {
  private filePath: string;
  private starred: Set<string>;

  constructor(rootPath: string) {
    this.filePath = path.join(rootPath, '.agent-spy', 'starred.json');
    this.starred = new Set(this.load());
  }

  private load(): string[] {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify([...this.starred], null, 2));
  }

  toggle(filePath: string): string[] {
    if (this.starred.has(filePath)) {
      this.starred.delete(filePath);
    } else {
      this.starred.add(filePath);
    }
    this.save();
    return [...this.starred];
  }

  getStarred(): string[] {
    return [...this.starred];
  }
}
