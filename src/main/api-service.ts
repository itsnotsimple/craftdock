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

    // Keep all Paper releases down to 1.8.8 (no artificial 35 slice)
    return versions.map((v, i) => ({
      version: v,
      type: 'release',
      isLatest: i === 0,
    }));
  } catch (err) {
    console.error('Failed to fetch Paper versions, using fallback list', err);
    return [
      { version: '1.21.4', type: 'release', isLatest: true },
      { version: '1.21.3', type: 'release' },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.6', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.20.2', type: 'release' },
      { version: '1.19.4', type: 'release' },
      { version: '1.18.2', type: 'release' },
      { version: '1.17.1', type: 'release' },
      { version: '1.16.5', type: 'release' },
      { version: '1.15.2', type: 'release' },
      { version: '1.14.4', type: 'release' },
      { version: '1.13.2', type: 'release' },
      { version: '1.12.2', type: 'release' },
      { version: '1.11.2', type: 'release' },
      { version: '1.10.2', type: 'release' },
      { version: '1.9.4', type: 'release' },
      { version: '1.8.8', type: 'release' },
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
      { version: '1.20.6', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.19.4', type: 'release' },
      { version: '1.18.2', type: 'release' },
      { version: '1.17.1', type: 'release' },
      { version: '1.16.5', type: 'release' },
      { version: '1.15.2', type: 'release' },
      { version: '1.14.4', type: 'release' },
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

    // Include all releases down to 1.8
    const idx18 = releases.findIndex((v) => v.version === '1.8');
    return idx18 !== -1 ? releases.slice(0, idx18 + 1) : releases;
  } catch (err) {
    console.error('Failed to fetch Vanilla versions', err);
    return [
      { version: '1.21.4', type: 'release', isLatest: true },
      { version: '1.21.3', type: 'release' },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.6', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.20.2', type: 'release' },
      { version: '1.20.1', type: 'release' },
      { version: '1.19.4', type: 'release' },
      { version: '1.18.2', type: 'release' },
      { version: '1.17.1', type: 'release' },
      { version: '1.16.5', type: 'release' },
      { version: '1.15.2', type: 'release' },
      { version: '1.14.4', type: 'release' },
      { version: '1.13.2', type: 'release' },
      { version: '1.12.2', type: 'release' },
      { version: '1.11.2', type: 'release' },
      { version: '1.10.2', type: 'release' },
      { version: '1.9.4', type: 'release' },
      { version: '1.8.9', type: 'release' },
      { version: '1.8.8', type: 'release' },
      { version: '1.8', type: 'release' },
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
    return stable;
  } catch (err) {
    console.error('Failed to fetch Fabric versions', err);
    return [
      { version: '1.21.4', type: 'release', isLatest: true },
      { version: '1.21.3', type: 'release' },
      { version: '1.21.1', type: 'release' },
      { version: '1.20.6', type: 'release' },
      { version: '1.20.4', type: 'release' },
      { version: '1.19.4', type: 'release' },
      { version: '1.18.2', type: 'release' },
      { version: '1.17.1', type: 'release' },
      { version: '1.16.5', type: 'release' },
      { version: '1.15.2', type: 'release' },
      { version: '1.14.4', type: 'release' },
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
  // Query version-specific loader from Fabric Meta
  let loaderVersion = '0.16.10';
  try {
    const loaderRes = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${version}`);
    if (!loaderRes.ok) {
      if (loaderRes.status === 404) {
        throw new Error(`Fabric does not support Minecraft ${version}. Please choose a different version or use Vanilla/Paper instead.`);
      }
      throw new Error(`Fabric Meta API returned ${loaderRes.status} for version ${version}`);
    }
    const loaderData = (await loaderRes.json()) as Array<{ loader?: { version: string } }>;
    if (!Array.isArray(loaderData) || loaderData.length === 0) {
      throw new Error(`Fabric does not have a loader available for Minecraft ${version}. Try 1.21.4, 1.21.1, or 1.20.4.`);
    }
    if (loaderData[0].loader?.version) {
      loaderVersion = loaderData[0].loader.version;
    }
  } catch (e: any) {
    if (e.message && e.message.includes('Fabric')) throw e; // re-throw our own errors
    console.warn(`Could not fetch version-specific loader for Fabric ${version}, using fallback:`, e);
  }

  let installerVersion = '1.1.2';
  try {
    const installerRes = await fetch('https://meta.fabricmc.net/v2/versions/installer');
    if (installerRes.ok) {
      const installerData = (await installerRes.json()) as Array<{ version: string; stable?: boolean }>;
      const stable = installerData.find((i) => i.stable);
      if (stable?.version) {
        installerVersion = stable.version;
      } else if (installerData[0]?.version) {
        installerVersion = installerData[0].version;
      }
    }
  } catch (e) {
    console.warn('Could not fetch Fabric installer version, using fallback:', e);
  }

  // Note: Fabric server JAR is a small launcher (~180KB) that downloads the actual
  // Minecraft + Fabric files on first server start. This is expected behavior.
  return `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVersion}/${installerVersion}/server/jar`;
}

export async function downloadFileWithProgress(
  url: string,
  destPath: string,
  onProgress: (percent: number, downloadedMb: number, totalMb: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const maxRedirects = 10;
    let redirectCount = 0;

    const handleRequest = (currentUrl: string) => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(currentUrl);
      } catch (err) {
        return reject(new Error(`Invalid URL: ${currentUrl}`));
      }

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const requestOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CraftDock/3.4.0 (Minecraft Server Manager)',
          Accept: '*/*',
        },
      };

      const req = client.get(currentUrl, requestOptions, (response) => {
        if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode)) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return reject(new Error('Too many redirects while downloading server files'));
          }
          const redirectLocation = response.headers.location;
          if (redirectLocation) {
            const nextUrl = new URL(redirectLocation, currentUrl).href;
            response.resume();
            return handleRequest(nextUrl);
          }
        }

        if (response.statusCode && response.statusCode >= 400) {
          response.resume();
          return reject(new Error(`Failed to download server files: HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let receivedBytes = 0;

        const fileStream = fs.createWriteStream(destPath);

        response.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          const downloadedMb = Math.round((receivedBytes / (1024 * 1024)) * 10) / 10;
          const totalMb = totalBytes > 0 ? Math.round((totalBytes / (1024 * 1024)) * 10) / 10 : downloadedMb;
          let percent = 0;
          if (totalBytes > 0) {
            percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
          } else {
            percent = Math.min(95, Math.round(Math.log10(receivedBytes + 1) * 15));
          }
          onProgress(percent, downloadedMb, totalMb);
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            const finalSize = fs.existsSync(destPath) ? fs.statSync(destPath).size : 0;
            const finalMb = Math.round((finalSize / (1024 * 1024)) * 10) / 10;
            // Minimum sanity check — a valid server JAR must be at least 10 KB
            if (finalSize < 10 * 1024) {
              fs.unlink(destPath, () => {});
              return reject(new Error(`Downloaded file is too small (${finalSize} bytes) — the server JAR may be invalid or the download was incomplete.`));
            }
            onProgress(100, finalMb, finalMb);
            resolve();
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });

      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Download timed out after 60 seconds'));
      });
    };

    handleRequest(url);
  });
}

