import { ApiProperty } from "@nestjs/swagger";
import { Stage, ThesisFileType } from "@prisma/client";
import { FileDto } from "./file.dto";

export enum ReuploadStatus {
  /** 저장소에 파일이 없어 재업로드가 필요한 상태 */
  MISSING = "MISSING",
  /** 학생이 재업로드를 마친 상태 (재업로드 기간 동안 다시 바꿀 수 있음) */
  REUPLOADED = "REUPLOADED",
  /** 저장소에 원본이 정상적으로 남아 있는 상태 */
  OK = "OK",
}

export class ReuploadTargetDto {
  @ApiProperty({ description: "논문 파일(thesis_file) id" })
  thesisFileId: number;

  @ApiProperty({ description: "심사 단계", enum: Stage })
  stage: Stage;

  @ApiProperty({ description: "파일 종류", enum: ThesisFileType })
  type: ThesisFileType;

  @ApiProperty({ description: "기존 제출 파일 정보 (이름·최초 제출 시각)", type: FileDto })
  file: FileDto;

  @ApiProperty({ description: "재업로드 상태", enum: ReuploadStatus })
  status: ReuploadStatus;

  @ApiProperty({ description: "재업로드 시각", nullable: true })
  reuploadedAt: Date | null;

  @ApiProperty({ description: "재업로드한 파일 이름", nullable: true })
  reuploadedName: string | null;
}

export class ReuploadTargetListDto {
  @ApiProperty({ type: [ReuploadTargetDto] })
  items: ReuploadTargetDto[];
}
