import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export interface SoftwareVersion {
  version: string;
  type: 'release' | 'snapshot';
  isLatest?: boolean;
}

export async function fetchPaperVersions(): Promise<SoftwareVersion[]> {
  try {
    const res = await fetch('https://fill.papermc.io/v3/projects/paper');
    if (!res.ok) throw new Error(`PaperMC API returned status ${res.status}`);
    const data = (await res.json()) as {
      versions: Record<string, string[]>;
    };

    const versions: string[] = [];
    for (const group of Object.keys(data.versions)) {
      for (const v of data.versions[group]) {
        if (!v.includes('pre') && !v.includes('rc')) {
          versions.push(v);
        }
      }
    }

    return versions.slice(0, 35).map((v, i) => ({
      version: v,
      type: 'release',
      isLatest: i === 0,
    }));
  } catch (err) {
    console.error('Failed to fetch Paper versions, using fallback list', err);
    return [
      { version: '26.3', type: 'release', isLatest: true },
      { version: '1.21.4', type: 'release' },
      { version: '1.21.3', type: 'release' },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.6', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.20.2', type: 'release' },
      { version: '1.19.4', type: 'release' },
      { version: '1.18.2', type: 'release' },
      { version: '1.16.5', type: 'release' },
      { version: '1.12.2', type: 'release' },
    ];
  }
}

export async function fetchPurpurVersions(): Promise<SoftwareVersion[]> {
  try {
    const res = await fetch('https://api.purpurmc.org/v2/purpur');
    if (!res.ok) throw new Error(`Purpur API returned status ${res.status}`);
    const data = (await res.json()) as { versions: string[] };
    const valid = [...data.versions].reverse();
    return valid.map((v, i) => ({
      version: v,
      type: 'release',
      isLatest: i === 0,
    }));
  } catch (err) {
    console.error('Failed to fetch Purpur versions', err);
    return [
      { version: '1.21.4', type: 'release', isLatest: true },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.19.4', type: 'release' },
    ];
  }
}

export async function fetchVanillaVersions(): Promise<SoftwareVersion[]> {
  try {
    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    if (!res.ok) throw new Error(`Mojang API returned status ${res.status}`);
    const data = (await res.json()) as {
      latest: { release: string; snapshot: string };
      versions: Array<{ id: string; type: string; url: string }>;
    };

    const releases = data.versions
      .filter((v) => v.type === 'release')
      .map((v) => ({
        version: v.id,
        type: 'release' as const,
        isLatest: v.id === data.latest.release,
      }));
    return releases.slice(0, 35);
  } catch (err) {
    console.error('Failed to fetch Vanilla versions', err);
    return [
      { version: '1.21.4', type: 'release', isLatest: true },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.19.4', type: 'release' },
    ];
  }
}

export async function fetchFabricVersions(): Promise<SoftwareVersion[]> {
  try {
    const res = await fetch('https://meta.fabricmc.net/v2/versions/game');
    if (!res.ok) throw new Error(`Fabric API returned status ${res.status}`);
    const data = (await res.json()) as Array<{ version: string; stable: boolean }>;
    const stable = data
      .filter((v) => v.stable && v.version.startsWith('1.'))
      .map((v, i) => ({
        version: v.version,
        type: 'release' as const,
        isLatest: i === 0,
      }));
    return stable.slice(0, 30);
  } catch (err) {
    console.error('Failed to fetch Fabric versions', err);
    return [
      { version: '1.21.4', type: 'release', isLatest: true },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.19.4', type: 'release' },
    ];
  }
}

export async function getPaperDownloadUrl(version: string): Promise<string> {
  const versionRes = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}`);
  if (!versionRes.ok) throw new Error(`Could not fetch Paper version details for ${version}`);
  const versionData = (await versionRes.json()) as { builds: number[] };

  if (!versionData.builds || versionData.builds.length === 0) {
    throw new Error(`No builds found for Paper ${version}`);
  }

  const maxBuild = Math.max(...versionData.builds);

  const buildRes = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds/${maxBuild}`);
  if (!buildRes.ok) throw new Error(`Could not fetch Paper build ${maxBuild} info`);
  const buildData = (await buildRes.json()) as {
    downloads?: Record<string, { url?: string }>;
  };

  const defaultDownload = buildData.downloads?.['server:default'] || Object.values(buildData.downloads || {})[0];
  if (!defaultDownload?.url) {
    throw new Error(`No download url in Paper build ${maxBuild}`);
  }

  return defaultDownload.url;
}

export async function getPurpurDownloadUrl(version: string): Promise<string> {
  return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
}

export async function getVanillaDownloadUrl(version: string): Promise<string> {
  const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
  const manifestData = (await manifestRes.json()) as {
    versions: Array<{ id: string; url: string }>;
  };
  const versionEntry = manifestData.versions.find((v) => v.id === version);
  if (!versionEntry) throw new Error(`Vanilla version ${version} not found`);

  const versionDetailRes = await fetch(versionEntry.url);
  const versionDetailData = (await versionDetailRes.json()) as {
    downloads?: { server?: { url: string } };
  };
  if (!versionDetailData.downloads?.server?.url) {
    throw new Error(`Server download not found for Vanilla ${version}`);
  }
  return versionDetailData.downloads.server.url;
}

export async function getFabricDownloadUrl(version: string): Promise<string> {
  const loaderRes = await fetch('https://meta.fabricmc.net/v2/versions/loader');
  const loaderData = (await loaderRes.json()) as Array<{ loader: { version: string } }>;
  const latestLoader = loaderData[0]?.loader?.version || '0.16.10';

  const installerRes = await fetch('https://meta.fabricmc.net/v2/versions/installer');
  const installerData = (await installerRes.json()) as Array<{ version: string }>;
  const latestInstaller = installerData[0]?.version || '1.0.1';

  return `https://meta.fabricmc.net/v2/versions/loader/${version}/${latestLoader}/${latestInstaller}/server/jar`;
}

export async function downloadFileWithProgress(
  url: string,
  destPath: string,
  onProgress: (percent: number, downloadedMb: number, totalMb: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const handleRequest = (currentUrl: string) => {
      const client = currentUrl.startsWith('https') ? https : http;

      client
        .get(currentUrl, (response) => {
          if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode)) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              handleRequest(redirectUrl);
              return;
            }
          }

          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
            return;
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          const fileStream = fs.createWriteStream(destPath);

          response.on('data', (chunk) => {
            receivedBytes += chunk.length;
            const downloadedMb = Math.round((receivedBytes / (1024 * 1024)) * 10) / 10;
            const totalMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
            const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
            onProgress(percent, downloadedMb, totalMb);
          });

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              resolve();
            });
          });

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    };

    handleRequest(url);
  });
}