export interface ModrinthSearchResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  downloads: number;
  follows: number;
  categories: string[];
  versions: string[];
  author: string;
  projectType: string;
}

export async function searchModrinthModpacks(query = '', limit = 24): Promise<ModrinthSearchResult[]> {
  try {
    const encodedFacets = encodeURIComponent(JSON.stringify([['project_type:modpack']]));
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodedFacets}&limit=${limit}&index=downloads`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)',
      },
    });
    if (!res.ok) throw new Error(`Modrinth modpacks error: ${res.status}`);
    const data = (await res.json()) as { hits: any[] };
    return (data.hits || []).map((h) => ({
      id: h.project_id,
      slug: h.slug,
      title: h.title,
      description: h.description,
      iconUrl: h.icon_url || null,
      downloads: h.downloads,
      follows: h.follows,
      categories: h.display_categories || h.categories || [],
      versions: h.versions || [],
      author: h.author,
      projectType: h.project_type,
    }));
  } catch (err) {
    console.error('Failed to search Modrinth modpacks:', err);
    return [];
  }
}

export async function searchModrinthResourcePacks(query = '', limit = 24): Promise<ModrinthSearchResult[]> {
  try {
    const encodedFacets = encodeURIComponent(JSON.stringify([['project_type:resourcepack']]));
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodedFacets}&limit=${limit}&index=downloads`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)',
      },
    });
    if (!res.ok) throw new Error(`Modrinth resourcepacks error: ${res.status}`);
    const data = (await res.json()) as { hits: any[] };
    return (data.hits || []).map((h) => ({
      id: h.project_id,
      slug: h.slug,
      title: h.title,
      description: h.description,
      iconUrl: h.icon_url || null,
      downloads: h.downloads,
      follows: h.follows,
      categories: h.display_categories || h.categories || [],
      versions: h.versions || [],
      author: h.author,
      projectType: h.project_type,
    }));
  } catch (err) {
    console.error('Failed to search Modrinth resource packs:', err);
    return [];
  }
}

