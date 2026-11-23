// The commands preview and build: the CV set on its pages, in the terminal or as a file.
// They combine the page plan of core/ with a look of classic/ or terminal/ and with pdf/, so
// they live here, where features meet.
import { z } from 'zod';
import { effect, multiline, outFile, read, tell } from '@honeyglass/adx';
import { render } from '../classic/docx.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { home, work } from '../core/home.ts';
import { checked } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { place } from '../core/place.ts';
import { cvChoices, profileChoices } from '../core/sources.ts';
import { toPdf } from '../pdf/convert.ts';
import { withCredits } from '../terminal/credits.ts';
import { renderTerminal } from '../terminal/docx.ts';
import { preview as drawn } from '../terminal/sheets.ts';
import * as issue from './issues.ts';

export const STYLES = ['classic', 'terminal'] as const;

const credits = z
  .boolean()
  .default(false)
  .describe('names oriko and its author on the right of the last page; terminal look only');

// The CV as the terminal look sets it, and its plan; the credits join the last page it fills.
async function planned(cv: string | undefined, profile: string | undefined, hasCredits: boolean) {
  const master = await checked(cv, profile);
  if (Array.isArray(master)) return master;
  const plan = place(master);
  if (Array.isArray(plan)) return plan;
  if (hasCredits === false) return { cv: master, plan };
  const credited = withCredits(master, plan.pages.length);
  const again = place(credited);
  return Array.isArray(again) ? again : { cv: credited, plan: again };
}

export const preview = read({
  does: 'draws the pages in the terminal',
  input: z.object({ cv, profile, credits }),
  values: { cv: cvChoices, profile: profileChoices },
  output: z.object({ preview: multiline().describe('the pages, 84 characters wide') }),
  run: async ({ cv, profile, credits }, { refuse }) => {
    const sheet = await planned(cv, profile, credits);
    return Array.isArray(sheet) ? refuse(...sheet) : { preview: drawn(sheet.cv, sheet.plan) };
  },
  text: out => out.preview,
  next: (_, { cv, profile }) => [build.step({ cv, profile })],
});

export const build = effect({
  does: 'writes the Word file, or its PDF through LibreOffice',
  input: z.object({
    cv,
    profile,
    out: outFile(work).describe(
      'the .docx or .pdf to write, inside the working directory; a .pdf needs LibreOffice',
    ),
    style: z
      .enum(STYLES)
      .default('classic')
      .describe('the look of the file: classic, or terminal like the preview'),
    credits,
  }),
  example: { out: 'cv.docx' },
  values: { cv: cvChoices, profile: profileChoices },
  // The file is derived: every build makes it again from the CV, so it is replaced without
  // --replace (adx decision 70). The command writes no kept file, so the one line covers it.
  replace: 'always',
  check: ({ out, style, credits }) => [
    ...(/\.(docx|pdf)$/.test(out.rel)
      ? []
      : [issue.wrongExtension.at('out', `The output ${out.rel} is no .docx or .pdf file`)]),
    ...(credits && style !== 'terminal' ? [issue.creditsNeedTerminal.at('credits')] : []),
  ],
  plan: async ({ cv, profile, out, style, credits }, { files, refuse }) => {
    const sheet = await planned(cv, profile, credits);
    if (Array.isArray(sheet)) return refuse(...sheet);
    const isPdf = out.rel.endsWith('.pdf');
    // Only the classic look shows the photo, so only it reads the photo file.
    const docx =
      style === 'terminal'
        ? await renderTerminal(sheet.cv, sheet.plan)
        : await render(
            sheet.cv,
            sheet.plan,
            await home.file(sheet.cv.person.photo).bytes(FILE_LIMITS.photoBytes),
            isPdf ? 'libreoffice' : 'google',
          );
    if (Array.isArray(docx)) return refuse(...docx);
    // A dry run sets the PDF too, as today, so it answers the bytes the real run writes.
    const file = isPdf ? await toPdf(docx) : docx;
    if (Array.isArray(file)) return refuse(...file);
    return { ...files.write(out, file), style, pages: sheet.plan.pages.length };
  },
  // A PDF is the finished file; only a .docx still goes through Google Docs.
  next: out =>
    out.file.endsWith('.docx')
      ? [
          tell(
            'upload the .docx to Google Docs, then choose File, Download, PDF; or build a .pdf with LibreOffice',
          ),
        ]
      : [],
});
