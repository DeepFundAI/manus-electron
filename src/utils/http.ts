export class HttpClient {
  private headers: Record<string, string>;
  private timeout: number;

  constructor(baseURL?: string, timeout = 30000) {
    this.timeout = timeout;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1'
    };
  }

  async get(url: string, config?: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.headers,
          ...config?.headers
        },
        signal: controller.signal,
        redirect: 'follow' // Automatically follow redirects
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.text();

      // Return axios-like response object
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url, // This is the final URL after redirects
        request: {
          responseURL: response.url
        },
        config: { url }
      };

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async post(url: string, data?: any, config?: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.headers,
          ...config?.headers
        },
        body: data,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async download(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: this.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  setHeaders(headers: Record<string, string>) {
    Object.assign(this.headers, headers);
  }
}

export const httpClient = new HttpClient();