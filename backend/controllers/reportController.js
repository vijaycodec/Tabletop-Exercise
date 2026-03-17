const PDFDocument = require('pdfkit');
const Exercise = require('../models/Exercise');
const Participant = require('../models/Participant');

exports.generateReport = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const participants = await Participant.find({
      exercise: req.params.id,
      status: { $in: ['active', 'left'] }
    }).sort({ totalScore: -1 });

    // ── Compute max possible score & total questions ──
    const activeInjects = exercise.injects.filter(i => i.isActive);
    let maxPossibleScore = 0;
    let totalQuestions = 0;
    activeInjects.forEach(inject => {
      inject.phases.forEach(phase => {
        totalQuestions++;
        if (phase.questionType === 'single') {
          const pts = Math.max(...(phase.options?.map(o => o.points || 0) || [0]));
          maxPossibleScore += pts;
        } else if (phase.questionType === 'multiple') {
          const pts = (phase.options || []).reduce((s, o) => s + (o.points > 0 ? o.points : 0), 0);
          maxPossibleScore += pts;
        } else {
          maxPossibleScore += phase.maxPoints || 5;
        }
      });
    });

    const avgScore = participants.length > 0
      ? Math.round(participants.reduce((s, p) => s + (p.totalScore || 0), 0) / participants.length)
      : 0;

    const highest = participants[0]?.totalScore || 0;
    const lowest = participants[participants.length - 1]?.totalScore || 0;

    // ── Create PDF ──
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${exercise.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf"`
    );
    doc.pipe(res);

    const W = doc.page.width;   // 595
    const MARGIN = 50;
    const CONTENT_W = W - MARGIN * 2;

    // ── Helper: section title ──
    const sectionTitle = (text, y) => {
      doc.rect(MARGIN, y, CONTENT_W, 28).fill('#1F2937');
      doc.fill('#FFFFFF').fontSize(11).font('Helvetica-Bold')
        .text(text, MARGIN + 10, y + 8);
      return y + 36;
    };

    // ── Helper: horizontal bar ──
    const drawBar = (x, y, width, height, color) => {
      doc.rect(x, y, Math.max(width, 1), height).fill(color);
    };

    // ══════════════════════════════════════════
    // PAGE 1 — COVER
    // ══════════════════════════════════════════
    doc.rect(0, 0, W, 220).fill('#111827');

    doc.fill('#FFFFFF').fontSize(26).font('Helvetica-Bold')
      .text(exercise.title, MARGIN, 65, { width: CONTENT_W });

    doc.fill('#9CA3AF').fontSize(11).font('Helvetica')
      .text('Exercise Performance Report', MARGIN, 110);

    const dateStr = new Date().toLocaleDateString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.fill('#6B7280').fontSize(9).text(`Generated: ${dateStr}`, MARGIN, 130);

    if (exercise.description) {
      doc.fill('#D1D5DB').fontSize(9)
        .text(exercise.description, MARGIN, 155, { width: CONTENT_W });
    }

    // Summary stat boxes
    const stats = [
      { label: 'Participants', value: participants.length },
      { label: 'Avg Score',    value: avgScore },
      { label: 'Max Score',    value: maxPossibleScore },
      { label: 'Questions',    value: totalQuestions },
    ];
    const boxW = (CONTENT_W - 15) / 4;
    const boxY = 240;
    stats.forEach((s, i) => {
      const bx = MARGIN + i * (boxW + 5);
      doc.rect(bx, boxY, boxW, 72).fill('#F9FAFB').stroke('#E5E7EB');
      doc.fill('#111827').fontSize(22).font('Helvetica-Bold')
        .text(String(s.value), bx, boxY + 12, { width: boxW, align: 'center' });
      doc.fill('#6B7280').fontSize(8).font('Helvetica')
        .text(s.label.toUpperCase(), bx, boxY + 46, { width: boxW, align: 'center' });
    });

    // Score range note
    doc.fill('#6B7280').fontSize(9).font('Helvetica')
      .text(`Highest: ${highest}  |  Lowest: ${lowest}  |  Average: ${avgScore}`, MARGIN, boxY + 88, { align: 'center', width: CONTENT_W });

    // ══════════════════════════════════════════
    // PAGE 2 — PARTICIPANT LEADERBOARD
    // ══════════════════════════════════════════
    doc.addPage();

    doc.fill('#111827').fontSize(18).font('Helvetica-Bold').text('Participant Leaderboard', MARGIN, MARGIN);
    doc.fill('#6B7280').fontSize(9).font('Helvetica')
      .text(`${participants.length} participant${participants.length !== 1 ? 's' : ''} · ranked by score`, MARGIN, MARGIN + 24);

    let tY = MARGIN + 46;

    // Table header
    doc.rect(MARGIN, tY, CONTENT_W, 24).fill('#1F2937');
    doc.fill('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    const C = { rank: MARGIN + 6, name: MARGIN + 36, team: MARGIN + 200, score: MARGIN + 310, resp: MARGIN + 370, pct: MARGIN + 440 };
    doc.text('RANK', C.rank, tY + 7);
    doc.text('NAME', C.name, tY + 7);
    doc.text('TEAM', C.team, tY + 7);
    doc.text('SCORE', C.score, tY + 7);
    doc.text('RESPONSES', C.resp, tY + 7);
    doc.text('SCORE %', C.pct, tY + 7);
    tY += 24;

    participants.forEach((p, i) => {
      // New page if needed
      if (tY > doc.page.height - 60) {
        doc.addPage();
        tY = MARGIN;
      }

      const rowH = 26;
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
      doc.rect(MARGIN, tY, CONTENT_W, rowH).fill(bg);

      const pct = maxPossibleScore > 0
        ? Math.round((p.totalScore / maxPossibleScore) * 100)
        : 0;
      const scoreColor = p.totalScore >= avgScore ? '#059669' : '#DC2626';
      const respCount = p.responses?.length || 0;

      doc.fill('#6B7280').fontSize(8).font('Helvetica-Bold')
        .text(`#${i + 1}`, C.rank, tY + 8);
      doc.fill('#111827').font('Helvetica')
        .text((p.name || 'Anonymous').slice(0, 22), C.name, tY + 8, { width: 158 });
      doc.fill('#374151')
        .text((p.team || '—').slice(0, 16), C.team, tY + 8, { width: 105 });
      doc.fill(scoreColor).font('Helvetica-Bold')
        .text(String(p.totalScore || 0), C.score, tY + 8, { width: 55 });
      doc.fill('#374151').font('Helvetica')
        .text(`${respCount} / ${totalQuestions}`, C.resp, tY + 8, { width: 65 });
      doc.fill('#374151')
        .text(`${pct}%`, C.pct, tY + 8);

      // Row border
      doc.moveTo(MARGIN, tY + rowH).lineTo(MARGIN + CONTENT_W, tY + rowH).stroke('#E5E7EB');
      tY += rowH;
    });

    // ── Score Bar Chart ──
    const chartNeeded = tY + 60 + participants.length * 20 > doc.page.height - 40;
    if (chartNeeded) { doc.addPage(); tY = MARGIN; }
    else tY += 30;

    tY = sectionTitle('Score Comparison Chart', tY);

    const BAR_LABEL_W = 110;
    const BAR_MAX_W = CONTENT_W - BAR_LABEL_W - 50;
    const maxBar = Math.max(...participants.map(p => p.totalScore || 0), 1);

    participants.forEach((p, i) => {
      if (tY > doc.page.height - 40) { doc.addPage(); tY = MARGIN; }
      const bW = Math.max(((p.totalScore || 0) / maxBar) * BAR_MAX_W, 2);
      const barColor = (p.totalScore || 0) >= avgScore ? '#3B82F6' : '#93C5FD';

      doc.fill('#374151').fontSize(8).font('Helvetica')
        .text((p.name || 'Anon').slice(0, 18), MARGIN, tY + 3, { width: BAR_LABEL_W });
      drawBar(MARGIN + BAR_LABEL_W, tY, bW, 14, barColor);
      doc.fill('#374151').fontSize(8)
        .text(String(p.totalScore || 0), MARGIN + BAR_LABEL_W + bW + 4, tY + 3);
      tY += 20;
    });

    // Average line
    const avgLineX = MARGIN + BAR_LABEL_W + (avgScore / maxBar) * BAR_MAX_W;
    const chartTop = tY - participants.length * 20;
    doc.moveTo(avgLineX, chartTop - 4).lineTo(avgLineX, tY).dash(3, { space: 2 }).stroke('#EF4444');
    doc.undash();
    doc.fill('#EF4444').fontSize(7).text(`avg: ${avgScore}`, avgLineX - 12, chartTop - 13);

    // ══════════════════════════════════════════
    // PAGE(S) — PER INJECT BREAKDOWN
    // ══════════════════════════════════════════
    activeInjects.forEach(inject => {
      doc.addPage();
      let y = MARGIN;

      doc.fill('#111827').fontSize(14).font('Helvetica-Bold')
        .text(`Inject #${inject.injectNumber}: ${inject.title}`, MARGIN, y);
      y += 22;

      inject.phases.forEach(phase => {
        if (y > doc.page.height - 120) { doc.addPage(); y = MARGIN; }

        y = sectionTitle(phase.phaseName || `Phase ${phase.phaseNumber}`, y);

        if (phase.question) {
          doc.fill('#374151').fontSize(9).font('Helvetica')
            .text(phase.question, MARGIN, y, { width: CONTENT_W });
          y += doc.heightOfString(phase.question, { width: CONTENT_W }) + 8;
        }

        if (!phase.options || phase.options.length === 0) {
          doc.fill('#9CA3AF').fontSize(8).text('(text response — no options)', MARGIN, y);
          y += 20;
          return;
        }

        const totalResp = participants.filter(p =>
          p.responses?.some(r =>
            r.injectNumber === inject.injectNumber && r.phaseNumber === phase.phaseNumber
          )
        ).length;

        doc.fill('#6B7280').fontSize(8).font('Helvetica')
          .text(`${totalResp} response${totalResp !== 1 ? 's' : ''}`, MARGIN, y);
        y += 14;

        const OPT_LABEL_W = 170;
        const OPT_BAR_MAX = CONTENT_W - OPT_LABEL_W - 55;

        phase.options.forEach((opt, oi) => {
          if (y > doc.page.height - 40) { doc.addPage(); y = MARGIN; }

          const count = participants.filter(p => {
            const r = p.responses?.find(
              r => r.injectNumber === inject.injectNumber && r.phaseNumber === phase.phaseNumber
            );
            if (!r) return false;
            return Array.isArray(r.answer) ? r.answer.includes(opt.id) : r.answer === opt.id;
          }).length;

          const pct = totalResp > 0 ? Math.round((count / totalResp) * 100) : 0;
          const bW = Math.max((pct / 100) * OPT_BAR_MAX, 1);

          // Option label
          doc.fill('#374151').fontSize(8).font('Helvetica')
            .text((opt.text || `Option ${oi + 1}`).slice(0, 35), MARGIN, y + 3, { width: OPT_LABEL_W });

          // Background track
          doc.rect(MARGIN + OPT_LABEL_W, y, OPT_BAR_MAX, 14).fill('#F3F4F6').stroke('#E5E7EB');

          // Fill bar
          const barFill = opt.magnitude === 'most_effective' ? '#059669'
            : opt.magnitude === 'effective' ? '#3B82F6'
            : opt.magnitude === 'somewhat_effective' ? '#F59E0B'
            : '#EF4444';
          drawBar(MARGIN + OPT_LABEL_W, y, bW, 14, barFill);

          // Count + pct
          doc.fill('#374151').fontSize(8)
            .text(`${count} (${pct}%)`, MARGIN + OPT_LABEL_W + OPT_BAR_MAX + 4, y + 3);

          y += 20;
        });

        y += 10;
      });
    });

    // ══════════════════════════════════════════
    // PAGE — SCORE HEATMAP (participants × injects)
    // ══════════════════════════════════════════
    if (activeInjects.length > 0 && participants.length > 0) {
      doc.addPage();
      let y = MARGIN;

      doc.fill('#111827').fontSize(14).font('Helvetica-Bold')
        .text('Score Heatmap — Participants × Injects', MARGIN, y);
      y += 22;
      doc.fill('#6B7280').fontSize(8).font('Helvetica')
        .text('Color: green = high score  |  red = low score  |  gray = no response', MARGIN, y);
      y += 18;

      const CELL_H = 20;
      const NAME_W = 100;
      const cellW = Math.min(Math.floor((CONTENT_W - NAME_W) / activeInjects.length), 60);

      // Header row
      doc.rect(MARGIN, y, NAME_W, CELL_H).fill('#1F2937');
      activeInjects.forEach((inj, ci) => {
        doc.rect(MARGIN + NAME_W + ci * cellW, y, cellW, CELL_H).fill('#1F2937').stroke('#374151');
        doc.fill('#FFFFFF').fontSize(7).font('Helvetica-Bold')
          .text(`#${inj.injectNumber}`, MARGIN + NAME_W + ci * cellW + 2, y + 6, { width: cellW - 4, align: 'center' });
      });
      y += CELL_H;

      participants.forEach((p, ri) => {
        if (y > doc.page.height - 30) { doc.addPage(); y = MARGIN; }

        const bg = ri % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        doc.rect(MARGIN, y, NAME_W, CELL_H).fill(bg);
        doc.fill('#374151').fontSize(7).font('Helvetica')
          .text((p.name || 'Anon').slice(0, 15), MARGIN + 3, y + 6, { width: NAME_W - 6 });

        activeInjects.forEach((inj, ci) => {
          // Sum scores for this participant in this inject
          const injectScore = (p.responses || [])
            .filter(r => r.injectNumber === inj.injectNumber)
            .reduce((s, r) => s + (r.pointsEarned || 0), 0);

          const hasResponse = (p.responses || []).some(r => r.injectNumber === inj.injectNumber);

          // Max score for this inject
          const injectMax = inj.phases.reduce((s, ph) => {
            if (ph.questionType === 'single') return s + Math.max(...(ph.options?.map(o => o.points || 0) || [0]));
            if (ph.questionType === 'multiple') return s + (ph.options || []).reduce((x, o) => x + (o.points > 0 ? o.points : 0), 0);
            return s + (ph.maxPoints || 5);
          }, 0);

          const cellPct = injectMax > 0 ? injectScore / injectMax : 0;
          const cellColor = !hasResponse ? '#E5E7EB'
            : cellPct >= 0.75 ? '#6EE7B7'
            : cellPct >= 0.5 ? '#93C5FD'
            : cellPct >= 0.25 ? '#FCD34D'
            : '#FCA5A5';

          doc.rect(MARGIN + NAME_W + ci * cellW, y, cellW, CELL_H).fill(cellColor).stroke('#D1D5DB');

          if (hasResponse) {
            doc.fill('#111827').fontSize(7).font('Helvetica-Bold')
              .text(String(injectScore), MARGIN + NAME_W + ci * cellW, y + 6, { width: cellW, align: 'center' });
          }
        });

        y += CELL_H;
      });
    }

    doc.end();
  } catch (error) {
    console.error('Report generation error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to generate report' });
  }
};
