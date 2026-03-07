import { net } from 'electron';
import { createHash } from 'crypto';
import { access, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

export class RepositoryResourceClient {
  public async fetchJson(url: string): Promise<unknown> {
    if (url.startsWith('file://')) {
      return this.fetchLocalJson(url);
    }

    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url,
        headers: {
          'User-Agent': 'Zaphnath Bible Reader/1.0',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      let responseData = '';

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const contentType = response.headers['content-type'];
        if (contentType && !contentType.includes('application/json')) {
          console.warn(`Unexpected content type: ${contentType}`);
        }

        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          clearTimeout(timeout);
          try {
            const cleanData = responseData.replace(/^\uFEFF/, '');
            resolve(JSON.parse(cleanData));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error}`));
          }
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Network error: ${error.message}`));
      });

      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error('Request timeout'));
      }, 30000);

      request.end();
    });
  }

  public async downloadFile(url: string, maxSize: number = 100 * 1024 * 1024): Promise<Buffer> {
    if (url.startsWith('file://')) {
      return this.downloadLocalFile(url, maxSize);
    }

    return new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url,
        headers: {
          'User-Agent': 'Zaphnath Bible Reader/1.0',
        },
      });

      const chunks: Buffer[] = [];
      let totalSize = 0;

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const contentLength = parseInt((response.headers['content-length'] as string) || '0');
        if (contentLength > maxSize) {
          reject(new Error(`File too large: ${contentLength} bytes (max: ${maxSize})`));
          return;
        }

        response.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            request.abort();
            reject(new Error(`File too large: exceeded ${maxSize} bytes`));
            return;
          }
          chunks.push(chunk);
        });

        response.on('end', () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Download error: ${error.message}`));
      });

      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error('Download timeout'));
      }, 60000);

      request.end();
    });
  }

  public calculateChecksum(data: Buffer): string {
    const hash = createHash('sha256');
    hash.update(data);
    return `sha256:${hash.digest('hex')}`;
  }

  private async fetchLocalJson(fileUrl: string): Promise<unknown> {
    try {
      const filePath = fileURLToPath(fileUrl);
      await access(filePath);

      const fileContent = await readFile(filePath, 'utf-8');
      const cleanContent = fileContent.replace(/^\uFEFF/, '');
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error(`Failed to read local file: ${error}`);
    }
  }

  private async downloadLocalFile(fileUrl: string, maxSize: number): Promise<Buffer> {
    try {
      const filePath = fileURLToPath(fileUrl);
      await access(filePath);

      const fileBuffer = await readFile(filePath);
      if (fileBuffer.length > maxSize) {
        throw new Error(`File too large: ${fileBuffer.length} bytes (max: ${maxSize})`);
      }

      return fileBuffer;
    } catch (error) {
      throw new Error(`Failed to read local file: ${error}`);
    }
  }
}
