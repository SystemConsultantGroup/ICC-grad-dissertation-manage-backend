import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";
import { PrismaService } from "src/config/database/prisma.service";
import { MinioClientService } from "src/config/file/minio-client.service";
import { v1 } from "uuid";
import { FileDto } from "./dtos/file.dto";
import { ReuploadStatus, ReuploadTargetDto } from "./dtos/reupload-target.dto";

// 저장소 객체 메타데이터 키 (statObject 는 소문자 키로 돌려준다)
const REUPLOADED_AT_KEY = "reuploaded-at";
const REUPLOADED_NAME_KEY = "reuploaded-name";
@Injectable()
export class FilesService {
  constructor(
    private readonly minioClientService: MinioClientService,
    private readonly prismaService: PrismaService
  ) {}

  async createFile(uploadedFile: Express.Multer.File) {
    try {
      return await this.prismaService.$transaction(
        async (tx) => {
          const { originalname, mimetype, size, buffer } = uploadedFile;
          const createdAt = new Date();
          const key = v1();

          await this.minioClientService.uploadFile(
            key,
            buffer,
            size,
            createdAt,
            Buffer.from(originalname, "latin1").toString("utf8"),
            mimetype
          );
          return await tx.file.create({
            data: {
              name: Buffer.from(originalname, "latin1").toString("utf8"),
              mimeType: mimetype,
              uuid: key,
              createdAt: createdAt,
            },
          });
        },
        {
          maxWait: 4000,
          timeout: 4000,
        }
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException("파일 업로드에 문제가 발생하였습니다");
    }
  }

  async deleteFile(uuid: string) {
    try {
      return await this.prismaService.$transaction(async (tx) => {
        await tx.file.delete({
          where: {
            uuid,
          },
        });

        return await this.minioClientService.removeFile(uuid);
      });
    } catch (error) {
      throw new InternalServerErrorException("파일 삭제에 문제가 발생하였습니다");
    }
  }

  async getLocalFile(directory: string, filename: string) {
    const filePath = path.join("resources", directory, filename);
    if (fs.existsSync(filePath)) {
      const stream = fs.createReadStream(filePath);

      return stream;
    } else {
      throw new InternalServerErrorException("파일을 찾을 수 없습니다.");
    }
  }

  /**
   * 학생 본인이 제출한 논문·발표 파일 중 저장소에서 유실된 파일(또는 이미 재업로드한 파일) 목록.
   * DB 의 file 레코드는 그대로 두고, 저장소에 객체가 있는지로 상태를 판단한다.
   */
  async getMyReuploadTargets(user: User): Promise<ReuploadTargetDto[]> {
    const thesisFiles = await this.prismaService.thesisFile.findMany({
      where: {
        fileId: { not: null },
        ThesisInfo: { process: { studentId: user.id, student: { deletedAt: null } } },
      },
      include: { file: true, ThesisInfo: true },
      orderBy: [{ ThesisInfo: { stage: "asc" } }, { type: "asc" }],
    });

    return Promise.all(
      thesisFiles.map(async (thesisFile) => {
        const stat = await this.minioClientService.statFile(thesisFile.fileId);
        const reuploadedAt = stat?.metaData?.[REUPLOADED_AT_KEY];
        const reuploadedName = stat?.metaData?.[REUPLOADED_NAME_KEY];
        const status = !stat ? ReuploadStatus.MISSING : reuploadedAt ? ReuploadStatus.REUPLOADED : ReuploadStatus.OK;

        return {
          thesisFileId: thesisFile.id,
          stage: thesisFile.ThesisInfo.stage,
          type: thesisFile.type,
          file: new FileDto(thesisFile.file),
          status,
          reuploadedAt: reuploadedAt ? new Date(reuploadedAt) : null,
          reuploadedName: reuploadedName ? decodeURI(reuploadedName) : null,
        };
      })
    );
  }

  /**
   * 유실된 제출 파일을 같은 uuid(저장소 key)로 다시 올린다.
   * DB 는 건드리지 않으므로 최초 제출 시각·파일명·심사 연결이 그대로 유지된다.
   */
  async reuploadMyFile(user: User, uuid: string, uploadedFile: Express.Multer.File) {
    if (!uploadedFile) throw new BadRequestException("업로드할 파일을 첨부해 주세요.");

    const thesisFile = await this.prismaService.thesisFile.findFirst({
      where: {
        fileId: uuid,
        ThesisInfo: { process: { studentId: user.id, student: { deletedAt: null } } },
      },
      include: { file: true },
    });
    if (!thesisFile) throw new NotFoundException("본인이 제출한 파일이 아닙니다.");

    const stat = await this.minioClientService.statFile(uuid);
    if (stat && !stat.metaData?.[REUPLOADED_AT_KEY]) {
      throw new BadRequestException("정상적으로 보관 중인 파일이라 다시 올릴 필요가 없습니다.");
    }

    const newName = Buffer.from(uploadedFile.originalname, "latin1").toString("utf8");
    const originalExt = path.extname(thesisFile.file.name ?? "").toLowerCase();
    const newExt = path.extname(newName).toLowerCase();
    if (originalExt && originalExt !== newExt) {
      throw new BadRequestException(`기존 제출 파일과 같은 형식(${originalExt})의 파일만 올릴 수 있습니다.`);
    }

    const now = new Date();
    await this.minioClientService.uploadFile(
      uuid,
      uploadedFile.buffer,
      uploadedFile.size,
      thesisFile.file.createdAt,
      thesisFile.file.name ?? newName,
      thesisFile.file.mimeType ?? uploadedFile.mimetype,
      {
        [REUPLOADED_AT_KEY]: now.toISOString(),
        [REUPLOADED_NAME_KEY]: encodeURI(newName),
        "reuploaded-size": String(uploadedFile.size),
      }
    );

    return { uuid, reuploadedAt: now, reuploadedName: newName };
  }

  async getFile(key: string) {
    try {
      const stream = await this.minioClientService.getFile(key);
      return stream;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException("존재하지 않는 uuid입니다.");
    }
  }
}
