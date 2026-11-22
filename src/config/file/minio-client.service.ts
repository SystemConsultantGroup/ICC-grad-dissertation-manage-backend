import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import { MinioService } from "nestjs-minio-client";

const NOT_FOUND_CODES = ["NoSuchKey", "NotFound"];

@Injectable()
export class MinioClientService {
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly minioService: MinioService
  ) {
    this.minioClient = this.minioService.client;
    this.bucket = this.configService.get("MINIO_BUCKET_NAME");
  }

  async uploadFile(
    key: string,
    file: Buffer,
    size: number,
    createdAt: Date,
    originalName: string,
    mimeType: string,
    extraMetaData: Record<string, string> = {}
  ) {
    const metaData = {
      "Content-Type": mimeType,
      createdAt: createdAt.toUTCString(),
      originalName: encodeURI(originalName),
      ...extraMetaData,
    };

    try {
      await this.minioClient.putObject(this.bucket, key, file, size, metaData);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async removeFile(key: string) {
    try {
      return await this.minioClient.removeObject(this.bucket, key);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async getFile(key: string) {
    try {
      return await this.minioClient.getObject(this.bucket, key);
    } catch (err) {
      if (NOT_FOUND_CODES.includes(err.code)) {
        throw new NotFoundException("저장소에서 파일을 찾을 수 없습니다.");
      }
      throw new BadRequestException(err.message);
    }
  }

  /**
   * 저장소에 객체가 있으면 메타데이터를, 없으면 null을 반환한다.
   * 메타데이터 키는 소문자로 내려온다. (예: reuploaded-at)
   */
  async statFile(key: string): Promise<Minio.BucketItemStat | null> {
    try {
      return await this.minioClient.statObject(this.bucket, key);
    } catch (err) {
      if (NOT_FOUND_CODES.includes(err.code)) return null;
      throw new BadRequestException(err.message);
    }
  }
}
