import type { FastifyPluginAsync } from 'fastify';
import type { MosBibleBookKey, MosBibleSpeedQuizSubmissionRequest } from '@mos-lab/shared';
import { BibleService } from './bible.service.js';

interface CreateProposalBody {
  book: MosBibleBookKey;
  title: string;
  summary: string;
  commandments: string[];
  rationale: string;
  examples?: string[];
  tags: string[];
}

interface RejectProposalBody {
  note?: string;
}

interface SubmitQuizBody {
  questionId: string;
  selectedKey: 'A' | 'B' | 'C' | 'D';
}

export const bibleRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/bible/proposals - List all proposals
   */
  server.get('/bible/proposals', async (request, reply) => {
    const crm = server.prisma.crm;
    const proposals = await BibleService.listProposals(crm);
    return reply.send({ success: true, data: proposals });
  });

  /**
   * POST /api/bible/proposals - Submit a new proposal
   */
  server.post<{ Body: CreateProposalBody }>('/bible/proposals', async (request, reply) => {
    const crm = server.prisma.crm;
    const user = (request as unknown as { user?: { id?: number; name?: string; role?: string } }).user;

    const staff = {
      id: user?.id || 1,
      name: user?.name || 'Danny Do',
      role: user?.role || 'super_admin',
    };

    const { book, title, summary, commandments, rationale, examples, tags } = request.body || {};

    if (!title || !summary || !Array.isArray(commandments) || commandments.length === 0) {
      return reply.code(400).send({
        success: false,
        error: 'Tiêu đề, tóm tắt và danh sách điều khoản không được để trống.',
      });
    }

    const proposal = await BibleService.createProposal(
      crm,
      {
        book: book || 'GOVERNANCE',
        title,
        summary,
        commandments,
        rationale: rationale || '',
        examples: examples || [],
        tags: tags || [],
      },
      staff
    );

    return reply.code(201).send({
      success: true,
      data: proposal,
      message: `Đã nộp đề xuất Điều răn. Phân loại thẩm quyền: ${
        proposal.tier === 'DANNY_FINAL' ? 'Anh Danny Do duyệt cuối cùng' : 'Core Team duyệt'
      }`,
    });
  });

  /**
   * POST /api/bible/proposals/:id/approve - Approve a proposal
   */
  server.post<{ Params: { id: string } }>('/bible/proposals/:id/approve', async (request, reply) => {
    const crm = server.prisma.crm;
    const { id } = request.params;
    const user = (request as unknown as { user?: { id?: number; name?: string; role?: string } }).user;

    const reviewer = {
      id: user?.id || 1,
      name: user?.name || 'Danny Do',
      role: user?.role || 'super_admin',
    };

    const result = await BibleService.approveProposal(crm, id, reviewer);
    if (!result.success) {
      return reply.code(403).send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      data: result.proposal,
      message: 'Đã phê duyệt đề xuất Điều răn vào Kinh Thánh mOS thành công.',
    });
  });

  /**
   * POST /api/bible/proposals/:id/reject - Reject a proposal
   */
  server.post<{ Params: { id: string }; Body: RejectProposalBody }>(
    '/bible/proposals/:id/reject',
    async (request, reply) => {
      const crm = server.prisma.crm;
      const { id } = request.params;
      const { note } = request.body || {};
      const user = (request as unknown as { user?: { id?: number; name?: string; role?: string } }).user;

      const reviewer = {
        id: user?.id || 1,
        name: user?.name || 'Danny Do',
        role: user?.role || 'super_admin',
      };

      const result = await BibleService.rejectProposal(crm, id, reviewer, note);
      if (!result.success) {
        return reply.code(400).send({ success: false, error: result.error });
      }

      return reply.send({
        success: true,
        data: result.proposal,
        message: 'Đã từ chối đề xuất Điều răn.',
      });
    }
  );

  /**
   * GET /api/bible/quiz/weekly - Get the active weekly quiz for Core Team / Staff
   */
  server.get('/bible/quiz/weekly', async (request, reply) => {
    const questions = BibleService.getWeeklyQuiz();
    // Strip correctKey and explanation before sending to client for fair play
    const sanitized = questions.map(({ correctKey, explanation, ...rest }) => rest);
    return reply.send({ success: true, data: sanitized });
  });

  /**
   * POST /api/bible/quiz/submit - Submit quiz answer & receive cultural feedback + reward
   */
  server.post<{ Body: SubmitQuizBody }>('/bible/quiz/submit', async (request, reply) => {
    const { questionId, selectedKey } = request.body || {};
    if (!questionId || !selectedKey) {
      return reply.code(400).send({ success: false, error: 'Thiếu questionId hoặc selectedKey' });
    }

    const result = BibleService.evaluateQuizSubmission(questionId, selectedKey);
    if (!result) {
      return reply.code(404).send({ success: false, error: 'Không tìm thấy câu hỏi này' });
    }

    return reply.send({
      success: true,
      data: result,
      message: result.isCorrect
        ? `Xuất sắc! Bạn đã trả lời đúng và nhận +${result.earnedPoints} điểm Minigame.`
        : 'Chưa chính xác, hãy đọc kỹ phần giải thích theo Kinh Thánh mOS nhé.',
    });
  });

  /**
   * GET /api/bible/quiz/speed/profile - Get staff Speed Quiz & Banana Vault profile
   */
  server.get('/bible/quiz/speed/profile', async (request, reply) => {
    const crm = server.prisma.crm;
    const user = (request as unknown as { user?: { id?: number } }).user;
    const staffId = user?.id || 1;

    const profile = await BibleService.getSpeedQuizProfile(crm, staffId);
    return reply.send({ success: true, data: profile });
  });

  /**
   * GET /api/bible/quiz/speed/questions - Get 10 random questions for a Speed Quiz run
   */
  server.get('/bible/quiz/speed/questions', async (request, reply) => {
    const questions = BibleService.getSpeedQuizQuestions(10);
    const sanitized = questions.map(({ correctKey, explanation, ...rest }) => rest);
    return reply.send({ success: true, data: sanitized });
  });

  /**
   * POST /api/bible/quiz/speed/submit - Submit Speed Quiz run & award Bananas
   */
  server.post<{ Body: MosBibleSpeedQuizSubmissionRequest }>('/bible/quiz/speed/submit', async (request, reply) => {
    const crm = server.prisma.crm;
    const user = (request as unknown as { user?: { id?: number } }).user;
    const staffId = user?.id || 1;
    const { answers } = request.body || {};

    if (!Array.isArray(answers)) {
      return reply.code(400).send({ success: false, error: 'Danh sách câu trả lời không hợp lệ.' });
    }

    const result = await BibleService.submitSpeedQuizRun(crm, staffId, answers);
    if (!result.success) {
      return reply.code(400).send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      data: result.data,
      message: result.data?.message,
    });
  });
};
