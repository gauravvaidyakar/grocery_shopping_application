import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, FileUp, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { api, type VendorProfile } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { AsyncState, Status } from "../components/AsyncState";
import { Field } from "./AuthPages";
import { PageHead } from "./DashboardPage";

const requiredDocuments = [
  "PAN",
  "AADHAAR",
  "GST_CERTIFICATE",
  "FSSAI_LICENSE",
  "CANCELLED_CHEQUE",
  "BUSINESS_REGISTRATION_PROOF",
];
interface ProfileForm {
  legalName: string;
  panNumber: string;
  gstin: string;
  fssaiNumber: string;
  pickupPincode: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}
interface BankFormValue {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branchName: string;
}
interface ContactFormValue {
  businessEmail: string;
  businessMobile: string;
}

export function ProfilePage() {
  const { session } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<VendorProfile>("/vendor/profile"),
  });
  const [notice, setNotice] = useState("");
  const profile = query.data;
  const form = useForm<ProfileForm>({
    values: {
      legalName: profile?.legalName ?? "",
      panNumber: profile?.panNumber ?? "",
      gstin: profile?.gstin ?? "",
      fssaiNumber: profile?.fssaiNumber ?? "",
      pickupPincode: profile?.pickupPincode ?? "",
      line1: profile?.businessAddress.line1 ?? "",
      city: profile?.businessAddress.city ?? "",
      state: profile?.businessAddress.state ?? "",
      pincode: profile?.businessAddress.pincode ?? "",
    },
  });
  const update = useMutation({
    mutationFn: (value: ProfileForm) =>
      api.patch("/vendor/profile", {
        legalName: value.legalName,
        panNumber: value.panNumber,
        gstin: value.gstin,
        fssaiNumber: value.fssaiNumber,
        pickupPincode: value.pickupPincode,
        businessAddress: {
          line1: value.line1,
          city: value.city,
          state: value.state,
          pincode: value.pincode,
        },
      }),
    onSuccess: () => {
      setNotice("Business profile saved.");
      void client.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const upload = useMutation({
    mutationFn: ({ type, file }: { type: string; file: File }) => {
      const body = new FormData();
      body.append("type", type);
      body.append("file", file);
      return api.form("/vendor/kyc/documents", body);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ["profile"] }),
  });
  const submitKyc = async () => {
    try {
      await api.post("/vendor/kyc/submit");
      await client.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Submission failed");
    }
  };
  return (
    <>
      <PageHead
        eyebrow="Business verification"
        title="Profile, KYC & inspection"
        subtitle="Private documents use authenticated backend routes."
      />
      <AsyncState
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
      >
        {profile && (
          <div className="stack">
            <section
              className={`card verification-card${
                session?.user.mobileVerified ? " verification-card--verified" : ""
              }`}
            >
              {session?.user.mobileVerified ? <ShieldCheck /> : <AlertCircle />}
              <div>
                <strong>
                  {session?.user.mobileVerified
                    ? "WhatsApp mobile verified"
                    : "Mobile verification required"}
                </strong>
                <p>
                  {session?.user.mobileVerified
                    ? `Order and security updates can be delivered to ${session.user.mobile ?? profile.businessMobile}.`
                    : `Verify ${session?.user.mobile ?? profile.businessMobile ?? "your business mobile"} before relying on WhatsApp notifications.`}
                </p>
              </div>
              {!session?.user.mobileVerified && (
                <Link className="primary" to="/verify-mobile">
                  Verify now
                </Link>
              )}
            </section>
            <section className="card">
              <div className="section-title">
                <ShieldCheck />
                <div>
                  <small>VENDOR STATUS</small>
                  <h2>{profile.businessName}</h2>
                </div>
                <Status value={profile.status} />
              </div>
              {profile.suspensionDetails && (
                <p className="alert">{profile.suspensionDetails}</p>
              )}
              <form
                className="form-grid"
                onSubmit={(event) => void form.handleSubmit((value) => update.mutate(value))(event)}
              >
                {(
                  [
                    "legalName",
                    "panNumber",
                    "gstin",
                    "fssaiNumber",
                    "pickupPincode",
                    "line1",
                    "city",
                    "state",
                    "pincode",
                  ] as const
                ).map((name) => (
                  <Field key={name} label={name.replace(/([A-Z])/g, " $1")}>
                    <input
                      {...form.register(name)}
                      disabled={
                        profile.status === "APPROVED" ||
                        profile.status === "SUSPENDED"
                      }
                    />
                  </Field>
                ))}
                <div className="form-actions">
                  {notice && <span className="success">{notice}</span>}
                  <button
                    className="primary"
                    disabled={
                      update.isPending ||
                      profile.status === "APPROVED" ||
                      profile.status === "SUSPENDED"
                    }
                  >
                    Save profile
                  </button>
                </div>
              </form>
            </section>
            <ContactForm profile={profile} />
            <section className="card">
              <div className="section-title">
                <div>
                  <small>SECURE DOCUMENTS</small>
                  <h2>KYC checklist</h2>
                </div>
                <button
                  className="primary"
                  disabled={
                    profile.status !== "REGISTERED" &&
                    profile.status !== "REJECTED"
                  }
                  onClick={() => void submitKyc()}
                >
                  Submit KYC
                </button>
              </div>
              <div className="document-grid">
                {requiredDocuments.map((type) => {
                  const document = profile.documents.find(
                    (item) => item.type === type,
                  );
                  return (
                    <article key={type}>
                      <div>
                        <strong>{type.replaceAll("_", " ")}</strong>
                        <Status value={document?.status ?? "MISSING"} />
                      </div>
                      {document?.rejectionReason && (
                        <p className="form-error">{document.rejectionReason}</p>
                      )}
                      <div className="doc-actions">
                        {document && (
                          <button
                            className="secondary"
                            onClick={() =>
                              void api.download(
                                `/vendor-documents/${document.id}/download`,
                                document.originalName,
                              )
                            }
                          >
                            <Download />
                            Download
                          </button>
                        )}
                        <label className="secondary">
                          <FileUp />
                          {document ? "Re-upload" : "Upload"}
                          <input
                            hidden
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) upload.mutate({ type, file });
                            }}
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            <BankForm profile={profile} />
            <section className="card">
              <div className="section-title">
                <div>
                  <small>PHYSICAL VERIFICATION</small>
                  <h2>Inspection status</h2>
                </div>
              </div>
              {profile.inspections.length === 0 ? (
                <p className="muted">Inspection has not been scheduled yet.</p>
              ) : (
                profile.inspections.map((inspection) => (
                  <article className="inspection" key={inspection.id}>
                    <Status value={inspection.status} />
                    <strong>
                      {new Date(inspection.scheduledAt).toLocaleString("en-IN")}
                    </strong>
                    <span>{inspection.location}</span>
                    <p>
                      {inspection.remarks ?? "No remarks from the inspector."}
                    </p>
                    <div>
                      <span>
                        Documents {inspection.documentsVerified ? "✓" : "–"}
                      </span>
                      <span>
                        Premises {inspection.premisesVerified ? "✓" : "–"}
                      </span>
                      <span>
                        Quality {inspection.qualityVerified ? "✓" : "–"}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        )}
      </AsyncState>
    </>
  );
}

function ContactForm({ profile }: { profile: VendorProfile }) {
  const client = useQueryClient();
  const { session, updateUser } = useAuth();
  const [notice, setNotice] = useState("");
  const form = useForm<ContactFormValue>({
    values: {
      businessEmail: profile.businessEmail ?? "",
      businessMobile: profile.businessMobile ?? "",
    },
  });
  const save = useMutation({
    mutationFn: (value: ContactFormValue) =>
      api.patch("/vendor/contact", value),
    onSuccess: (_result, submitted) => {
      const changed =
        submitted.businessMobile.replace(/^\+91/, "") !==
        (profile.businessMobile ?? "").replace(/^\+91/, "");
      if (session) {
        updateUser({
          ...session.user,
          mobile: submitted.businessMobile,
          mobileVerified: changed ? false : session.user.mobileVerified,
        });
      }
      setNotice(
        changed
          ? "WhatsApp contact saved. Verify the new number before notifications can be trusted."
          : "WhatsApp contact saved.",
      );
      void client.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  return (
    <section className="card">
      <div className="section-title">
        <div>
          <small>ORDER NOTIFICATIONS</small>
          <h2>WhatsApp contact</h2>
        </div>
      </div>
      <p className="muted">
        Order, payment, cancellation, return and shipment updates use this
        mobile number.
      </p>
      <form
        className="form-grid"
        onSubmit={(event) =>
          void form.handleSubmit((value) => save.mutate(value))(event)
        }
      >
        <Field label="Business email">
          <input type="email" autoComplete="email" {...form.register("businessEmail")} />
        </Field>
        <Field label="WhatsApp mobile">
          <input
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit Indian mobile number"
            {...form.register("businessMobile", {
              required: true,
              pattern: /^[6-9]\d{9}$/,
            })}
          />
        </Field>
        <div className="form-actions">
          {notice && <span className="success">{notice}</span>}
          {save.isError && (
            <span className="form-error">
              {save.error instanceof Error ? save.error.message : "Contact could not be saved"}
            </span>
          )}
          <button className="primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save notification contact"}
          </button>
        </div>
      </form>
    </section>
  );
}

function BankForm({ profile }: { profile: VendorProfile }) {
  const client = useQueryClient();
  const form = useForm<BankFormValue>({
    defaultValues: {
      accountHolderName: "",
      accountNumber: "",
      ifsc: "",
      bankName: "",
      branchName: "",
    },
  });
  const save = useMutation({
    mutationFn: (value: BankFormValue) =>
      api.post("/vendor/bank-account", value),
    onSuccess: () => {
      form.reset();
      void client.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const current = profile.bankAccounts[0];
  return (
    <section className="card">
      <div className="section-title">
        <div>
          <small>SETTLEMENT ACCOUNT</small>
          <h2>Bank details</h2>
        </div>
        {current && <Status value={current.status} />}
      </div>
      {current && (
        <p className="muted">
          {current.bankName} •••• {current.accountNumberLast4}
        </p>
      )}
      <form
        className="form-grid"
        onSubmit={(event) => void form.handleSubmit((value) => save.mutate(value))(event)}
      >
        {(
          [
            "accountHolderName",
            "accountNumber",
            "ifsc",
            "bankName",
            "branchName",
          ] as const
        ).map((name) => (
          <Field key={name} label={name.replace(/([A-Z])/g, " $1")}>
            <input
              {...form.register(name, { required: name !== "branchName" })}
            />
          </Field>
        ))}
        <div className="form-actions">
          <button className="primary" disabled={save.isPending}>
            Save bank account
          </button>
        </div>
      </form>
    </section>
  );
}
