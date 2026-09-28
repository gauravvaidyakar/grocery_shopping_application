import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import { AsyncState, Status } from "../components/AsyncState";
import { PageHead } from "./DashboardPage";
interface Complaint {
  id: string;
  referenceNumber: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  messages: Array<{
    id: string;
    authorRole: string;
    message: string;
    createdAt: string;
  }>;
}
export function SupportPage() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ["complaints"],
    queryFn: () => api.get<Complaint[]>("/complaints/vendor/all"),
  });
  const reply = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/complaints/${id}/staff-messages`, { message }),
    onSuccess: (_, v) => {
      setDrafts((d) => ({ ...d, [v.id]: "" }));
      void qc.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
  return (
    <>
      <PageHead
        eyebrow="Customer care"
        title="Complaints"
        subtitle="Respond within the auditable complaint thread. Complaint status changes remain under administrator control."
      />
      <AsyncState
        loading={query.isLoading}
        error={query.error}
        empty={!query.data?.length}
        onRetry={() => void query.refetch()}
      >
        <div className="complaints">
          {query.data?.map((c) => (
            <article className="card" key={c.id}>
              <header>
                <div>
                  <small>
                    {c.referenceNumber} · {c.category}
                  </small>
                  <h2>{c.subject}</h2>
                </div>
                <Status value={c.status} />
              </header>
              <p>{c.description}</p>
              <div className="thread">
                {c.messages.map((m) => (
                  <div
                    className={m.authorRole === "VENDOR" ? "mine" : ""}
                    key={m.id}
                  >
                    <strong>{m.authorRole}</strong>
                    <p>{m.message}</p>
                    <small>
                      {new Date(m.createdAt).toLocaleString("en-IN")}
                    </small>
                  </div>
                ))}
              </div>
              <form
                className="reply"
                onSubmit={(e) => {
                  e.preventDefault();
                  const message = drafts[c.id]?.trim();
                  if (message) reply.mutate({ id: c.id, message });
                }}
              >
                <MessageCircle />
                <textarea
                  aria-label="Reply"
                  placeholder="Write a factual response…"
                  value={drafts[c.id] ?? ""}
                  onChange={(e) =>
                    setDrafts({ ...drafts, [c.id]: e.target.value })
                  }
                />
                <button className="primary">
                  <Send />
                  Send
                </button>
              </form>
            </article>
          ))}
        </div>
      </AsyncState>
    </>
  );
}
