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

export class AdminReuploadFileDto {
  @ApiProperty({ description: "논문 파일(thesis_file) id" })
  thesisFileId: number;

  @ApiProperty({ description: "심사 단계", enum: Stage })
  stage: Stage;

  @ApiProperty({ description: "파일 종류", enum: ThesisFileType })
  type: ThesisFileType;

  @ApiProperty({ description: "기존 제출 파일 이름" })
  fileName: string | null;

  @ApiProperty({ description: "재업로드 상태", enum: ReuploadStatus })
  status: ReuploadStatus;

  @ApiProperty({ description: "재업로드 시각", nullable: true })
  reuploadedAt: Date | null;
}

export class AdminReuploadStudentDto {
  @ApiProperty({ description: "학생 user id" })
  studentId: number;

  @ApiProperty({ description: "학번" })
  loginId: string;

  @ApiProperty({ description: "이름" })
  name: string;

  @ApiProperty({ description: "학과", nullable: true })
  department: string | null;

  @ApiProperty({ description: "재업로드가 필요한(아직 안 올린) 파일 수" })
  missingCount: number;

  @ApiProperty({ description: "재업로드를 마친 파일 수" })
  reuploadedCount: number;

  @ApiProperty({ description: "정상 보관 중인 파일 수" })
  okCount: number;

  @ApiProperty({ description: "가장 최근 재업로드 시각", nullable: true })
  lastReuploadedAt: Date | null;

  @ApiProperty({ type: [AdminReuploadFileDto] })
  files: AdminReuploadFileDto[];
}

export class AdminReuploadSummaryDto {
  @ApiProperty({ description: "제출 파일이 있는 학생 수" })
  studentCount: number;

  @ApiProperty({ description: "재업로드 대상 학생 수 (유실 파일이 하나라도 있었던 학생)" })
  affectedStudentCount: number;

  @ApiProperty({ description: "재업로드를 모두 마친 학생 수" })
  completedStudentCount: number;

  @ApiProperty({ description: "아직 재업로드하지 않은 파일 수" })
  missingFileCount: number;

  @ApiProperty({ description: "재업로드를 마친 파일 수" })
  reuploadedFileCount: number;
}

export class AdminReuploadStatusDto {
  @ApiProperty({ type: AdminReuploadSummaryDto })
  summary: AdminReuploadSummaryDto;

  @ApiProperty({ type: [AdminReuploadStudentDto] })
  items: AdminReuploadStudentDto[];
}

export enum SignReuploadStatus {
  /** 서명 파일이 연결돼 있지만 저장소에 없어 다시 올려야 하는 상태 */
  MISSING = "MISSING",
  /** 저장소에 서명 파일이 있는 상태 (장애 이후 새로 올린 서명) */
  UPLOADED = "UPLOADED",
  /** 서명을 한 번도 등록하지 않은 상태 */
  NONE = "NONE",
}

export class AdminSignReuploadProfessorDto {
  @ApiProperty({ description: "교수 user id" })
  professorId: number;

  @ApiProperty({ description: "로그인 아이디" })
  loginId: string;

  @ApiProperty({ description: "이름" })
  name: string;

  @ApiProperty({ description: "학과", nullable: true })
  department: string | null;

  @ApiProperty({ description: "이메일", nullable: true })
  email: string | null;

  @ApiProperty({ description: "서명 상태", enum: SignReuploadStatus })
  status: SignReuploadStatus;

  @ApiProperty({ description: "현재 연결된 서명 파일 업로드 시각", nullable: true })
  signUploadedAt: Date | null;

  @ApiProperty({ description: "심사를 맡고 있는 학생 수 (지도교수·심사위원 포함)" })
  assignedStudentCount: number;
}

export class AdminSignReuploadSummaryDto {
  @ApiProperty({ description: "교수 수" })
  professorCount: number;

  @ApiProperty({ description: "서명을 다시 올려야 하는 교수 수" })
  missingCount: number;

  @ApiProperty({ description: "서명이 저장소에 있는 교수 수" })
  uploadedCount: number;

  @ApiProperty({ description: "서명을 등록한 적 없는 교수 수" })
  noneCount: number;
}

export class AdminSignReuploadStatusDto {
  @ApiProperty({ type: AdminSignReuploadSummaryDto })
  summary: AdminSignReuploadSummaryDto;

  @ApiProperty({ type: [AdminSignReuploadProfessorDto] })
  items: AdminSignReuploadProfessorDto[];
}
