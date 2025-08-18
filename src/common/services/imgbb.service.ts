import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ImgbbUploadResult {
  url: string;
  displayUrl: string;
  width?: number;
  height?: number;
  size?: number;
}

// Note: imgbb does not provide stable album APIs publicly; album support removed

@Injectable()
export class ImgbbService {
  private readonly logger = new Logger(ImgbbService.name);
  private readonly apiKey: string | undefined = process.env.IMGBB_API_KEY;

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Upload a base64 image (data URL allowed) to imgbb
   */
  async uploadBase64(
    base64WithOptionalPrefix: string,
    options?: { name?: string; expirationSeconds?: number },
  ): Promise<ImgbbUploadResult | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const base64 = this.stripDataUrlPrefix(base64WithOptionalPrefix);
      const params = new URLSearchParams();
      params.append('image', base64);
      if (options?.name) params.append('name', options.name);
      if (options?.expirationSeconds)
        params.append('expiration', String(options.expirationSeconds));

      const url = `https://api.imgbb.com/1/upload?key=${this.apiKey}`;
      const response = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
      });

      const data = response.data?.data;
      return {
        url: data?.url || data?.display_url,
        displayUrl: data?.display_url || data?.url,
        width: data?.width,
        height: data?.height,
        size: data?.size,
      } as ImgbbUploadResult;
    } catch (error: any) {
      this.logger.warn(`Imgbb upload failed: ${error?.message || error}`);
      return null;
    }
  }

  // Album creation intentionally not implemented

  private stripDataUrlPrefix(value: string): string {
    const commaIndex = value.indexOf(',');
    if (value.startsWith('data:') && commaIndex !== -1) {
      return value.substring(commaIndex + 1);
    }
    return value;
  }
}
