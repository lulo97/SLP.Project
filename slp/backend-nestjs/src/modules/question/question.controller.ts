// src/modules/question/question.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiOperation,
} from "@nestjs/swagger";
import { QuestionService } from "./question.service";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { QuestionDto, QuestionListDto } from "./dto/question.dto";
import { QuestionSearchDto } from "./dto/question-search.dto";
import { PaginatedQuestionListDto } from "./dto/paginated-question-list.dto";
import { SessionGuard } from "../../common/guards/session.guard";
import { User } from "../../common/decorators/user.decorator";
import { isAdmin } from "../../helpers/admin.helper";

@ApiTags("questions")
@ApiBearerAuth()
@Controller("api/question")
@UseGuards(SessionGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get question by ID" })
  @ApiResponse({ status: 200, type: QuestionDto })
  @ApiResponse({ status: 404, description: "Question not found" })
  async getQuestion(@Param("id") id: string, @User() user: any) {
    const question = await this.questionService.getQuestionById(+id);
    if (!question) throw new NotFoundException("Question not found");
    return question;
  }

  @Get()
  @ApiOperation({ summary: "Get questions with search/filter" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "tags", required: false, isArray: true, type: String })
  @ApiQuery({ name: "mine", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: PaginatedQuestionListDto })
  async getQuestions(
    @Query("search") search?: string,
    @Query("type") type?: string,
    @Query("tags") tags?: string | string[],
    @Query("mine") mine?: boolean,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @User() user?: any,
  ) {
    // Parse tags from query (could be string or array)
    let tagArray: string[] | undefined;
    if (tags) {
      tagArray = Array.isArray(tags) ? tags : [tags];
    }

    const searchDto: QuestionSearchDto = {
      searchTerm: search,
      type: type,
      tags: tagArray,
      userId: mine === true ? user?.id : undefined,
    };

    // Apply pagination constraints
    const effectivePage = Math.max(1, page);
    const effectivePageSize = Math.min(50, Math.max(1, pageSize));

    const result = await this.questionService.searchQuestions(
      searchDto,
      effectivePage,
      effectivePageSize,
    );
    // result is PaginatedResult<QuestionListDto> which matches shape of PaginatedQuestionListDto
    return new PaginatedQuestionListDto(
      result.items,
      result.total,
      result.page,
      result.pageSize,
    );
  }

  @Post()
  @ApiOperation({ summary: "Create a new question" })
  @ApiResponse({ status: 201, type: QuestionDto })
  async createQuestion(@Body() dto: CreateQuestionDto, @User() user: any) {
    if (!user) throw new UnauthorizedException();
    const question = await this.questionService.createQuestion(user.id, dto);
    return question;
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a question" })
  @ApiResponse({ status: 200, type: QuestionDto })
  @ApiResponse({ status: 403, description: "Not owner" })
  @ApiResponse({ status: 404, description: "Question not found" })
  async updateQuestion(
    @Param("id") id: string,
    @Body() dto: UpdateQuestionDto,
    @User() user: any,
  ) {
    if (!user) throw new UnauthorizedException();
    const updated = await this.questionService.updateQuestion(
      +id,
      user.id,
      dto,
    );
    if (!updated) throw new NotFoundException("Question not found");
    return updated;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a question (admin or owner)" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 403, description: "Not authorized" })
  @ApiResponse({ status: 404, description: "Question not found" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(@Param("id") id: string, @User() user: any) {
    if (!user) throw new UnauthorizedException();
    const isAdminUser = isAdmin(user.id); // Hardcoded admin check
    const deleted = await this.questionService.deleteQuestion(
      +id,
      user.id,
      isAdminUser,
    );
    if (!deleted) throw new NotFoundException("Question not found");
  }
}
