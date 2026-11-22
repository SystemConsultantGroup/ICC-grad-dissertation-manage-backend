import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  Response,
  Delete,
  ParseUUIDPipe,
} from "@nestjs/common";
import { FilesService } from "./files.service";
import { JwtGuard } from "../auth/guards/jwt.guard";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ApiFile } from "./decorators/api-file.decorator";
import { CommonResponseDto } from "../../common/dtos/common-response.dto";
import { UseUserTypeGuard } from "../auth/decorators/user-type-guard.decorator";
import { User, UserType } from "@prisma/client";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { ReuploadTargetListDto } from "./dtos/reupload-target.dto";

@ApiTags("파일 API")
@ApiBearerAuth("access-token")
@UseGuards(JwtGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({ summary: " 파일 업로드" })
  @ApiFile("file")
  @ApiResponse({ type: CommonResponseDto, status: 201 })
  @ApiInternalServerErrorResponse({ description: "파일 업로드 실패" })
  async uploadFile(@UploadedFile() uploadedFile: Express.Multer.File) {
    const savedFile = await this.filesService.createFile(uploadedFile);

    return new CommonResponseDto(savedFile);
  }

  @Delete(":key")
  @ApiOperation({ summary: " 파일 삭제 " })
  @ApiFile("file")
  @ApiResponse({ type: CommonResponseDto, status: 200 })
  @ApiInternalServerErrorResponse({ description: "파일 삭제 실패" })
  async deleteFile(@Param("key", ParseUUIDPipe) key: string) {
    await this.filesService.deleteFile(key);

    return new CommonResponseDto();
  }

  @Get("excels/student")
  @ApiOperation({ summary: "학생 일괄등록 엑셀 양식 다운로드" })
  @UseUserTypeGuard([UserType.ADMIN])
  @ApiResponse({ description: "학생 일괄등록 엑셀 양식", status: 200 })
  @ApiBadRequestResponse({ description: "파일 다운로드 실패" })
  async getStudentExcelForm(@Response() res) {
    const fileName = "연구논문작품시스템_학생_일괄등록_양식.xlsx";
    const stream = await this.filesService.getLocalFile("excel", fileName);

    res.setHeader("Content-Disposition", `attachment; filename=${encodeURI(fileName)}`);
    stream.pipe(res);
  }

  @Get("excels/professor")
  @ApiOperation({ summary: "교수 일괄등록 엑셀 양식 다운로드" })
  @UseUserTypeGuard([UserType.ADMIN])
  @ApiResponse({ description: "교수 일괄등록 엑셀 양식", status: 200 })
  @ApiBadRequestResponse({ description: "파일 다운로드 실패" })
  async getProfessorExcelForm(@Response() res) {
    const fileName = "연구논문작품시스템_교수_일괄등록_양식.xlsx";
    const stream = await this.filesService.getLocalFile("excel", fileName);

    res.setHeader("Content-Disposition", `attachment; filename=${encodeURI(fileName)}`);
    stream.pipe(res);
  }

  @Get("reupload/me")
  @UseUserTypeGuard([UserType.STUDENT])
  @ApiOperation({
    summary: "재업로드 대상 파일 조회 (학생)",
    description: "본인이 제출한 논문·발표 파일별로 저장소 보관 상태(MISSING/REUPLOADED/OK)를 조회한다.",
  })
  @ApiOkResponse({ type: ReuploadTargetListDto })
  async getMyReuploadTargets(@CurrentUser() user: User) {
    const items = await this.filesService.getMyReuploadTargets(user);

    return new CommonResponseDto({ items });
  }

  @Put("reupload/:uuid")
  @UseUserTypeGuard([UserType.STUDENT])
  @ApiOperation({
    summary: "유실된 제출 파일 재업로드 (학생)",
    description: "기존 파일과 같은 uuid 로 저장소에만 다시 올린다. DB 의 제출 시각·파일명은 바뀌지 않는다.",
  })
  @ApiFile("file")
  @ApiOkResponse({ type: CommonResponseDto })
  @ApiBadRequestResponse({ description: "정상 보관 중인 파일이거나 파일 형식이 다름" })
  @ApiNotFoundResponse({ description: "본인이 제출한 파일이 아님" })
  async reuploadMyFile(
    @CurrentUser() user: User,
    @Param("uuid", ParseUUIDPipe) uuid: string,
    @UploadedFile() uploadedFile: Express.Multer.File
  ) {
    const result = await this.filesService.reuploadMyFile(user, uuid, uploadedFile);

    return new CommonResponseDto(result);
  }

  @Get(":id")
  @ApiOperation({ summary: " 파일 다운로드 (서명 이미지)" })
  async getFile(@Param("id") id: string, @Response() res) {
    const stream = await this.filesService.getFile(id);
    stream.pipe(res);
  }
}
