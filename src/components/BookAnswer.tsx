import { ENTRY_BY_ID } from "../lib/kb";
import { Feedback, ListenButton, Sources, type Rating } from "./AnswerParts";
import { BookIcon } from "./icons";

export const NOT_FOUND_KM = "រកមិនឃើញចម្លើយក្នុងសៀវភៅទេ។ សូមសួរម្ដងទៀតដោយពាក្យផ្សេង។";
const NOT_SURE_KM = "មិនច្បាស់ថាចម្លើយណាត្រូវនឹងសំណួររបស់អ្នកទេ។ តើអ្នកចង់សួរមួយក្នុងចំណោមទាំងនេះឬ?";

// An answer found in the book on the phone, shown when the AI is off.
export function BookAnswer({
  id,
  best,
  related,
  aiFailed,
  rated,
  onShow,
  onRate,
}: {
  id: string; // this message, so only its own Listen button shows Stop
  best: number | null;
  related: number[];
  aiFailed?: boolean;
  rated?: Rating;
  onShow: (id: number) => void;
  onRate: (r: Rating) => void;
}) {
  const entry = best === null ? null : ENTRY_BY_ID.get(best);

  return (
    <article className="max-w-[92%] self-start rounded-2xl rounded-tl-sm border border-line bg-surface p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-brand">
        <BookIcon size={15} />
        <span className="km">ចម្លើយពីសៀវភៅ</span> · From the book
      </p>
      {aiFailed && (
        <p className="mb-2 text-[14px] text-muted">
          <span className="km">AI មិនដំណើរការទេ ដូច្នេះនេះជាចម្លើយពីសៀវភៅ។</span> The AI couldn't answer, so here is the book's answer.
        </p>
      )}

      {entry ? (
        <>
          <h3 className="km text-[15px] font-semibold">{entry.q_km}</h3>
          <p className="mb-2 text-[14px] text-muted">{entry.q_en}</p>
          <ListenButton id={id} text={`${entry.q_km} ${entry.a_km}`} className="mb-2" />
          <p className="km text-[16px]">{entry.a_km}</p>
          <p className="mt-2 border-t border-line pt-2 text-[15px] text-muted">{entry.a_en}</p>
          <Sources ids={[entry.id]} />
          <Feedback rated={rated} onRate={onRate} />
        </>
      ) : related.length > 0 ? (
        // A weak match: let the farmer pick rather than show an answer to a different question.
        <>
          <ListenButton id={id} text={NOT_SURE_KM} className="mb-2" />
          <p className="km text-[15px]">{NOT_SURE_KM}</p>
          <p className="mt-1 text-[15px] text-muted">Not sure which answer fits your question. Is it one of these?</p>
        </>
      ) : (
        <>
          <ListenButton id={id} text={NOT_FOUND_KM} className="mb-2" />
          <p className="km text-[15px]">រកមិនឃើញចម្លើយក្នុងសៀវភៅទេ។ សូមសួរម្ដងទៀតដោយពាក្យផ្សេង ឬរកក្នុងមគ្គុទ្ទេសក៍។</p>
          <p className="mt-1 text-[15px] text-muted">No answer found in the book. Try other words, or look in the Guide.</p>
        </>
      )}

      {related.length > 0 && (
        <div className="mt-4">
          {entry && (
            <p className="mb-1.5 text-[14px] font-semibold text-muted">
              <span className="km">សំណួរពាក់ព័ន្ធ</span> · Related
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {related.map((id) => {
              const r = ENTRY_BY_ID.get(id)!;
              return (
                <button
                  key={id}
                  onClick={() => onShow(id)}
                  className="rounded-lg border border-line px-3 py-2 text-left active:bg-brand-soft"
                >
                  <span className="km block text-[15px]">{r.q_km}</span>
                  <span className="block text-[14px] text-muted">{r.q_en}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
