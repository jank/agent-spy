import { net, shell } from 'electron';
import { app } from 'electron';

const GITHUB_REPO = 'jank/agent-spy';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  hasUpdate: boolean;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  const body = await new Promise<string>((resolve, reject) => {
    const request = net.request(url);
    request.setHeader('Accept', 'application/vnd.github.v3+json');
    request.setHeader('User-Agent', `AgentSpy/${currentVersion}`);

    let data = '';
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`GitHub API returned ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.on('end', () => resolve(data));
    });
    request.on('error', reject);
    request.end();
  });

  const release = JSON.parse(body);
  const latestTag: string = release.tag_name ?? '';
  const latestVersion = latestTag.replace(/^v/, '');
  const releaseUrl: string = release.html_url ?? '';

  return {
    currentVersion,
    latestVersion,
    releaseUrl,
    hasUpdate: isNewer(latestVersion, currentVersion),
  };
}

export function openReleaseUrl(url: string): void {
  shell.openExternal(url);
}

/** Returns true if `latest` is strictly newer than `current` (semver comparison) */
function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}