export interface ModrinthProjectVersion {
  id: string;
  name: string;
  versionNumber: string;
  gameVersions: string[];
  loaders: string[];
  datePublished: string;
  downloads: number;
  file: {
    url: string;
    filename: string;
    sha1: string;
    size: number;
    primary: boolean;
  };
}

export async function searchModrinthPlugins(
  query = '',
  limit = 24,
  software: 'paper' | 'purpur' | 'fabric' | 'vanilla' = 'paper'
): Promise<ModrinthSearchResult[]> {
  try {
    let loaderCategories: string[] = ['categories:paper', 'categories:spigot', 'categories:purpur', 'categories:bukkit'];
    if (software === 'fabric') {
      loaderCategories = ['categories:fabric'];
    }
    const facets = [loaderCategories];
    const encodedFacets = encodeURIComponent(JSON.stringify(facets));
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodedFacets}&limit=${limit}&index=downloads`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)',
      },
    });
    if (!res.ok) throw new Error(`Modrinth plugins error: ${res.status}`);
    const data = (await res.json()) as { hits: any[] };
    return (data.hits || []).map((h) => ({
      id: h.project_id,
      slug: h.slug,
      title: h.title,
      description: h.description,
      iconUrl: h.icon_url || null,
      downloads: h.downloads,
      follows: h.follows,
      categories: h.display_categories || h.categories || [],
      versions: h.versions || [],
      author: h.author,
      projectType: h.project_type,
    }));
  } catch (err) {
    console.error('Failed to search Modrinth plugins:', err);
    return [];
  }
}

function parseModrinthVersions(rawVersions: any[]): ModrinthProjectVersion[] {
  if (!Array.isArray(rawVersions)) return [];
  return rawVersions.map((v) => {
    const primaryFile = (v.files || []).find((f: any) => f.primary) || (v.files || [])[0] || {};
    return {
      id: v.id,
      name: v.name || v.version_number,
      versionNumber: v.version_number,
      gameVersions: v.game_versions || [],
      loaders: v.loaders || [],
      datePublished: v.date_published,
      downloads: v.downloads || 0,
      file: {
        url: primaryFile.url || '',
        filename: primaryFile.filename || '',
        sha1: primaryFile.hashes?.sha1 || '',
        size: primaryFile.size || 0,
        primary: !!primaryFile.primary,
      },
    };
  });
}

export async function getModrinthProjectVersions(
  projectIdOrSlug: string,
  loaders?: string[],
  gameVersion?: string
): Promise<ModrinthProjectVersion[]> {
  try {
    let url = `https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`;
    const params = new URLSearchParams();
    if (loaders && loaders.length > 0) {
      params.append('loaders', JSON.stringify(loaders));
    }
    if (gameVersion) {
      params.append('game_versions', JSON.stringify([gameVersion]));
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)',
      },
    });
    if (!res.ok) {
      const fallbackRes = await fetch(`https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`, {
        headers: { 'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)' },
      });
      if (!fallbackRes.ok) return [];
      return parseModrinthVersions(await fallbackRes.json());
    }
    const raw = await res.json();
    const parsed = parseModrinthVersions(raw);
    if (parsed.length === 0) {
      const allRes = await fetch(`https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`, {
        headers: { 'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)' },
      });
      if (allRes.ok) {
        return parseModrinthVersions(await allRes.json());
      }
    }
    return parsed;
  } catch (err) {
    console.error('Failed to get Modrinth versions:', err);
    return [];
  }
}

export async function getModrinthVersionFile(projectIdOrSlug: string): Promise<{
  url: string;
  filename: string;
  sha1: string;
  size: number;
} | null> {
  try {
    const res = await fetch(`https://api.modrinth.com/v2/project/${projectIdOrSlug}/version`, {
      headers: {
        'User-Agent': 'CraftDock/3.4.0 (contact: github.com/itsnotsimple/craftdock)',
      },
    });
    if (!res.ok) return null;
    const versions = (await res.json()) as Array<{
      files: Array<{ url: string; filename: string; primary: boolean; hashes: { sha1: string }; size: number }>;
    }>;
    if (!versions || versions.length === 0) return null;
    const primaryFile = versions[0].files.find((f) => f.primary) || versions[0].files[0];
    if (!primaryFile) return null;
    return {
      url: primaryFile.url,
      filename: primaryFile.filename,
      sha1: primaryFile.hashes?.sha1 || '',
      size: primaryFile.size || 0,
    };
  } catch (err) {
    console.error('Failed to get Modrinth version file:', err);
    return null;
  }
}
